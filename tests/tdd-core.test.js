import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearSavedGame,
  createGame,
  loadGame,
  SAVE_KEY,
} from "../src/game.js";
import { ITEM_BY_ID, ROOMS } from "../src/content.js";

beforeEach(() => {
  clearSavedGame();
});

describe("система возвращения и сохранения прогресса", () => {
  it("позволяет вернуться за пропущенным ключом", () => {
    const game = createGame();

    game.enterRoom(3);
    game.leaveItem("golden-key");

    game.enterRoom(4);
    game.enterRoom(3);

    assert.equal(game.roomHasItem("golden-key"), true);

    game.collectItem("golden-key");

    assert.equal(game.inventoryHas("golden-key"), true);
  });

  it("сохраняет незабранный предмет в предыдущей комнате", () => {
    const game = createGame();

    game.enterRoom(5);
    game.leaveItem("ancient-key");

    game.enterRoom(6);
    game.enterRoom(5);

    assert.equal(game.roomHasItem("ancient-key"), true);
  });

  it("не создает повторно уже собранный предмет", () => {
    const game = createGame();

    game.enterRoom(3);
    game.collectItem("golden-key");

    game.enterRoom(4);
    game.enterRoom(3);

    assert.equal(game.roomHasItem("golden-key"), false);
    assert.equal(game.inventoryCount("golden-key"), 1);
  });

  it("восстанавливает незабранные предметы после загрузки", () => {
    const game = createGame();

    game.enterRoom(3);
    game.leaveItem("golden-key");
    game.save();

    const restoredGame = loadGame();

    restoredGame.enterRoom(3);

    assert.equal(restoredGame.roomHasItem("golden-key"), true);
  });

  it("восстанавливает инвентарь, комнаты и сложность после перезагрузки", () => {
    const game = createGame({ difficulty: "nightmare" });
    game.enterRoom(8);
    game.collectItem("room-8-key");
    game.enterRoom(9);
    game.collectItem("room-9-relic-1");
    game.save();

    const restored = loadGame();

    assert.equal(restored.difficulty, "nightmare");
    assert.equal(restored.currentRoom, 9);
    assert.equal(restored.inventoryHas("room-8-key"), true);
    assert.equal(restored.inventoryCount("room-9-relic-1"), 1);
    assert.equal(restored.hasVisited(8), true);
    assert.equal(restored.hasVisited(9), true);
  });

  it("не сбрасывает найденные предметы после поражения и возрождения", () => {
    const game = createGame();
    game.enterRoom(2);
    const key = ROOMS[1].items.find((item) => item.type === "key");
    game.collectItem(key.id);

    game.setHealth(0);
    game.respawn();

    assert.equal(game.inventoryHas(key.id), true);
    assert.equal(game.currentRoom, 2);
    assert.equal(game.health, game.maxHealth);
  });

  it("сохраняет решенную загадку и открытую дверь", () => {
    const game = createGame();
    game.enterRoom(4);

    const puzzle = ROOMS[3].puzzle;
    puzzle.plates.forEach((_, index) => game.touchPuzzlePlate(4, index));

    assert.equal(game.isPuzzleSolved(4), true);
    assert.equal(game.roomHasItem(puzzle.hiddenItemId), true);

    game.enterRoom(5);
    game.enterRoom(4);

    assert.equal(game.isPuzzleSolved(4), true);
    assert.equal(game.roomHasItem(puzzle.hiddenItemId), true);
  });

  it("позволяет путешествовать по карте только в посещенные комнаты", () => {
    const game = createGame();
    game.enterRoom(2);
    game.enterRoom(7);

    assert.equal(game.travelTo(2), true);
    assert.equal(game.currentRoom, 2);
    assert.equal(game.travelTo(15), false);
    assert.equal(game.currentRoom, 2);
  });

  it("показывает статусы комнат на карте", () => {
    const game = createGame();

    assert.equal(game.roomStatus(1), "partial");
    assert.equal(game.roomStatus(2), "unvisited");

    for (const [index] of ROOMS[0].puzzle.plates.entries()) {
      game.touchPuzzlePlate(1, index);
    }
    const wallSecret = ROOMS[0].items.find((item) => item.conceal === "wall");
    game.revealSecret(1, wallSecret.id);
    for (const item of ROOMS[0].items) {
      game.collectItem(item.id);
    }

    assert.equal(game.roomStatus(1), "complete");
    assert.equal(game.secretPercent(), 5);
  });

  it("не теряет предмет, если игрок покинул комнату до сбора", () => {
    const game = createGame();
    const key = ITEM_BY_ID.get("golden-key");

    game.enterRoom(3);
    game.enterRoom(4);
    game.enterRoom(19);
    game.enterRoom(3);

    assert.equal(game.roomHasItem(key.id), true);
    assert.equal(game.collectedCount(), 0);
  });

  it("сохраняет все 20 комнат доступными после первого посещения", () => {
    const game = createGame();
    for (let roomId = 1; roomId <= 20; roomId += 1) {
      game.enterRoom(roomId);
    }

    for (let roomId = 1; roomId <= 20; roomId += 1) {
      assert.equal(game.hasVisited(roomId), true);
      assert.equal(game.travelTo(roomId), true);
      assert.equal(game.currentRoom, roomId);
    }
  });

  it("автоматически восстанавливает обязательный ключ в поврежденном сохранении", () => {
    const data = new Map();
    const storage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key),
    };

    const game = createGame({ storage });
    game.enterRoom(3);
    game.collectItem("golden-key");
    game.save();

    const damaged = JSON.parse(storage.getItem(SAVE_KEY));
    damaged.inventory = [];
    storage.setItem(SAVE_KEY, JSON.stringify(damaged));

    const restored = loadGame({ storage });

    assert.equal(restored.inventoryHas("golden-key"), true);
    assert.equal(restored.validateNoSoftlocks().ok, true);
  });
});
