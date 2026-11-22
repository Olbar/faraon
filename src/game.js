import {
  ACHIEVEMENTS,
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  ITEM_BY_ID,
  ITEMS,
  ROOM_BY_ID,
  ROOMS,
  STORY,
  TOTAL_KEYS,
  TOTAL_ROOMS,
  TOTAL_SECRETS,
} from "./content.js";
import { DYNAMIC_TEXT } from "./texts.js";

export const SAVE_KEY = "curse-of-the-pyramid-save";
export const SAVE_VERSION = 1;

const memory = new Map();

const memoryStorage = {
  getItem(key) {
    return memory.has(key) ? memory.get(key) : null;
  },
  setItem(key, value) {
    memory.set(key, String(value));
  },
  removeItem(key) {
    memory.delete(key);
  },
};

function detectStorage() {
  try {
    const storage = globalThis.localStorage;
    if (
      storage &&
      typeof storage.getItem === "function" &&
      typeof storage.setItem === "function"
    ) {
      const probe = "__pyramid_probe__";
      storage.setItem(probe, "1");
      storage.removeItem(probe);
      return storage;
    }
  } catch {
    // Хранилище браузера может быть недоступно в приватном режиме.
  }
  return memoryStorage;
}

let defaultStorage = detectStorage();

export function setDefaultStorage(storage) {
  defaultStorage = storage ?? detectStorage();
}

export function getDefaultStorage() {
  return defaultStorage;
}

function createRoomState(roomId, visited = false) {
  return {
    visited,
    collected: new Set(),
    puzzlePlates: new Set(),
    puzzleSolved: false,
    revealedSecrets: new Set(),
    doors: new Set(),
  };
}

function normalizeDifficulty(value) {
  if (value === "cursed") return "nightmare";
  if (DIFFICULTY_BY_ID.has(value)) return value;
  return DEFAULT_DIFFICULTY;
}

function normalizeRoomId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > TOTAL_ROOMS) return null;
  return parsed;
}

function safeParse(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export class Game {
  constructor(options = {}) {
    this.storage = options.storage ?? defaultStorage;
    this.difficulty = normalizeDifficulty(options.difficulty ?? DEFAULT_DIFFICULTY);
    this.difficultyData = DIFFICULTY_BY_ID.get(this.difficulty);
    this.maxHealth = this.difficultyData.maxHealth;
    this.health = options.health ?? this.maxHealth;
    this.currentRoom = 1;
    this.finished = false;
    this.endingType = null;
    this.deaths = 0;
    this.startedAt = Date.now();
    this.lastSavedAt = null;
    this.achievements = new Set();
    this.roomStates = new Map(
      ROOMS.map((room) => [room.id, createRoomState(room.id, room.id === 1)]),
    );
    this.inventory = new Map();
    this.visited = new Set([1]);
    this.autoSave = options.autoSave ?? true;

    if (options.state) {
      this.restore(options.state);
    }
  }

  get room() {
    return ROOM_BY_ID.get(this.currentRoom);
  }

  get difficultyInfo() {
    return DIFFICULTY_BY_ID.get(this.difficulty);
  }

  getRoomState(roomId) {
    const id = normalizeRoomId(roomId);
    if (!id) return null;
    if (!this.roomStates.has(id)) {
      this.roomStates.set(id, createRoomState(id, false));
    }
    return this.roomStates.get(id);
  }

  enterRoom(roomId, options = {}) {
    const id = normalizeRoomId(roomId);
    if (!id) return false;

    const state = this.getRoomState(id);
    const isNew = !state.visited;
    this.currentRoom = id;
    state.visited = true;
    this.visited.add(id);

    if (!options.silent) {
      this.autosave();
    }

    return { roomId: id, isNew, room: ROOM_BY_ID.get(id) };
  }

  travelTo(roomId) {
    const id = normalizeRoomId(roomId);
    if (!id || !this.hasVisited(id) || id === this.currentRoom) return false;
    this.enterRoom(id, { silent: true });
    this.autosave();
    return true;
  }

  hasVisited(roomId) {
    const id = normalizeRoomId(roomId);
    return Boolean(id && this.getRoomState(id).visited);
  }

  visitedCount() {
    return this.visited.size;
  }

  roomState(roomId) {
    const state = this.getRoomState(roomId);
    return state
      ? {
          visited: state.visited,
          collected: [...state.collected],
          puzzlePlates: [...state.puzzlePlates],
          puzzleSolved: state.puzzleSolved,
          revealedSecrets: [...state.revealedSecrets],
          doors: [...state.doors],
        }
      : null;
  }

  leaveItem(itemId) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item) return false;
    if (this.inventoryHas(itemId)) return false;
    if (this.isCollected(itemId)) return false;
    const state = this.getRoomState(item.roomId);
    if (!state) return false;
    state.collected.delete(itemId);
    return true;
  }

  roomHasItem(itemId) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item || item.roomId !== this.currentRoom) return false;
    if (this.isCollected(itemId)) return false;
    if (item.hidden) {
      return this.isPuzzleSolved(item.roomId);
    }
    if (item.conceal === "wall") {
      return this.isSecretRevealed(item.roomId, itemId);
    }
    return true;
  }

  roomHasItemIn(roomId, itemId) {
    const item = ITEM_BY_ID.get(itemId);
    const id = normalizeRoomId(roomId);
    if (!item || !id || item.roomId !== id) return false;
    if (this.isCollected(itemId)) return false;
    if (item.hidden) {
      return this.isPuzzleSolved(id);
    }
    if (item.conceal === "wall") {
      return this.isSecretRevealed(id, itemId);
    }
    return true;
  }

  isSecretRevealed(roomId, itemId) {
    const id = normalizeRoomId(roomId);
    const state = this.getRoomState(id);
    return Boolean(state?.revealedSecrets.has(itemId));
  }

  revealSecret(roomId, itemId) {
    const id = normalizeRoomId(roomId);
    const item = ITEM_BY_ID.get(itemId);
    if (!id || !item || item.roomId !== id || id !== this.currentRoom) return false;
    if (item.conceal !== "wall" || item.hidden) return false;
    const state = this.getRoomState(id);
    if (state.revealedSecrets.has(itemId) || this.isCollected(itemId)) return false;

    state.revealedSecrets.add(itemId);
    this.autosave();
    this.lastReveal = { item, roomId: id };
    return true;
  }

  collectItem(itemId) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item) return false;
    if (item.roomId !== this.currentRoom) return false;
    if (this.isCollected(itemId) || this.inventoryHas(itemId)) return false;
    if (item.hidden && !this.isPuzzleSolved(item.roomId)) return false;
    if (item.conceal === "wall" && !this.isSecretRevealed(item.roomId, itemId)) {
      return false;
    }

    const state = this.getRoomState(item.roomId);
    state.collected.add(itemId);
    this.inventory.set(itemId, 1);

    const roomCompleted = this.isRoomComplete(item.roomId);
    this.autosave();
    this.lastCollection = {
      item,
      roomCompleted,
      newlyUnlocked: this.evaluateAchievements({ silent: true }),
    };

    return true;
  }

  isCollected(itemId) {
    const item = ITEM_BY_ID.get(itemId);
    if (!item) return false;
    const state = this.getRoomState(item.roomId);
    return Boolean(state?.collected.has(itemId));
  }

  inventoryHas(itemId) {
    return this.inventory.get(itemId) > 0;
  }

  inventoryCount(itemId) {
    return this.inventory.get(itemId) ?? 0;
  }

  inventoryItems() {
    return [...this.inventory.entries()]
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({
        item: ITEM_BY_ID.get(id),
        count,
      }))
      .filter((entry) => entry.item)
      .sort((a, b) => {
        if (a.item.type === "key" && b.item.type !== "key") return -1;
        if (a.item.type !== "key" && b.item.type === "key") return 1;
        return a.item.roomId - b.item.roomId || a.item.name.localeCompare(b.item.name, "ru");
      });
  }

  roomFound(roomId) {
    const id = normalizeRoomId(roomId);
    const state = this.getRoomState(id);
    return state ? state.collected.size : 0;
  }

  roomTotal(roomId) {
    const id = normalizeRoomId(roomId);
    return ROOM_BY_ID.get(id)?.items.length ?? 0;
  }

  isRoomComplete(roomId) {
    const id = normalizeRoomId(roomId);
    if (!id) return false;
    return this.roomFound(id) >= this.roomTotal(id);
  }

  roomStatus(roomId) {
    const id = normalizeRoomId(roomId);
    if (!id || !this.hasVisited(id)) return "unvisited";
    return this.isRoomComplete(id) ? "complete" : "partial";
  }

  collectedCount() {
    let total = 0;
    for (const count of this.inventory.values()) {
      if (count > 0) total += 1;
    }
    return total;
  }

  keysFound() {
    return ITEMS.filter(
      (item) => item.type === "key" && this.inventoryHas(item.id),
    ).length;
  }

  keysRemaining() {
    return TOTAL_KEYS - this.keysFound();
  }

  secretPercent() {
    return Math.round((this.collectedCount() / TOTAL_SECRETS) * 100);
  }

  solvedPuzzlesCount() {
    let count = 0;
    for (const state of this.roomStates.values()) {
      if (state.puzzleSolved) count += 1;
    }
    return count;
  }

  isPuzzleSolved(roomId) {
    const id = normalizeRoomId(roomId);
    return Boolean(this.getRoomState(id)?.puzzleSolved);
  }

  puzzleProgress(roomId) {
    const state = this.getRoomState(roomId);
    return state ? state.puzzlePlates.size : 0;
  }

  touchPuzzlePlate(roomId, plateIndex) {
    const id = normalizeRoomId(roomId);
    if (!id || id !== this.currentRoom) return { accepted: false, solved: false };
    const room = ROOM_BY_ID.get(id);
    if (!room) return { accepted: false, solved: false };
    const index = Number(plateIndex);
    if (!Number.isInteger(index) || index < 0 || index >= room.puzzle.plates.length) {
      return { accepted: false, solved: false };
    }

    const state = this.getRoomState(id);
    if (state.puzzleSolved) {
      return { accepted: false, solved: true, alreadySolved: true };
    }

    state.puzzlePlates.add(index);
    let solvedNow = false;
    if (state.puzzlePlates.size >= room.puzzle.plates.length) {
      state.puzzleSolved = true;
      solvedNow = true;
      this.autosave();
      this.evaluateAchievements({ silent: true });
    }

    return {
      accepted: true,
      solved: state.puzzleSolved,
      solvedNow,
      progress: state.puzzlePlates.size,
      total: room.puzzle.plates.length,
    };
  }

  setHealth(value) {
    this.health = Math.max(0, Math.min(this.maxHealth, Number(value) || 0));
    return this.health;
  }

  applyDamage(amount = this.difficultyData.damage) {
    const previous = this.health;
    this.health = Math.max(0, this.health - amount);
    const died = previous > 0 && this.health === 0;
    if (died) {
      this.deaths += 1;
      this.autosave();
    }
    return { health: this.health, died, damage: previous - this.health };
  }

  heal(amount = 1) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this.health;
  }

  respawn() {
    this.health = this.maxHealth;
    this.autosave();
    return {
      roomId: this.currentRoom,
      health: this.health,
      deaths: this.deaths,
    };
  }

  canFinish() {
    return this.keysFound() >= TOTAL_KEYS;
  }

  finishGame() {
    if (!this.canFinish()) {
      return {
        won: false,
        reason: DYNAMIC_TEXT.gateLocked(this.keysRemaining()),
        missingKeys: this.keysRemaining(),
        stats: this.getStats(),
      };
    }

    this.finished = true;
    this.endingType = this.collectedCount() >= TOTAL_SECRETS ? "perfect" : "freedom";
    this.evaluateAchievements({ silent: true });
    this.autosave();

    return {
      won: true,
      title: "Победа!",
      subtitle:
        this.endingType === "perfect"
          ? "Совершенная концовка"
          : "Проклятие разрушено",
      ending:
        this.endingType === "perfect" ? STORY.endingPerfect : STORY.ending,
      endingType: this.endingType,
      difficulty: this.difficultyData,
      stats: this.getStats(),
    };
  }

  getStats() {
    return {
      keys: this.keysFound(),
      secrets: this.collectedCount(),
      rooms: this.visitedCount(),
      puzzles: this.solvedPuzzlesCount(),
      deaths: this.deaths,
      percent: this.secretPercent(),
      totalKeys: TOTAL_KEYS,
      totalSecrets: TOTAL_SECRETS,
      totalRooms: TOTAL_ROOMS,
    };
  }

  getMapData() {
    const rooms = ROOMS.map((room) => {
      const state = this.getRoomState(room.id);
      const key = room.items.find((item) => item.type === "key");
      const found = state.collected.size;
      return {
        id: room.id,
        name: room.name,
        subtitle: room.subtitle,
        status: this.roomStatus(room.id),
        visited: state.visited,
        current: room.id === this.currentRoom,
        found,
        total: room.items.length,
        missingSecrets: room.items.length - found,
        hasKey: !this.isCollected(key.id),
        keyFound: this.isCollected(key.id),
        puzzleSolved: state.puzzleSolved,
        travelable: state.visited && room.id !== this.currentRoom,
        locked: Boolean(room.finalGate && !this.canFinish()),
        isFinal: Boolean(room.finalGate),
      };
    });

    const seen = new Set();
    const connections = [];
    for (const room of ROOMS) {
      for (const target of room.connections) {
        const key = [Math.min(room.id, target), Math.max(room.id, target)].join("-");
        if (seen.has(key)) continue;
        seen.add(key);
        connections.push({
          from: room.id,
          to: target,
          locked: false,
          kind: "corridor",
        });
      }
    }

    return {
      rooms,
      connections,
      currentRoom: this.currentRoom,
      totalSecrets: TOTAL_SECRETS,
      collectedSecrets: this.collectedCount(),
      totalKeys: TOTAL_KEYS,
      foundKeys: this.keysFound(),
      visitedRooms: this.visitedCount(),
      gate: {
        name: "Врата Вечности",
        locked: !this.canFinish(),
        requiredKeys: TOTAL_KEYS,
        foundKeys: this.keysFound(),
        missingKeys: this.keysRemaining(),
      },
    };
  }

  getAchievements() {
    return ACHIEVEMENTS.map((achievement) => ({
      ...achievement,
      unlocked: this.achievements.has(achievement.id),
      condition: undefined,
    }));
  }

  evaluateAchievements(options = {}) {
    const unlocked = [];
    for (const achievement of ACHIEVEMENTS) {
      if (this.achievements.has(achievement.id)) continue;
      let conditionMet = false;
      try {
        conditionMet = achievement.condition(this);
      } catch {
        conditionMet = false;
      }
      if (conditionMet) {
        this.achievements.add(achievement.id);
        unlocked.push(achievement);
      }
    }
    if (unlocked.length > 0 && !options.silent) {
      this.autosave();
    }
    return unlocked;
  }

  validateNoSoftlocks() {
    const issues = [];
    let requiredKeysAvailable = 0;

    for (const item of ITEMS) {
      if (item.type !== "key") continue;
      const collected = this.isCollected(item.id);
      const inInventory = this.inventoryHas(item.id);

      if (collected && !inInventory) {
        issues.push({
          code: "key-lost-after-collection",
          itemId: item.id,
          roomId: item.roomId,
        });
        continue;
      }

      if (!collected && !inInventory) {
        const roomState = this.getRoomState(item.roomId);
        if (!roomState) {
          issues.push({
            code: "key-room-missing",
            itemId: item.id,
            roomId: item.roomId,
          });
          continue;
        }
        if (item.hidden) {
          issues.push({
            code: "required-key-hidden",
            itemId: item.id,
            roomId: item.roomId,
          });
          continue;
        }
        requiredKeysAvailable += 1;
      }

      if (collected || inInventory) {
        requiredKeysAvailable += 1;
      }
    }

    for (const room of ROOMS) {
      const state = this.getRoomState(room.id);
      if (!state) {
        issues.push({ code: "room-state-missing", roomId: room.id });
        continue;
      }
      for (const itemId of state.collected) {
        if (!this.inventoryHas(itemId) && ITEM_BY_ID.has(itemId)) {
          issues.push({
            code: "collected-item-not-in-inventory",
            roomId: room.id,
            itemId,
          });
        }
      }
    }

    return {
      ok: issues.length === 0,
      issues,
      repaired: 0,
      requiredKeysAvailable,
      totalRequiredKeys: TOTAL_KEYS,
    };
  }

  repairNoSoftlocks() {
    let repaired = 0;

    for (const room of ROOMS) {
      if (!this.roomStates.has(room.id)) {
        this.roomStates.set(
          room.id,
          createRoomState(room.id, this.visited.has(room.id)),
        );
        repaired += 1;
      }
    }

    for (const item of ITEMS) {
      if (item.type !== "key") continue;
      const state = this.getRoomState(item.roomId);
      const collected = state.collected.has(item.id);
      const inInventory = this.inventoryHas(item.id);

      if (collected && !inInventory) {
        this.inventory.set(item.id, 1);
        repaired += 1;
      }
      if (!collected && inInventory) {
        state.collected.add(item.id);
        repaired += 1;
      }
    }

    if (repaired > 0) this.autosave();
    return repaired;
  }

  serialize() {
    return {
      version: SAVE_VERSION,
      difficulty: this.difficulty,
      currentRoom: this.currentRoom,
      health: this.health,
      maxHealth: this.maxHealth,
      finished: this.finished,
      endingType: this.endingType,
      deaths: this.deaths,
      startedAt: this.startedAt,
      savedAt: Date.now(),
      visited: [...this.visited].sort((a, b) => a - b),
      inventory: [...this.inventory.entries()].filter(([, count]) => count > 0),
      achievements: [...this.achievements],
      roomStates: ROOMS.map((room) => {
        const state = this.getRoomState(room.id);
        return {
          roomId: room.id,
          visited: state.visited,
          collected: [...state.collected],
          puzzlePlates: [...state.puzzlePlates],
          puzzleSolved: state.puzzleSolved,
          revealedSecrets: [...state.revealedSecrets],
          doors: [...state.doors],
        };
      }),
    };
  }

  getState() {
    return this.serialize();
  }

  restore(raw) {
    if (!raw || typeof raw !== "object") return false;

    this.difficulty = normalizeDifficulty(raw.difficulty);
    this.difficultyData = DIFFICULTY_BY_ID.get(this.difficulty);
    this.maxHealth = Math.max(
      this.difficultyData.maxHealth,
      Number(raw.maxHealth) || this.difficultyData.maxHealth,
    );
    this.health = Math.max(
      1,
      Math.min(this.maxHealth, Number(raw.health) || this.maxHealth),
    );
    this.currentRoom = normalizeRoomId(raw.currentRoom) ?? 1;
    this.finished = Boolean(raw.finished);
    this.endingType = raw.endingType ?? null;
    this.deaths = Number(raw.deaths) || 0;
    this.startedAt = Number(raw.startedAt) || Date.now();

    this.roomStates = new Map(
      ROOMS.map((room) => {
        const saved = Array.isArray(raw.roomStates)
          ? raw.roomStates.find((entry) => Number(entry.roomId) === room.id)
          : null;
        const state = createRoomState(
          room.id,
          Boolean(saved?.visited) || (Array.isArray(raw.visited) && raw.visited.includes(room.id)),
        );
        if (saved) {
          for (const itemId of saved.collected ?? []) {
            if (ITEM_BY_ID.has(itemId) && ITEM_BY_ID.get(itemId).roomId === room.id) {
              state.collected.add(itemId);
            }
          }
          for (const plateIndex of saved.puzzlePlates ?? []) {
            if (Number.isInteger(plateIndex) && plateIndex >= 0 && plateIndex < 3) {
              state.puzzlePlates.add(plateIndex);
            }
          }
          state.puzzleSolved = Boolean(saved.puzzleSolved);
          for (const itemId of saved.revealedSecrets ?? []) {
            if (ITEM_BY_ID.has(itemId) && ITEM_BY_ID.get(itemId).roomId === room.id) {
              state.revealedSecrets.add(itemId);
            }
          }
          for (const door of saved.doors ?? []) state.doors.add(door);
        }
        return [room.id, state];
      }),
    );

    this.inventory = new Map();
    if (Array.isArray(raw.inventory)) {
      for (const entry of raw.inventory) {
        if (Array.isArray(entry)) {
          const [itemId, count] = entry;
          if (ITEM_BY_ID.has(itemId) && Number(count) > 0) {
            this.inventory.set(itemId, 1);
          }
        } else if (typeof entry === "string" && ITEM_BY_ID.has(entry)) {
          this.inventory.set(entry, 1);
        }
      }
    }

    for (const itemId of this.inventory.keys()) {
      const item = ITEM_BY_ID.get(itemId);
      if (item) {
        this.getRoomState(item.roomId).collected.add(itemId);
        if (item.conceal === "wall") {
          this.getRoomState(item.roomId).revealedSecrets.add(itemId);
        }
      }
    }

    const visitedFromRooms = [...this.roomStates.entries()]
      .filter(([, state]) => state.visited)
      .map(([id]) => id);
    this.visited = new Set([
      1,
      ...(Array.isArray(raw.visited) ? raw.visited.filter((id) => normalizeRoomId(id)) : []),
      ...visitedFromRooms,
    ]);
    this.getRoomState(1).visited = true;
    this.achievements = new Set(
      Array.isArray(raw.achievements) ? raw.achievements : [],
    );

    return true;
  }

  save() {
    try {
      const payload = JSON.stringify(this.serialize());
      this.storage.setItem(SAVE_KEY, payload);
      this.lastSavedAt = Date.now();
      return true;
    } catch {
      return false;
    }
  }

  autosave() {
    if (!this.autoSave) return false;
    return this.save();
  }

  clear() {
    try {
      this.storage.removeItem(SAVE_KEY);
      return true;
    } catch {
      return false;
    }
  }
}

export function createGame(options = {}) {
  return new Game(options);
}

export function loadGame(options = {}) {
  const storage = options.storage ?? defaultStorage;
  const raw = safeParse(storage.getItem(SAVE_KEY));
  if (!raw || raw.version !== SAVE_VERSION) return null;
  const game = new Game({ ...options, storage, autoSave: options.autoSave ?? true });
  if (!game.restore(raw)) return null;
  game.repairNoSoftlocks();
  return game;
}

export function hasSavedGame(storage = defaultStorage) {
  const raw = safeParse(storage.getItem(SAVE_KEY));
  return Boolean(raw && raw.version === SAVE_VERSION);
}

export function clearSavedGame(storage = defaultStorage) {
  try {
    storage.removeItem(SAVE_KEY);
    memory.delete(SAVE_KEY);
  } catch {
    // Ничего страшного: сохранения могло не быть.
  }
}

export function getSaveMetadata(storage = defaultStorage) {
  const raw = safeParse(storage.getItem(SAVE_KEY));
  if (!raw || raw.version !== SAVE_VERSION) return null;
  return {
    difficulty: normalizeDifficulty(raw.difficulty),
    difficultyName:
      DIFFICULTIES.find((item) => item.id === normalizeDifficulty(raw.difficulty))
        ?.name ?? "",
    currentRoom: normalizeRoomId(raw.currentRoom) ?? 1,
    savedAt: Number(raw.savedAt) || null,
    secrets: Array.isArray(raw.inventory) ? raw.inventory.length : 0,
    keys: Array.isArray(raw.inventory)
      ? raw.inventory.filter((entry) => {
          const id = Array.isArray(entry) ? entry[0] : entry;
          return ITEM_BY_ID.get(id)?.type === "key";
        }).length
      : 0,
  };
}
