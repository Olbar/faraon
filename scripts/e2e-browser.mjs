const CDP_HTTP = "http://127.0.0.1:9222";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTarget() {
  const targets = await (await fetch(`${CDP_HTTP}/json`)).json();
  return targets.find((target) => target.type === "page");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (pending) {
          this.pending.delete(message.id);
          if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
          else pending.resolve(message.result);
        }
      } else this.events.push(message);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const cdp = new Cdp(ws);
await cdp.send("Page.enable");
await cdp.send("Runtime.enable");
await cdp.send("Log.enable");

async function evaluate(expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.text +
        "\n" +
        (result.exceptionDetails.exception?.description ?? ""),
    );
  }
  return result.result.value;
}

async function key(type, code, keyValue, vk) {
  await cdp.send("Input.dispatchKeyEvent", {
    type,
    code,
    key: keyValue,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk,
  });
}

async function tapKey(code, keyValue, vk, hold = 60) {
  await key("keyDown", code, keyValue, vk);
  await sleep(hold);
  await key("keyUp", code, keyValue, vk);
}

async function startFreshGame() {
  await cdp.send("Page.navigate", { url: "http://127.0.0.1:4173/?debug=1" });
  await sleep(1400);
  await evaluate("localStorage.clear(); location.reload();");
  await sleep(1800);
  await evaluate("document.querySelector('#menu-new').click()");
  await sleep(250);
  await evaluate(
    "document.querySelector('[data-difficulty=\"seeker\"]').click(); document.querySelector('#start-new-game').click();",
  );
  await sleep(450);
  await evaluate("document.querySelector('[data-close=\"tutorial-screen\"]')?.click();");
  await sleep(350);
}

await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
await startFreshGame();

const start = await evaluate(`(() => {
  const p = window.__pyramid.state.player;
  return { x: p.x, y: p.y, room: window.__pyramid.state.game.currentRoom };
})()`);
console.log("start", start);

await key("keyDown", "ArrowRight", "ArrowRight", 39);
await sleep(500);
await key("keyUp", "ArrowRight", "ArrowRight", 39);
await sleep(80);
const moved = await evaluate(`(() => {
  const p = window.__pyramid.state.player;
  return { x: p.x, y: p.y, moving: p.isMovingRight() };
})()`);
console.log("moved", moved);
if (moved.x <= start.x + 40) throw new Error("Клавиатурное движение не сработало");

await tapKey("Space", " ", 32, 90);
await sleep(260);
const jump = await evaluate(`(() => {
  const p = window.__pyramid.state.player;
  return { y: p.y, jumpsUsed: p.jumpsUsed, jumping: p.isJumping() };
})()`);
console.log("jump", jump);
if (jump.jumpsUsed < 1) throw new Error("Прыжок не сработал");

await sleep(1800);
await tapKey("Space", " ", 32, 90);
await sleep(80);
await tapKey("Space", " ", 32, 90);
await sleep(240);
const doubleJump = await evaluate(`(() => {
  const p = window.__pyramid.state.player;
  return { y: p.y, jumpsUsed: p.jumpsUsed, jumping: p.isJumping() };
})()`);
console.log("double jump", doubleJump);
if (doubleJump.jumpsUsed < 2) throw new Error("Двойной прыжок не сработал");

await evaluate(`(() => {
  const app = window.__pyramid;
  const p = app.state.player;
  p.x = 1130;
  p.y = 596;
  p.vx = 0;
  p.vy = 0;
  p.onGround = true;
  return { x: p.x, room: app.state.game.currentRoom };
})()`);
await sleep(60);
await tapKey("ArrowUp", "ArrowUp", 38, 80);
await sleep(300);
const afterDoor = await evaluate(`(() => {
  const app = window.__pyramid;
  return {
    room: app.state.game.currentRoom,
    hud: document.querySelector('#hud-room-number').textContent,
    playerX: app.state.player.x,
    visited: app.state.game.visitedCount(),
  };
})()`);
console.log("after door", afterDoor);
if (afterDoor.room !== 2) throw new Error("Переход в следующую комнату не сработал");

await tapKey("KeyM", "m", 77, 60);
await sleep(250);
const mapOpen = await evaluate(
  "document.querySelector('#map-screen').classList.contains('is-open')",
);
console.log("map open", mapOpen);
if (!mapOpen) throw new Error("Карта не открылась");
await evaluate(
  "document.querySelector('[data-room-id=\"1\"]').click(); document.querySelector('.map-travel').click();",
);
await sleep(350);
const afterTravel = await evaluate(`(() => {
  const app = window.__pyramid;
  return {
    room: app.state.game.currentRoom,
    mapOpen: document.querySelector('#map-screen').classList.contains('is-open'),
    hud: document.querySelector('#hud-room-number').textContent,
  };
})()`);
console.log("after travel", afterTravel);
if (afterTravel.room !== 1 || afterTravel.mapOpen) {
  throw new Error("Возврат по карте не сработал");
}

const beforeReload = await evaluate(`(() => {
  const app = window.__pyramid;
  const g = app.state.game;
  const item = g.room.items.find((entry) => entry.type !== 'key');
  g.collectItem(item.id);
  g.save();
  return { room: g.currentRoom, secrets: g.collectedCount(), item: item.id };
})()`);
console.log("before reload", beforeReload);
await cdp.send("Page.reload", { ignoreCache: true });
await sleep(1800);
const menuMeta = await evaluate(`(() => ({
  continueDisabled: document.querySelector('#menu-continue').disabled,
  meta: document.querySelector('#menu-continue-meta').textContent,
}))()`);
console.log("menu after reload", menuMeta);
if (menuMeta.continueDisabled) throw new Error("Сохранение не найдено после перезагрузки");
await evaluate("document.querySelector('#menu-continue').click()");
await sleep(500);
const afterReload = await evaluate(`(() => {
  const app = window.__pyramid;
  return {
    room: app.state.game.currentRoom,
    secrets: app.state.game.collectedCount(),
    hasItem: app.state.game.inventoryHas(${JSON.stringify(beforeReload.item)}),
    tutorialOpen: document.querySelector('#tutorial-screen').classList.contains('is-open'),
  };
})()`);
console.log("after reload", afterReload);
if (afterReload.secrets !== beforeReload.secrets || !afterReload.hasItem) {
  throw new Error("Инвентарь не восстановился");
}

await cdp.send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
await sleep(300);
await cdp.send("Page.reload", { ignoreCache: true });
await sleep(1600);
await evaluate("localStorage.clear(); location.reload();");
await sleep(1700);
await evaluate("document.querySelector('#menu-new').click()");
await sleep(250);
await evaluate(
  "document.querySelector('[data-difficulty=\"seeker\"]').click(); document.querySelector('#start-new-game').click();",
);
await sleep(450);
await evaluate("document.querySelector('[data-close=\"tutorial-screen\"]')?.click();");
await sleep(350);

const rects = await evaluate(`(() => {
  const get = (selector) => {
    const r = document.querySelector(selector).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  };
  const p = window.__pyramid.state.player;
  return {
    right: get('[data-control="right"]'),
    jump: get('[data-control="jump"]'),
    playerX: p.x,
    playerY: p.y,
    display: getComputedStyle(document.querySelector('#touch-controls')).display,
  };
})()`);
console.log("touch rects", rects);

await cdp.send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    { x: rects.right.x, y: rects.right.y, id: 1, radiusX: 4, radiusY: 4, force: 1 },
    { x: rects.jump.x, y: rects.jump.y, id: 2, radiusX: 4, radiusY: 4, force: 1 },
  ],
});
await sleep(380);
const touchMove = await evaluate(`(() => {
  const p = window.__pyramid.state.player;
  return { x: p.x, y: p.y, jumpsUsed: p.jumpsUsed, right: p.isMovingRight() };
})()`);
console.log("touch simultaneous", touchMove);
if (touchMove.x <= rects.playerX + 20) throw new Error("Сенсорное движение не сработало");
if (touchMove.jumpsUsed < 1) throw new Error("Сенсорный прыжок не сработал");
await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await sleep(200);
const touchReleased = await evaluate(`(() => {
  const p = window.__pyramid.state.player;
  return { x: p.x, vx: p.vx, moving: p.isMovingRight() };
})()`);
console.log("touch released", touchReleased);
if (touchReleased.moving) throw new Error("Движение не остановилось");

const pageChecks = await evaluate(`(() => {
  const touch = document.querySelector('#touch-controls').getBoundingClientRect();
  const stage = document.querySelector('.stage-frame').getBoundingClientRect();
  return {
    scroll: [document.body.scrollWidth, document.body.scrollHeight],
    viewport: [innerWidth, innerHeight],
    touchTop: Math.round(touch.top),
    stageBottom: Math.round(stage.bottom),
    overlaps: touch.top < stage.bottom,
  };
})()`);
console.log("touch layout", pageChecks);
if (pageChecks.overlaps) throw new Error("Сенсорные кнопки перекрывают сцену в портрете");

const exceptions = cdp.events.filter((event) => event.method === "Runtime.exceptionThrown");
const errors = cdp.events.filter(
  (event) =>
    event.method === "Log.entryAdded" &&
    ["error", "warning"].includes(event.params.entry.level),
);
console.log("exceptions", JSON.stringify(exceptions.map((event) => event.params.exceptionDetails.text)));
console.log("errors", JSON.stringify(errors.map((event) => event.params.entry.text)));
if (exceptions.length > 0) throw new Error("В браузере были исключения");
ws.close();
console.log("E2E OK");
