const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find((entry) => entry.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(
      result.exceptionDetails.text +
        " " +
        (result.exceptionDetails.exception?.description ?? ""),
    );
  }
  return result.result.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const key = async (type, code, value, vk) =>
  send("Input.dispatchKeyEvent", {
    type,
    code,
    key: value,
    windowsVirtualKeyCode: vk,
    nativeVirtualKeyCode: vk,
  });

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "http://127.0.0.1:4173/?debug=1" });
await sleep(1500);
await evaluate("localStorage.clear(); location.reload();");
await sleep(1700);
await evaluate("document.querySelector('#menu-new').click()");
await sleep(220);
await evaluate(
  "document.querySelector('[data-difficulty=\"seeker\"]').click(); document.querySelector('#start-new-game').click();",
);
await sleep(450);
await evaluate("document.querySelector('[data-close=\"tutorial-screen\"]')?.click();");
await sleep(300);

const plates = await evaluate(
  "window.__pyramid.state.game.room.puzzle.plates.map((plate) => ({ x: plate.x, y: plate.y, w: plate.w, h: plate.h, index: plate.index }))",
);
const puzzle = [];
for (const plate of plates) {
  await evaluate(`(() => {
    const app = window.__pyramid;
    const p = app.state.player;
    p.x = ${plate.x} + ${plate.w} / 2 - p.width / 2;
    p.y = ${plate.y} - p.height + 4;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
  })()`);
  await sleep(180);
  puzzle.push(plate.index);
}
await sleep(250);
const puzzleAfter = await evaluate(`(() => {
  const app = window.__pyramid;
  const g = app.state.game;
  return {
    solved: g.isPuzzleSolved(1),
    plates: g.puzzleProgress(1),
    hiddenAvailable: g.room.items.some((item) => item.hidden && g.roomHasItem(item.id)),
  };
})()`);
console.log("puzzle", puzzle, puzzleAfter);
if (!puzzleAfter.solved || !puzzleAfter.hiddenAvailable) {
  throw new Error("Загадка или скрытый тайник не сработали");
}

let collected = 0;
const items = await evaluate("window.__pyramid.state.game.room.items.map((item) => ({id:item.id,x:item.x,y:item.y,type:item.type,hidden:item.hidden}))");
for (const item of items) {
  await evaluate(`(() => {
    const app = window.__pyramid;
    const p = app.state.player;
    p.x = ${item.x} - p.width / 2;
    p.y = ${item.y} - p.height / 2;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
  })()`);
  await sleep(130);
  const has = await evaluate(`window.__pyramid.state.game.inventoryHas(${JSON.stringify(item.id)})`);
  if (has) collected += 1;
}
await sleep(250);
const room1 = await evaluate(`(() => {
  const app = window.__pyramid;
  const g = app.state.game;
  return {
    collected: g.collectedCount(),
    status: g.roomStatus(1),
    keys: g.keysFound(),
    hudSecrets: document.querySelector('#hud-secrets').textContent,
    toasts: [...document.querySelectorAll('.toast')].map((node) => node.textContent),
  };
})()`);
console.log("room1", room1, "physical collected", collected);
if (room1.status !== "complete" || room1.collected < 6) {
  throw new Error("Сбор предметов через сцену не сработал");
}

await evaluate(`(() => {
  const app = window.__pyramid;
  const g = app.state.game;
  const p = app.state.player;
  g.setHealth(1);
  p.health = 1;
  p.invulnerable = 0;
  const hazard = g.room.hazards[0];
  p.x = hazard.x + hazard.w / 2;
  p.y = 630;
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
})()`);
await sleep(400);
const defeat = await evaluate(`(() => ({
  open: document.querySelector('#defeat-screen').classList.contains('is-open'),
  health: window.__pyramid.state.game.health,
  secrets: window.__pyramid.state.game.collectedCount(),
}))()`);
console.log("defeat", defeat);
if (!defeat.open) throw new Error("Экран поражения не открылся");
await evaluate("document.querySelector('#defeat-continue').click();");
await sleep(350);
const revived = await evaluate(`(() => {
  const app = window.__pyramid;
  return {
    open: document.querySelector('#defeat-screen').classList.contains('is-open'),
    room: app.state.game.currentRoom,
    health: app.state.game.health,
    maxHealth: app.state.game.maxHealth,
    secrets: app.state.game.collectedCount(),
    items: app.state.game.inventoryCount('room-1-key'),
  };
})()`);
console.log("revived", revived);
if (revived.open || revived.secrets !== room1.collected || revived.health !== revived.maxHealth) {
  throw new Error("Возрождение потеряло прогресс");
}

await evaluate(`
  (() => {
    const app = window.__pyramid;
    const g = app.state.game;
    for (let id = 1; id <= 20; id += 1) {
      g.enterRoom(id, { silent: true });
      for (const [index] of g.room.puzzle.plates.entries()) g.touchPuzzlePlate(id, index);
      for (const item of g.room.items) g.collectItem(item.id);
    }
    g.enterRoom(20, { silent: true });
    app.prepareRoomEntry({ returning: false });
    const p = app.state.player;
    p.x = 1130;
    p.y = 596;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
  })()
`);
await sleep(250);
await key("keyDown", "ArrowUp", "ArrowUp", 38);
await sleep(80);
await key("keyUp", "ArrowUp", "ArrowUp", 38);
await sleep(700);
const victory = await evaluate(`(() => ({
  open: document.querySelector('#victory-screen').classList.contains('is-open'),
  perfectHidden: document.querySelector('#victory-perfect').hidden,
  subtitle: document.querySelector('#victory-subtitle').textContent,
  secrets: document.querySelector('#victory-secrets').textContent,
}))()`);
console.log("victory", victory);
if (!victory.open) throw new Error("Финальные врата не открыли победу");

const errors = await evaluate(`(() => {
  const text = document.body.innerText;
  return { latin: /[A-Za-z]/.test(text), length: text.length };
})()`);
console.log("visible text", errors);
if (errors.latin) throw new Error("В видимом тексте есть латинские буквы");
ws.close();
console.log("MECHANICS OK");
