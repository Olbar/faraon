import {
  ACHIEVEMENTS,
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  ROOM_BY_ID,
  ROOMS,
  TOTAL_KEYS,
  TOTAL_ROOMS,
  TOTAL_SECRETS,
} from "./content.js";
import {
  clearSavedGame,
  createGame,
  getSaveMetadata,
  hasSavedGame,
  loadGame,
} from "./game.js";
import { createPlayer, PLAYER_PHYSICS } from "./player.js";
import { GameRenderer } from "./renderer.js";
import {
  APP_TEXT,
  DYNAMIC_TEXT,
  TUTORIAL_STEPS,
  UI_TEXT,
  wordForKeys,
  wordForRooms,
  wordForSecrets,
} from "./texts.js";
import {
  bindTouchButtons,
  CompositeControls,
  KeyboardControls,
  TouchControls,
} from "./touch-controls.js";

const SETTINGS_KEY = "curse-of-the-pyramid-settings";
const DEFAULT_SETTINGS = {
  sound: true,
  vibration: true,
  tutorial: true,
};

const MAP_POSITIONS = [
  { x: 100, y: 80 },
  { x: 300, y: 80 },
  { x: 500, y: 80 },
  { x: 700, y: 80 },
  { x: 900, y: 80 },
  { x: 900, y: 220 },
  { x: 700, y: 220 },
  { x: 500, y: 220 },
  { x: 300, y: 220 },
  { x: 100, y: 220 },
  { x: 100, y: 360 },
  { x: 300, y: 360 },
  { x: 500, y: 360 },
  { x: 700, y: 360 },
  { x: 900, y: 360 },
  { x: 900, y: 500 },
  { x: 700, y: 500 },
  { x: 500, y: 500 },
  { x: 300, y: 500 },
  { x: 100, y: 500 },
];

const GATE_POSITION = { x: 250, y: 638 };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function create(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createKeyIcon(className = "") {
  const element = create("span", `key-glyph${className ? ` ${className}` : ""}`);
  element.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11.5 12H21m-3 0v4m-3-4v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  return element;
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function loadSettings() {
  try {
    const raw = globalThis.localStorage?.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      sound: parsed.sound !== false,
      vibration: parsed.vibration !== false,
      tutorial: parsed.tutorial !== false,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persistSettings(settings) {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Настройки останутся в памяти текущей сессии.
  }
}

class SoundManager {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.unlocked = false;
  }

  unlock() {
    this.unlocked = true;
    return this.ensure();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  ensure() {
    if (!this.enabled || !this.unlocked) return null;
    try {
      if (
        globalThis.navigator?.userActivation &&
        !globalThis.navigator.userActivation.hasBeenActive
      ) {
        return null;
      }
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === "suspended") {
        this.context.resume().catch(() => {});
      }
      return this.context;
    } catch {
      return null;
    }
  }

  tone({ frequency, endFrequency, duration = 0.12, type = "sine", volume = 0.04, delay = 0 }) {
    const context = this.ensure();
    if (!context) return;
    try {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.03);
    } catch {
      // Звук не критичен для игры.
    }
  }

  play(name) {
    if (!this.enabled) return;
    switch (name) {
      case "click":
        this.tone({ frequency: 520, endFrequency: 620, duration: 0.06, volume: 0.025 });
        break;
      case "jump":
        this.tone({ frequency: 330, endFrequency: 610, duration: 0.13, type: "triangle", volume: 0.035 });
        break;
      case "double-jump":
        this.tone({ frequency: 520, endFrequency: 860, duration: 0.15, type: "triangle", volume: 0.03 });
        break;
      case "item":
        this.tone({ frequency: 760, endFrequency: 1040, duration: 0.12, volume: 0.035 });
        this.tone({ frequency: 1160, duration: 0.14, volume: 0.025, delay: 0.07 });
        break;
      case "key":
        this.tone({ frequency: 520, duration: 0.14, type: "triangle", volume: 0.04 });
        this.tone({ frequency: 780, duration: 0.16, volume: 0.035, delay: 0.08 });
        this.tone({ frequency: 1040, duration: 0.2, volume: 0.03, delay: 0.16 });
        break;
      case "secret":
        this.tone({ frequency: 880, endFrequency: 1320, duration: 0.18, volume: 0.03 });
        break;
      case "puzzle":
        this.tone({ frequency: 440, endFrequency: 660, duration: 0.18, type: "triangle", volume: 0.035 });
        this.tone({ frequency: 990, duration: 0.16, volume: 0.025, delay: 0.12 });
        break;
      case "puzzle-solved":
        this.tone({ frequency: 523, duration: 0.16, type: "triangle", volume: 0.04 });
        this.tone({ frequency: 659, duration: 0.16, type: "triangle", volume: 0.04, delay: 0.1 });
        this.tone({ frequency: 784, duration: 0.22, type: "triangle", volume: 0.04, delay: 0.2 });
        break;
      case "damage":
        this.tone({ frequency: 180, endFrequency: 70, duration: 0.25, type: "sawtooth", volume: 0.045 });
        break;
      case "door":
        this.tone({ frequency: 240, endFrequency: 160, duration: 0.24, type: "sine", volume: 0.03 });
        break;
      case "achievement":
        this.tone({ frequency: 660, duration: 0.16, volume: 0.03 });
        this.tone({ frequency: 880, duration: 0.18, volume: 0.03, delay: 0.1 });
        this.tone({ frequency: 1320, duration: 0.24, volume: 0.025, delay: 0.2 });
        break;
      case "victory":
        [392, 523, 659, 784, 1046].forEach((frequency, index) => {
          this.tone({
            frequency,
            duration: 0.5,
            type: "triangle",
            volume: 0.035,
            delay: index * 0.14,
          });
        });
        break;
      case "defeat":
        [220, 196, 164, 130].forEach((frequency, index) => {
          this.tone({
            frequency,
            endFrequency: frequency * 0.82,
            duration: 0.42,
            type: "sine",
            volume: 0.035,
            delay: index * 0.18,
          });
        });
        break;
      default:
        break;
    }
  }
}

const state = {
  renderer: null,
  game: null,
  player: null,
  previewGame: null,
  previewPlayer: null,
  mode: "menu",
  screenStack: [],
  selectedDifficulty: "seeker",
  mapSelected: null,
  tutorialIndex: 0,
  tutorialCallback: null,
  confirmAction: null,
  settings: loadSettings(),
  sound: new SoundManager(),
  keyboard: new KeyboardControls(),
  touch: new TouchControls(),
  controls: null,
  hudSignature: "",
  lastFrame: 0,
  roomBannerTimer: 0,
  autosaveTimer: 0,
  toastTimers: new Set(),
  achievementQueue: [],
  achievementShowing: false,
  achievementTimer: 0,
  hidden: false,
  interactPrev: false,
  lastTouchInteractAt: 0,
  nearDoor: null,
  endingOpen: false,
};

state.controls = new CompositeControls(state.keyboard, state.touch);
state.sound.setEnabled(state.settings.sound);

/* Экраны и меню */

function updateMenu() {
  const meta = getSaveMetadata();
  const continueButton = $("#menu-continue");
  const continueMeta = $("#menu-continue-meta");
  continueButton.disabled = !meta;

  if (meta) {
    const difficulty = DIFFICULTY_BY_ID.get(meta.difficulty)?.name ?? "";
    continueMeta.textContent = APP_TEXT.menuContinueMeta(
      difficulty,
      meta.currentRoom,
      meta.secrets,
    );
    continueButton.querySelector(".button-label").textContent = UI_TEXT.continueGame;
  } else {
    continueMeta.textContent = UI_TEXT.noSave;
    continueButton.querySelector(".button-label").textContent = UI_TEXT.continueGame;
  }

  const warning = $("#new-game-warning");
  if (warning) warning.hidden = !hasSavedGame();
}

function showMenu() {
  if (state.game) state.game.save();
  state.mode = "menu";
  state.game = null;
  state.player = null;
  state.endingOpen = false;
  closeAllScreens(true);
  $("#menu-screen").classList.add("is-open");
  document.body.classList.remove("is-playing");
  document.body.classList.add("is-menu");
  state.screenStack = [];
  updateMenu();
  hideInteractionPrompt();
  state.lastFrame = performance.now();
}

function hideMenu() {
  $("#menu-screen").classList.remove("is-open");
  document.body.classList.remove("is-menu");
}

function openDifficulty() {
  const meta = getSaveMetadata();
  state.selectedDifficulty = meta?.difficulty ?? state.selectedDifficulty;
  buildDifficultyCards();
  updateMenu();
  openScreen("difficulty-screen");
}

function buildDifficultyCards() {
  const grid = $("#difficulty-grid");
  grid.replaceChildren();

  for (const difficulty of DIFFICULTIES) {
    const card = create("button", "difficulty-card");
    card.type = "button";
    card.dataset.difficulty = difficulty.id;
    card.classList.toggle("is-selected", difficulty.id === state.selectedDifficulty);
    card.setAttribute("aria-pressed", String(difficulty.id === state.selectedDifficulty));

    const level = create("span", "difficulty-level");
    for (let index = 0; index < 4; index += 1) {
      const pip = create("i");
      if (index < difficulty.level) pip.style.background = difficulty.accent;
      level.append(pip);
    }

    const name = create("strong", "difficulty-name", difficulty.name);
    const epithet = create("span", "difficulty-epithet", difficulty.epithet);
    const description = create("p", "difficulty-description", difficulty.description);
    const health = create("span", "difficulty-health");
    health.append(create("span", "", ""), create("span", ""));
    const hearts = health.firstElementChild;
    for (let index = 0; index < difficulty.maxHealth; index += 1) {
      const heart = create("i");
      heart.style.background = difficulty.accent;
      hearts.append(heart);
    }
    health.lastElementChild.textContent = `Здоровье: ${difficulty.maxHealth}`;

    card.append(level, name, epithet, description, health);
    card.addEventListener("click", () => {
      state.selectedDifficulty = difficulty.id;
      buildDifficultyCards();
      state.sound.play("click");
    });
    grid.append(card);
  }
}

function startNewGame() {
  const begin = () => {
    clearSavedGame();
    const game = createGame({ difficulty: state.selectedDifficulty });
    game.enterRoom(1, { silent: true });
    game.heal(game.maxHealth);
    game.save();
    startSession(game);
    if (state.settings.tutorial) {
      openTutorial();
    }
    state.sound.play("door");
    toast(
      APP_TEXT.newGameStarted(DIFFICULTY_BY_ID.get(state.selectedDifficulty).name),
      "key",
    );
  };

  if (hasSavedGame()) {
    openConfirm({
      title: APP_TEXT.confirmNewTitle(),
      text: APP_TEXT.confirmNewText(),
      acceptText: APP_TEXT.confirmNewAccept(),
      onAccept: begin,
    });
  } else {
    begin();
  }
}

function continueGame() {
  const game = loadGame();
  if (!game) {
    updateMenu();
    toast(UI_TEXT.noSave, "warning");
    return;
  }
  state.sound.ensure();
  startSession(game);
  if (game.finished && game.canFinish()) {
    showVictory(game.finishGame());
  } else {
    toast(APP_TEXT.continueLoaded(), "secret");
  }
}

/* Сессия и комнаты */

function startSession(game) {
  closeAllScreens(true);
  state.mode = "playing";
  state.game = game;
  state.endingOpen = false;
  hideMenu();
  document.body.classList.add("is-playing");
  document.body.classList.remove("is-menu");

  game.health = game.maxHealth;
  game.evaluateAchievements({ silent: true });
  game.autosave();

  const room = game.room;
  state.player = createPlayer({
    difficulty: game.difficultyData,
    x: room.start.x,
    y: room.start.y,
    health: game.health,
  });
  state.player.animationTime = 0;

  state.screenStack = [];
  refreshHud();
  showRoomBanner(
    APP_TEXT.roomBannerKicker(room.ordinal),
    room.name,
    room.subtitle,
  );
  hideInteractionPrompt();
  state.lastFrame = performance.now();
}

function prepareRoomEntry(options = {}) {
  const { game } = state;
  if (!game) return;
  const room = game.room;
  game.health = game.maxHealth;
  game.autosave();
  state.player = createPlayer({
    difficulty: game.difficultyData,
    x: room.start.x,
    y: room.start.y,
    health: game.health,
  });
  state.player.animationTime = 0;
  state.touch.releaseAll();
  state.keyboard.releaseAll();
  state.interactPrev = false;
  hideInteractionPrompt();
  refreshHud();
  enqueueAchievements(game.evaluateAchievements({ silent: true }));
  showRoomBanner(
    options.returning
      ? APP_TEXT.roomBannerReturn()
      : APP_TEXT.roomBannerKicker(room.ordinal),
    room.name,
    room.subtitle,
  );
  flashAutosave();
}

function goToRoom(roomId) {
  if (!state.game) return false;
  const room = ROOM_BY_ID.get(roomId);
  if (!room) return false;
  state.game.enterRoom(roomId, { silent: true });
  prepareRoomEntry({ returning: false });
  state.renderer.setFlash(0.12, "249,226,164");
  state.sound.play("door");
  return true;
}

function travelFromMap(roomId) {
  if (!state.game) return;
  if (roomId === state.game.currentRoom) {
    toast(DYNAMIC_TEXT.currentRoomTravel(), "warning");
    return;
  }
  if (!state.game.travelTo(roomId)) {
    toast(DYNAMIC_TEXT.travelBlocked(), "warning");
    return;
  }
  closeAllScreens(true);
  state.mode = "playing";
  prepareRoomEntry({ returning: true });
  state.renderer.setFlash(0.18, "121,201,184");
  state.sound.play("door");
  toast(APP_TEXT.roomTravelToast(ROOM_BY_ID.get(roomId).name), "secret");
}

/* Игровой цикл */

function isPaused() {
  return state.hidden || state.screenStack.length > 0 || document.hidden;
}

function loop(now) {
  const delta = clamp((now - state.lastFrame) / 1000, 0, 0.05);
  state.lastFrame = now;
  state.renderer.update(delta);

  if (state.mode === "playing" && state.game && state.player) {
    if (!isPaused()) updatePlaying(delta);
    state.renderer.render(state.game, state.player, {
      hazardSpeed: state.game.difficultyData.hazardSpeed,
    });
    updateInteractionPrompt();
  } else if (state.previewGame && state.previewPlayer) {
    state.previewPlayer.animationTime += delta;
    state.renderer.render(state.previewGame, state.previewPlayer, {
      preview: true,
      hazardSpeed: 0.62,
    });
  }

  requestAnimationFrame(loop);
}

function updatePlaying(delta) {
  if (!state.game || !state.player) return;
  const room = state.game.room;
  const input = state.controls.getInput();
  const substeps = 2;
  const step = delta / substeps;

  for (let index = 0; index < substeps; index += 1) {
    state.player.update(input, step, room);
  }

  if (state.player.fallen) {
    state.player.fallen = false;
    state.renderer.setShake(10);
    state.renderer.setFlash(0.28, "207,98,108");
    state.player.resetTo(room.start.x, room.start.y);
    toast(DYNAMIC_TEXT.positionRespawn(), "warning");
  }

  checkCollectibles();
  checkPuzzlePlates();
  checkHazards();
  updateInteractionPrompt();

  const keyboardInput = state.keyboard.getInput();
  if (keyboardInput.interact && !state.interactPrev) {
    handleInteract();
  }
  state.interactPrev = keyboardInput.interact;

  refreshHud();
}

function roomBounds() {
  return { x: 0, y: 0, w: 1280, h: 720 };
}

function checkCollectibles() {
  const { game, player } = state;
  if (!game || !player) return;
  const room = game.room;
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;

  for (const item of room.items) {
    if (!game.roomHasItem(item.id)) continue;
    if (distance(centerX, centerY, item.x, item.y) > 43) continue;
    if (!game.collectItem(item.id)) continue;

    const type = item.type;
    const message =
      type === "key"
        ? DYNAMIC_TEXT.keyCollected(item.name)
        : type === "relic"
          ? DYNAMIC_TEXT.relicCollected(item.name)
          : DYNAMIC_TEXT.secretCollected(item.name);

    toast(message, type === "key" ? "key" : type === "secret" ? "secret" : "");
    state.sound.play(type === "key" ? "key" : type === "secret" ? "secret" : "item");
    vibrate(type === "key" ? [18, 30, 18] : 14);
    state.renderer.spawnParticles(
      item.x,
      item.y,
      type === "key"
        ? { count: 30, spread: 190, colors: ["#f9e2a4", "#e4bd6b", "#fff7d9"] }
        : type === "secret"
          ? { count: 22, colors: ["#79c9b8", "#b5fff0", "#e4bd6b"] }
          : { count: 24, colors: ["#e4bd6b", "#fff0bb", "#c99c52"] },
    );
    state.renderer.setFlash(type === "key" ? 0.18 : 0.08, "249,226,164");
    flashAutosave();

    if (game.lastCollection?.roomCompleted) {
      window.setTimeout(() => {
        toast(DYNAMIC_TEXT.roomCompleted(room.name), "key");
        state.sound.play("puzzle-solved");
      }, 220);
    }
    if (game.keysFound() >= TOTAL_KEYS) {
      window.setTimeout(() => toast(DYNAMIC_TEXT.allKeys(), "key"), 380);
    }
    if (game.collectedCount() >= TOTAL_SECRETS) {
      window.setTimeout(() => toast(DYNAMIC_TEXT.allSecrets(), "key"), 520);
    }

    enqueueAchievements(game.lastCollection?.newlyUnlocked ?? []);
    refreshHud();
  }
}

function checkPuzzlePlates() {
  const { game, player } = state;
  if (!game || !player) return;
  const room = game.room;
  const roomState = game.getRoomState(room.id);
  if (!roomState) return;

  for (const plate of room.puzzle.plates) {
    if (roomState.puzzlePlates.has(plate.index) || roomState.puzzleSolved) continue;
    const hitbox = {
      x: plate.x - 3,
      y: plate.y - 12,
      w: plate.w + 6,
      h: plate.h + 28,
    };
    const playerBounds = {
      x: player.x,
      y: player.y,
      w: player.width,
      h: player.height,
    };
    if (!rectsOverlap(playerBounds, hitbox)) continue;

    const result = game.touchPuzzlePlate(room.id, plate.index);
    if (!result.accepted) continue;

    state.sound.play(result.solvedNow ? "puzzle-solved" : "puzzle");
    vibrate(result.solvedNow ? [25, 35, 25] : 10);
    state.renderer.spawnParticles(
      plate.x + plate.w / 2,
      plate.y,
      {
        count: result.solvedNow ? 42 : 14,
        colors: result.solvedNow
          ? ["#f9e2a4", "#e4bd6b", "#fff5c7"]
          : ["#79c9b8", "#b5fff0", "#e4bd6b"],
        spread: result.solvedNow ? 210 : 90,
      },
    );

    if (result.solvedNow) {
      state.renderer.setFlash(0.26, "249,226,164");
      toast(DYNAMIC_TEXT.puzzleSolved(), "key");
      const hidden = room.items.find((item) => item.hidden);
      if (hidden) {
        state.renderer.spawnParticles(hidden.x, hidden.y, {
          count: 30,
          colors: ["#e4bd6b", "#fff2bc", "#79c9b8"],
          spread: 120,
        });
      }
      enqueueAchievements(game.evaluateAchievements({ silent: true }));
      flashAutosave();
    } else {
      toast(DYNAMIC_TEXT.puzzlePlate(result.progress), "secret");
    }
    refreshHud();
  }
}

function checkHazards() {
  const { game, player } = state;
  if (!game || !player || player.invulnerable > 0) return;
  const room = game.room;
  const playerBounds = {
    x: player.x + 5,
    y: player.y + 8,
    w: player.width - 10,
    h: player.height - 8,
  };

  for (const hazard of room.hazards) {
    const hitbox = {
      x: hazard.x,
      y: hazard.y - 8,
      w: hazard.w,
      h: hazard.h + 8,
    };
    if (!rectsOverlap(playerBounds, hitbox)) continue;

    const damaged = player.damage(game.difficultyData.damage);
    if (!damaged) return;

    game.setHealth(player.health);
    game.autosave();
    state.renderer.setShake(13);
    state.renderer.setFlash(0.34, "207,98,108");
    state.renderer.spawnDustBurst(player.x + player.width / 2, player.y + player.height);
    state.sound.play("damage");
    vibrate([30, 40, 30]);
    refreshHud();

    if (player.health <= 0) {
      showDefeat();
      return;
    }

    toast(DYNAMIC_TEXT.healthLost(player.health), "warning");
    flashAutosave();
    return;
  }
}

/* Взаимодействие */

function nearRect(player, rect, padding = 70) {
  const centerX = player.x + player.width / 2;
  const centerY = player.y + player.height / 2;
  const rectCenterX = rect.x + rect.w / 2;
  const rectCenterY = rect.y + rect.h / 2;
  return (
    Math.abs(centerX - rectCenterX) < rect.w / 2 + padding &&
    Math.abs(centerY - rectCenterY) < rect.h / 2 + 72
  );
}

function getNearDoor() {
  const { player, game } = state;
  if (!player || !game) return null;
  const room = game.room;

  if (room.finalGate && nearRect(player, room.exit, 82)) {
    return { type: "gate", room };
  }
  if (nearRect(player, room.exit, 74)) {
    const next = room.id < TOTAL_ROOMS ? ROOM_BY_ID.get(room.id + 1) : null;
    return { type: "next", room, target: next };
  }
  if (room.id > 1 && nearRect(player, room.entrance, 74)) {
    return { type: "previous", room, target: ROOM_BY_ID.get(room.id - 1) };
  }
  return null;
}

function updateInteractionPrompt() {
  if (!state.game || state.mode !== "playing" || isPaused()) {
    hideInteractionPrompt();
    return;
  }
  const near = getNearDoor();
  state.nearDoor = near;
  if (!near) {
    hideInteractionPrompt();
    return;
  }

  let text = UI_TEXT.interact;
  if (near.type === "gate") {
    text = state.game.canFinish()
      ? DYNAMIC_TEXT.finalGatePrompt()
      : DYNAMIC_TEXT.finalGateLockedPrompt();
  } else if (near.type === "next" && near.target) {
    text = DYNAMIC_TEXT.nextRoomPrompt(near.target.name);
  } else if (near.type === "previous" && near.target) {
    text = DYNAMIC_TEXT.previousRoomPrompt(near.target.name);
  }

  const prompt = $("#interaction-prompt");
  $("#interaction-text").textContent = text;
  prompt.hidden = false;
}

function hideInteractionPrompt() {
  const prompt = $("#interaction-prompt");
  if (prompt) prompt.hidden = true;
  state.nearDoor = null;
}

function handleInteract() {
  if (!state.game || state.mode !== "playing" || isPaused()) return;
  const near = getNearDoor();
  if (!near) return;

  if (near.type === "gate") {
    if (state.game.canFinish()) {
      const result = state.game.finishGame();
      showVictory(result);
    } else {
      toast(
        APP_TEXT.finalGateLockedToast(state.game.keysRemaining()),
        "warning",
      );
      state.sound.play("damage");
      vibrate([20, 30, 20]);
    }
    return;
  }

  if (near.type === "next" && near.target) {
    if (near.room.id === TOTAL_ROOMS) {
      if (state.game.canFinish()) showVictory(state.game.finishGame());
      else toast(APP_TEXT.finalGateLockedToast(state.game.keysRemaining()), "warning");
      return;
    }
    goToRoom(near.target.id);
    toast(APP_TEXT.roomTransition(near.target.name), "secret");
    return;
  }

  if (near.type === "previous" && near.target) {
    goToRoom(near.target.id);
    toast(APP_TEXT.roomTransition(near.target.name), "secret");
  }
}

/* Интерфейс */

function refreshHud() {
  const game = state.game;
  if (!game) return;
  const health = Math.max(0, Math.min(game.maxHealth, game.health));
  const signature = [
    game.currentRoom,
    health,
    game.maxHealth,
    game.keysFound(),
    game.collectedCount(),
    game.difficulty,
  ].join("|");
  if (signature === state.hudSignature) return;
  state.hudSignature = signature;

  const room = game.room;
  $("#hud-room-number").textContent = String(room.ordinal);
  const roomName = $("#hud-room-name");
  roomName.textContent = room.name;
  roomName.title = room.name;
  $("#hud-secrets").textContent = `${game.collectedCount()} / ${TOTAL_SECRETS}`;
  $("#hud-keys").textContent = `${game.keysFound()} / ${TOTAL_KEYS}`;
  $("#hud-difficulty").textContent = game.difficultyData.name;

  const hearts = $("#hud-hearts");
  hearts.replaceChildren();
  for (let index = 0; index < game.maxHealth; index += 1) {
    const heart = create("span", "heart");
    heart.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.5-9.2-9C1.2 8.5 3 5 6.6 5c2 0 3.4 1.1 4.4 2.4C12 6.1 13.4 5 15.4 5 19 5 20.8 8.5 19.2 12 17 16.5 12 21 12 21Z"/></svg>';
    if (index < health) heart.classList.add("is-full");
    hearts.append(heart);
  }
  const healthContainer = $("#hud-health");
  healthContainer.setAttribute("aria-label", APP_TEXT.healthAria(health, game.maxHealth));
}

function showRoomBanner(kicker, name, subtitle) {
  const banner = $("#room-banner");
  $("#room-banner-kicker").textContent = kicker;
  $("#room-banner-name").textContent = name;
  $("#room-banner-subtitle").textContent = subtitle;
  banner.classList.add("is-visible");
  window.clearTimeout(state.roomBannerTimer);
  state.roomBannerTimer = window.setTimeout(() => {
    banner.classList.remove("is-visible");
  }, 2600);
}

function flashAutosave() {
  const indicator = $("#autosave-indicator");
  if (!indicator) return;
  indicator.classList.add("is-visible");
  window.clearTimeout(state.autosaveTimer);
  state.autosaveTimer = window.setTimeout(() => {
    indicator.classList.remove("is-visible");
  }, 1500);
}

function toast(message, variant = "") {
  if (!message) return;
  const layer = $("#toast-layer");
  const node = create("div", `toast${variant ? ` toast-${variant}` : ""}`, message);
  layer.append(node);
  while (layer.children.length > 4) layer.firstElementChild.remove();
  const timer = window.setTimeout(() => {
    node.remove();
    state.toastTimers.delete(timer);
  }, 3300);
  state.toastTimers.add(timer);
}

function playHaptic(pattern) {
  if (!state.settings.vibration) return;
  try {
    if (
      globalThis.navigator?.userActivation &&
      !globalThis.navigator.userActivation.hasBeenActive
    ) {
      return;
    }
    navigator.vibrate?.(pattern);
  } catch {
    // Вибрация может быть недоступна.
  }
}

const vibrate = playHaptic;

function enqueueAchievements(list) {
  if (!list || list.length === 0) return;
  state.achievementQueue.push(...list);
  flushAchievementQueue();
}

function flushAchievementQueue() {
  if (state.achievementShowing || state.achievementQueue.length === 0) return;
  const achievement = state.achievementQueue.shift();
  state.achievementShowing = true;
  const popup = $("#achievement-popup");
  $("#achievement-popup-name").textContent = achievement.name;
  popup.hidden = false;
  popup.classList.remove("is-leaving");
  state.sound.play("achievement");

  window.clearTimeout(state.achievementTimer);
  state.achievementTimer = window.setTimeout(() => {
    popup.classList.add("is-leaving");
    state.achievementTimer = window.setTimeout(() => {
      popup.hidden = true;
      popup.classList.remove("is-leaving");
      state.achievementShowing = false;
      flushAchievementQueue();
    }, 380);
  }, 2800);
}

/* Наложения */

function openScreen(id, options = {}) {
  const screen = document.getElementById(id);
  if (!screen) return null;
  if (state.screenStack.includes(id)) {
    screen.style.zIndex = String(60 + state.screenStack.indexOf(id));
    return screen;
  }
  screen.classList.add("is-open");
  state.screenStack.push(id);
  screen.style.zIndex = String(50 + state.screenStack.length);
  if (!options.keepFocus) {
    const focusTarget = screen.querySelector("[data-close], button, [tabindex]");
    window.setTimeout(() => focusTarget?.focus?.({ preventScroll: true }), 50);
  }
  hideInteractionPrompt();
  return screen;
}

function closeScreen(id) {
  const screen = document.getElementById(id);
  if (!screen) return;
  screen.classList.remove("is-open");
  const index = state.screenStack.indexOf(id);
  if (index >= 0) state.screenStack.splice(index, 1);
  if (state.screenStack.length === 0) {
    state.lastFrame = performance.now();
    state.interactPrev = true;
  }
}

function closeAllScreens(includeMenu = false) {
  for (const screen of $$(".screen.is-open")) {
    if (!includeMenu && screen.id === "menu-screen") continue;
    screen.classList.remove("is-open");
  }
  state.screenStack = [];
  state.touch.releaseAll();
  state.keyboard.releaseAll();
  if (state.mode === "playing") {
    state.lastFrame = performance.now();
    state.interactPrev = true;
  }
}

function openConfirm({ title, text, acceptText, onAccept }) {
  state.confirmAction = onAccept;
  $("#confirm-title").textContent = title;
  $("#confirm-text").textContent = text;
  $("#confirm-accept").textContent = acceptText;
  openScreen("confirm-screen");
}

function showDefeat() {
  if (!state.game || state.endingOpen) return;
  state.endingOpen = true;
  state.game.autosave();
  state.sound.play("defeat");
  vibrate([45, 60, 45, 60, 90]);
  openScreen("defeat-screen");
}

function continueAfterDefeat() {
  if (!state.game) return;
  closeAllScreens(true);
  state.mode = "playing";
  state.endingOpen = false;
  state.game.respawn();
  const room = state.game.room;
  state.player = createPlayer({
    difficulty: state.game.difficultyData,
    x: room.start.x,
    y: room.start.y,
    health: state.game.health,
  });
  state.hudSignature = "";
  refreshHud();
  toast(DYNAMIC_TEXT.respawned(), "secret");
  state.renderer.setFlash(0.18, "121,201,184");
  state.lastFrame = performance.now();
}

function showVictory(result) {
  if (!result?.won) {
    toast(result?.reason ?? DYNAMIC_TEXT.gateLocked(state.game?.keysRemaining() ?? 0), "warning");
    return;
  }
  state.endingOpen = true;
  state.game?.save();
  state.sound.play("victory");
  vibrate([30, 40, 30, 40, 80]);

  const stats = result.stats;
  $("#victory-subtitle").textContent = result.subtitle;
  $("#victory-ending").textContent = result.ending;
  $("#victory-secrets").textContent = APP_TEXT.victoryStatsSecrets(
    stats.secrets,
    stats.totalSecrets,
  );
  $("#victory-keys").textContent = APP_TEXT.victoryStatsKeys(stats.keys, stats.totalKeys);
  $("#victory-rooms").textContent = APP_TEXT.victoryStatsRooms(stats.rooms, stats.totalRooms);
  $("#victory-puzzles").textContent = APP_TEXT.victoryStatsPuzzles(stats.puzzles, TOTAL_ROOMS);
  $("#victory-perfect").hidden = result.endingType !== "perfect";

  createVictoryParticles();
  openScreen("victory-screen", { keepFocus: true });
}

function createVictoryParticles() {
  const layer = $("#victory-particles");
  layer.replaceChildren();
  for (let index = 0; index < 42; index += 1) {
    const particle = create("span", "victory-particle");
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${5 + Math.random() * 8}s`;
    particle.style.animationDelay = `${-Math.random() * 10}s`;
    particle.style.opacity = String(0.3 + Math.random() * 0.7);
    particle.style.width = `${2 + Math.random() * 4}px`;
    particle.style.height = particle.style.width;
    layer.append(particle);
  }
}

/* Карта */

function mapStatusLabel(status) {
  if (status === "complete") return UI_TEXT.explored;
  if (status === "partial") return UI_TEXT.partiallyExplored;
  return UI_TEXT.unvisited;
}

function openMap() {
  if (!state.game) {
    toast(UI_TEXT.noSave, "warning");
    return;
  }
  state.mapSelected = state.game.currentRoom;
  renderMap();
  openScreen("map-screen");
  state.sound.play("click");
}

function renderMap() {
  if (!state.game) return;
  const data = state.game.getMapData();
  const nodesLayer = $("#map-nodes");
  const linesLayer = $("#map-lines");
  nodesLayer.replaceChildren();
  linesLayer.replaceChildren();

  $("#map-rooms-count").textContent = `${data.visitedRooms} / ${TOTAL_ROOMS}`;
  $("#map-secrets").textContent = `${data.collectedSecrets} / ${data.totalSecrets}`;
  $("#map-keys").textContent = `${data.foundKeys} / ${data.totalKeys}`;

  for (const connection of data.connections) {
    const from = MAP_POSITIONS[connection.from - 1];
    const to = MAP_POSITIONS[connection.to - 1];
    if (!from || !to) continue;
    const line = svgElement("line", {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      class: `map-line${connection.locked ? " is-locked" : ""}${
        data.rooms[connection.from - 1]?.visited && data.rooms[connection.to - 1]?.visited
          ? " is-open"
          : ""
      }`,
    });
    linesLayer.append(line);
  }

  const lastRoomPosition = MAP_POSITIONS[19];
  const gateLine = svgElement("line", {
    x1: lastRoomPosition.x,
    y1: lastRoomPosition.y,
    x2: GATE_POSITION.x,
    y2: GATE_POSITION.y,
    class: `map-line${data.gate.locked ? " is-locked" : " is-open"}`,
  });
  linesLayer.append(gateLine);

  for (const room of data.rooms) {
    const position = MAP_POSITIONS[room.id - 1];
    const node = create("button", `map-node status-${room.status}`);
    node.type = "button";
    node.dataset.roomId = String(room.id);
    node.style.left = `${(position.x / 1000) * 100}%`;
    node.style.top = `${(position.y / 700) * 100}%`;
    if (room.current) node.classList.add("is-current");
    if (room.isFinal) node.classList.add("is-final");
    node.setAttribute(
      "aria-label",
      APP_TEXT.mapNodeAria(room.id, room.name, mapStatusLabel(room.status)),
    );
    node.append(create("span", "map-node-number", String(room.id)));

    const icons = create("span", "map-node-icons");
    if (room.hasKey) {
      const keyBadge = createKeyIcon("map-node-badge badge-key");
      keyBadge.title = APP_TEXT.mapKeyBadge();
      icons.append(keyBadge);
    }
    if (room.missingSecrets > 0) {
      const questionBadge = create("span", "map-node-badge badge-question", "?");
      questionBadge.title = APP_TEXT.mapSecretBadge();
      icons.append(questionBadge);
    }
    if (icons.children.length > 0) node.append(icons);
    nodesLayer.append(node);
  }

  const gate = create(
    "div",
    `map-gate${data.gate.locked ? "" : " is-open"}`,
  );
  gate.style.left = `${(GATE_POSITION.x / 1000) * 100}%`;
  gate.style.top = `${(GATE_POSITION.y / 700) * 100}%`;
  gate.setAttribute("aria-label", APP_TEXT.mapGateAria(data.gate.locked));
  gate.append(
    create("span", "", data.gate.locked ? "✕" : "◈"),
    create("span", "", APP_TEXT.mapGateName()),
    create("small", "", APP_TEXT.mapGateKeys(data.gate.foundKeys, data.gate.requiredKeys)),
  );
  nodesLayer.append(gate);

  renderMapDetails(state.mapSelected ?? data.currentRoom);
}

function renderMapDetails(roomId) {
  if (!state.game) return;
  const data = state.game.getMapData();
  const room = data.rooms.find((entry) => entry.id === roomId);
  const details = $("#map-details");
  details.replaceChildren();
  if (!room) {
    details.append(create("p", "map-details-empty", APP_TEXT.chooseRoomPrompt()));
    return;
  }

  details.append(
    create("p", "map-room-kicker", APP_TEXT.mapRoomKicker(room.id)),
    create("h2", "map-room-name", room.name),
    create("p", "map-room-subtitle", room.subtitle),
  );

  const status = create(
    "span",
    `map-room-status status-${room.status}`,
    mapStatusLabel(room.status),
  );
  details.append(status);

  const meta = create("div", "map-room-meta");
  const secretsMeta = create("div");
  secretsMeta.append(
    create("span", "", UI_TEXT.secrets),
    create("strong", "", `${room.found} / ${room.total}`),
  );
  const keyMeta = create("div");
  keyMeta.append(
    create("span", "", UI_TEXT.keys),
    create("strong", "", room.keyFound ? UI_TEXT.keyTaken : UI_TEXT.keyAvailable),
  );
  meta.append(secretsMeta, keyMeta);
  details.append(meta);

  const flags = create("div", "map-room-flags");
  if (room.hasKey) flags.append(create("span", "map-room-flag is-key", UI_TEXT.keyAvailable));
  if (room.puzzleSolved) flags.append(create("span", "map-room-flag", UI_TEXT.puzzleSolved));
  else if (room.visited) flags.append(create("span", "map-room-flag", UI_TEXT.puzzleUnsolved));
  if (room.id === 20) {
    flags.append(
      create(
        "span",
        `map-room-flag${data.gate.locked ? " is-locked" : ""}`,
        data.gate.locked ? UI_TEXT.gateLocked : UI_TEXT.gateOpen,
      ),
    );
  }
  if (flags.children.length > 0) details.append(flags);

  const travel = create("button", "button button-primary map-travel");
  travel.type = "button";
  if (room.current) {
    travel.textContent = APP_TEXT.mapCurrentLabel();
    travel.disabled = true;
  } else if (!room.visited) {
    travel.textContent = APP_TEXT.mapUnvisitedTravel();
    travel.disabled = true;
  } else {
    travel.textContent = APP_TEXT.mapTravelButton();
    travel.addEventListener("click", () => travelFromMap(room.id));
  }
  details.append(travel);
}

/* Инвентарь */

function openInventory() {
  if (!state.game) {
    toast(UI_TEXT.noSave, "warning");
    return;
  }
  renderInventory();
  openScreen("inventory-screen");
  state.sound.play("click");
}

function renderInventory() {
  if (!state.game) return;
  const game = state.game;
  const content = $("#inventory-content");
  content.replaceChildren();
  $("#inventory-secrets").textContent = String(game.collectedCount());
  $("#inventory-keys").textContent = String(game.keysFound());

  const entries = game.inventoryItems();
  if (entries.length === 0) {
    const empty = create("div", "inventory-empty");
    empty.append(
      create("span", "empty-glyph", "◈"),
      create("h3", "", UI_TEXT.inventoryEmpty),
      create("p", "", UI_TEXT.inventoryHint),
    );
    content.append(empty);
    return;
  }

  const keys = entries.filter((entry) => entry.item.type === "key");
  const others = entries.filter((entry) => entry.item.type !== "key");

  content.append(
    buildInventorySection(
      UI_TEXT.inventoryKeysOnly,
      APP_TEXT.inventoryKeysHead(keys.length, TOTAL_KEYS),
      keys,
    ),
  );
  if (others.length > 0) {
    content.append(
      buildInventorySection(
        UI_TEXT.inventoryRelics,
        APP_TEXT.inventorySecretsHead(others.length),
        others,
      ),
    );
  }

  const note = create("p", "inventory-note", UI_TEXT.inventoryHint);
  content.append(note);
}

function buildInventorySection(title, subtitle, entries) {
  const section = create("section", "inventory-section");
  const head = create("div", "inventory-section-head");
  head.append(create("h3", "", title), create("span", "", subtitle));
  section.append(head);

  const grid = create("div", "inventory-grid");
  for (const { item } of entries) {
    const card = create("article", "inventory-card");
    const glyph =
      item.type === "key"
        ? createKeyIcon("item-glyph glyph-key")
        : create(
            "span",
            `item-glyph glyph-${item.type === "secret" ? "secret" : "relic"}`,
            item.type === "secret" ? "✦" : "◇",
          );
    const copy = create("div", "item-card-copy");
    const typeLabel =
      item.type === "key"
        ? UI_TEXT.itemTypeKey
        : item.type === "relic"
          ? UI_TEXT.itemTypeRelic
          : UI_TEXT.itemTypeSecret;
    copy.append(
      create("strong", "", item.name),
      create("small", "", `${typeLabel} • ${UI_TEXT.foundInRoom} ${item.roomId}`),
      create("p", "", item.description),
    );
    card.append(glyph, copy);
    grid.append(card);
  }
  section.append(grid);
  return section;
}

/* Достижения */

function openAchievements() {
  renderAchievements();
  openScreen("achievements-screen");
  state.sound.play("click");
}

function renderAchievements() {
  const savedGame = state.game ? null : hasSavedGame() ? loadGame() : null;
  const game = state.game ?? savedGame ?? state.previewGame;
  const content = $("#achievements-content");
  content.replaceChildren();
  const achievements = game
    ? game.getAchievements()
    : ACHIEVEMENTS.map((achievement) => ({ ...achievement, unlocked: false }));
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;
  $("#achievements-count").textContent = String(unlocked);

  for (const achievement of achievements) {
    const card = create(
      "article",
      `achievement-card${achievement.unlocked ? " is-unlocked" : ""}`,
    );
    const medal = create("span", "achievement-medal", achievement.unlocked ? "✦" : "◇");
    const copy = create("div", "achievement-copy");
    copy.append(
      create("strong", "", achievement.name),
      create("p", "", achievement.description),
      create("span", "achievement-reward", `${UI_TEXT.reward}: ${achievement.reward}`),
    );
    if (!achievement.unlocked) {
      copy.append(create("span", "achievement-reward", APP_TEXT.achievementLockedLabel()));
    }
    card.append(medal, copy);
    content.append(card);
  }
}

/* Подсказка */

function openHint() {
  if (!state.game) {
    toast(UI_TEXT.noSave, "warning");
    return;
  }
  const game = state.game;
  const room = game.room;
  const remaining = game.roomTotal(room.id) - game.roomFound(room.id);
  $("#hint-room").textContent = room.name;
  $("#hint-text").textContent = room.hint;
  $("#hint-remaining").textContent = `${remaining} ${wordForSecrets(remaining)}`;
  $("#hint-plates").textContent = `${game.puzzleProgress(room.id)} из ${room.puzzle.plates.length}`;

  const extras = [];
  if (remaining === 0) extras.push(DYNAMIC_TEXT.hintAllFound());
  else extras.push(DYNAMIC_TEXT.hintRemaining(remaining));
  const keyItem = room.items.find((item) => item.type === "key");
  if (keyItem && !game.inventoryHas(keyItem.id)) {
    extras.push(DYNAMIC_TEXT.hintKey());
  }
  if (!game.isPuzzleSolved(room.id)) extras.push(DYNAMIC_TEXT.hintPuzzle());
  if (room.finalGate && !game.canFinish()) {
    extras.push(DYNAMIC_TEXT.hintGate(game.keysRemaining()));
  }
  $("#hint-extra").textContent = extras.join(" ");
  openScreen("hint-screen");
  state.sound.play("click");
}

/* Настройки */

function updateSettingsUi() {
  $("#setting-sound").setAttribute("aria-checked", String(state.settings.sound));
  $("#setting-vibration").setAttribute("aria-checked", String(state.settings.vibration));
  $("#setting-tutorial").setAttribute("aria-checked", String(state.settings.tutorial));
}

function toggleSetting(name) {
  state.settings[name] = !state.settings[name];
  persistSettings(state.settings);
  if (name === "sound") {
    state.sound.setEnabled(state.settings.sound);
    if (state.settings.sound) state.sound.play("click");
  }
  if (name === "vibration" && state.settings.vibration) vibrate(12);
  updateSettingsUi();
  toast(APP_TEXT.settingsSaved(), "");
}

function openSettings() {
  updateSettingsUi();
  openScreen("settings-screen");
  state.sound.play("click");
}

function requestResetProgress() {
  openConfirm({
    title: APP_TEXT.confirmResetTitle(),
    text: APP_TEXT.confirmResetText(),
    acceptText: APP_TEXT.confirmResetAccept(),
    onAccept: () => {
      state.game = null;
      state.player = null;
      clearSavedGame();
      showMenu();
      updateMenu();
      toast(APP_TEXT.resetDone(), "warning");
    },
  });
}

/* Обучение */

function openTutorial() {
  state.tutorialIndex = 0;
  renderTutorialStep();
  openScreen("tutorial-screen");
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[state.tutorialIndex];
  const content = $("#tutorial-content");
  content.replaceChildren();
  const symbols = ["↔", "↑", "◈", "✦", "▣", "♥"];
  const visual = create("div", "tutorial-visual", symbols[state.tutorialIndex] ?? "◈");
  const copy = create("div", "tutorial-copy");
  const dots = create("div", "tutorial-dots");
  TUTORIAL_STEPS.forEach((_, index) => {
    const dot = create("span");
    if (index === state.tutorialIndex) dot.classList.add("is-active");
    dots.append(dot);
  });
  copy.append(
    create("h3", "", step.title),
    create("p", "", step.text),
    create("p", "tutorial-step-label", APP_TEXT.tutorialStepOf(
      state.tutorialIndex + 1,
      TUTORIAL_STEPS.length,
    )),
    dots,
  );
  content.append(visual, copy);
  $("#tutorial-next").textContent =
    state.tutorialIndex === TUTORIAL_STEPS.length - 1
      ? APP_TEXT.tutorialFinish()
      : UI_TEXT.next;
}

function nextTutorialStep() {
  if (state.tutorialIndex < TUTORIAL_STEPS.length - 1) {
    state.tutorialIndex += 1;
    renderTutorialStep();
    state.sound.play("click");
    return;
  }
  closeScreen("tutorial-screen");
  const callback = state.tutorialCallback;
  state.tutorialCallback = null;
  callback?.();
}

/* Подтверждение */

function confirmAccept() {
  const action = state.confirmAction;
  state.confirmAction = null;
  closeScreen("confirm-screen");
  action?.();
}

function confirmCancel() {
  state.confirmAction = null;
  closeScreen("confirm-screen");
}

/* События */

function bindUi() {
  $("#menu-continue").addEventListener("click", continueGame);
  $("#menu-new").addEventListener("click", () => {
    state.sound.ensure();
    openDifficulty();
  });
  $("#menu-settings").addEventListener("click", openSettings);
  $("#menu-achievements").addEventListener("click", openAchievements);
  $("#menu-tutorial").addEventListener("click", () => {
    state.tutorialCallback = null;
    openTutorial();
  });

  $("#start-new-game").addEventListener("click", startNewGame);
  $("#tutorial-next").addEventListener("click", nextTutorialStep);

  for (const button of $$("[data-close]")) {
    button.addEventListener("click", () => {
      closeScreen(button.dataset.close);
      state.sound.play("click");
    });
  }

  for (const button of $$("[data-ui]")) {
    button.addEventListener("click", () => {
      state.sound.ensure();
      state.sound.play("click");
      const action = button.dataset.ui;
      if (action === "map") openMap();
      else if (action === "inventory") openInventory();
      else if (action === "hint") openHint();
      else if (action === "pause") openPause();
    });
  }

  $("#pause-resume").addEventListener("click", () => closeScreen("pause-screen"));
  $("#pause-save").addEventListener("click", () => {
    if (!state.game) return;
    if (state.game.save()) {
      flashAutosave();
      toast(DYNAMIC_TEXT.saved(), "secret");
      state.sound.play("secret");
    } else {
      toast(APP_TEXT.saveFailed(), "warning");
    }
  });
  $("#pause-map").addEventListener("click", openMap);
  $("#pause-achievements").addEventListener("click", openAchievements);
  $("#pause-settings").addEventListener("click", openSettings);
  $("#pause-menu").addEventListener("click", () => {
    if (state.game) state.game.save();
    showMenu();
  });

  $("#hint-open-map").addEventListener("click", () => {
    closeScreen("hint-screen");
    openMap();
  });

  $("#setting-sound").addEventListener("click", () => toggleSetting("sound"));
  $("#setting-vibration").addEventListener("click", () => toggleSetting("vibration"));
  $("#setting-tutorial").addEventListener("click", () => toggleSetting("tutorial"));
  $("#setting-reset").addEventListener("click", requestResetProgress);

  $("#confirm-cancel").addEventListener("click", confirmCancel);
  $("#confirm-accept").addEventListener("click", confirmAccept);

  $("#defeat-continue").addEventListener("click", continueAfterDefeat);
  $("#defeat-menu").addEventListener("click", () => {
    state.endingOpen = false;
    showMenu();
  });
  $("#victory-again").addEventListener("click", () => {
    state.endingOpen = false;
    closeAllScreens(true);
    showMenu();
    openDifficulty();
  });
  $("#victory-menu").addEventListener("click", () => {
    state.endingOpen = false;
    showMenu();
  });

  $("#map-nodes").addEventListener("click", (event) => {
    const node = event.target.closest("[data-room-id]");
    if (!node) return;
    state.mapSelected = Number(node.dataset.roomId);
    renderMapDetails(state.mapSelected);
    state.sound.play("click");
  });

  bindTouchButtons($("#touch-controls"), state.touch, (action) => {
    state.sound.unlock();
    if (!state.game || state.mode !== "playing" || isPaused()) return;
    if (action === "jump") {
      state.player?.queueJump();
      state.sound.play(state.player?.jumpsUsed > 0 ? "double-jump" : "jump");
    } else if (action === "interact") {
      handleInteract();
    }
  });

  document.addEventListener("pointerdown", () => {
    state.sound.unlock();
  }, { passive: true });

  document.addEventListener("keydown", handleKeyDown, { passive: false });
  document.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", () => {
    state.keyboard.releaseAll();
    state.touch.releaseAll();
  });
  document.addEventListener("visibilitychange", () => {
    state.hidden = document.hidden;
    if (document.hidden) {
      state.game?.save();
      state.keyboard.releaseAll();
      state.touch.releaseAll();
    } else {
      state.lastFrame = performance.now();
    }
  });
  window.addEventListener("beforeunload", () => {
    state.game?.save();
  });
}

function handleKeyDown(event) {
  state.sound.unlock();
  const blocked = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Space",
    "Tab",
  ]);
  if (blocked.has(event.code)) event.preventDefault();

  if (event.code === "Escape") {
    event.preventDefault();
    const top = state.screenStack.at(-1);
    if (top) {
      if (top === "victory-screen" || top === "defeat-screen") return;
      if (top === "confirm-screen") {
        confirmCancel();
        return;
      }
      closeScreen(top);
      return;
    }
    if (state.mode === "playing") openPause();
    return;
  }

  if (event.repeat) return;

  state.keyboard.setKey(event.code, true);
  if (state.mode !== "playing") return;
  if (state.screenStack.length > 0) return;

  if (event.code === "KeyM" || event.code === "KeyV") openMap();
  else if (event.code === "KeyH" || event.code === "KeyG") openHint();
  else if (event.code === "KeyI" || event.code === "KeyB") openInventory();
  else if (
    event.code === "KeyP" ||
    event.code === "KeyR"
  ) {
    openPause();
  }
}

function handleKeyUp(event) {
  state.keyboard.setKey(event.code, false);
}

function openPause() {
  if (!state.game) return;
  const game = state.game;
  $("#pause-room").textContent = String(game.currentRoom);
  $("#pause-secrets").textContent = `${game.collectedCount()} / ${TOTAL_SECRETS}`;
  $("#pause-keys").textContent = `${game.keysFound()} / ${TOTAL_KEYS}`;
  openScreen("pause-screen");
  state.sound.play("click");
}

/* Запуск */

function init() {
  const canvas = $("#game-canvas");
  state.renderer = new GameRenderer(canvas);
  state.previewGame = createGame({ autoSave: false, difficulty: "seeker" });
  state.previewGame.enterRoom(1, { silent: true });
  state.previewPlayer = createPlayer({
    difficulty: state.previewGame.difficultyData,
    x: ROOM_BY_ID.get(1).start.x,
    y: ROOM_BY_ID.get(1).start.y,
  });
  state.previewGame.sound = state.sound;

  if (
    globalThis.matchMedia?.("(pointer: coarse)")?.matches ||
    (navigator.maxTouchPoints ?? 0) > 0
  ) {
    document.body.classList.add("touch-device");
  }

  buildDifficultyCards();
  updateSettingsUi();
  updateMenu();
  bindUi();
  requestAnimationFrame((now) => {
    state.lastFrame = now;
    loop(now);
  });

  window.setTimeout(() => {
    $("#loading-screen").classList.add("is-hidden");
    $("#app").classList.remove("is-loading");
    document.body.classList.add("is-menu");
    $("#menu-screen").classList.add("is-open");
    updateMenu();
  }, 700);
}

try {
  init();
  if (new URLSearchParams(globalThis.location?.search ?? "").has("debug")) {
    globalThis.__pyramid = {
      state,
      openMap,
      renderMap,
      openInventory,
      openHint,
      openPause,
      openAchievements,
      renderAchievements,
      openScreen,
      closeScreen,
      refreshHud,
      prepareRoomEntry,
      goToRoom,
      travelFromMap,
      startSession,
      showMenu,
      showVictory,
      showDefeat,
      toast,
    };
  }
} catch (error) {
  const loading = $("#loading-screen");
  if (loading) {
    $(".loading-label").textContent = APP_TEXT.loadingError();
    $(".loading-track")?.remove();
  }
  console.error(error);
}
