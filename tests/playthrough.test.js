import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearSavedGame,
  createGame,
  loadGame,
} from "../src/game.js";
import { DIFFICULTIES, ROOMS } from "../src/content.js";

const SKIPPED_ROOMS = [2, 5, 9, 13, 17];

function skipKey(game, roomId) {
  game.enterRoom(roomId);
  const key = ROOMS[roomId - 1].items.find((item) => item.type === "key");
  if (!game.inventoryHas(key.id)) {
    game.leaveItem(key.id);
  }
}

function revealWallSecrets(game, room) {
  for (const item of room.items) {
    if (item.conceal === "wall" && !game.isSecretRevealed(room.id, item.id)) {
      game.revealSecret(room.id, item.id);
    }
  }
}

function collectEverythingExceptSkippedKeys(game) {
  for (const room of ROOMS) {
    game.enterRoom(room.id);
    for (const item of room.items) {
      if (item.type === "key" && SKIPPED_ROOMS.includes(room.id)) {
        continue;
      }
      game.collectItem(item.id);
    }
  }
}

beforeEach(() => {
  clearSavedGame();
});

describe("сквозное прохождение и защита от тупиков", () => {
  it("проходит игру, намеренно пропустив ключи в комнатах 2, 5, 9, 13 и 17, а затем возвращается за ними", () => {
    const game = createGame({ difficulty: "seeker" });

    for (const roomId of SKIPPED_ROOMS) {
      skipKey(game, roomId);
    }

    collectEverythingExceptSkippedKeys(game);

    for (let roomId = 1; roomId <= 20; roomId += 1) {
      game.enterRoom(roomId);
    }

    assert.equal(game.currentRoom, 20);
    assert.equal(game.keysFound(), 15);
    assert.equal(game.canFinish(), false);

    const failed = game.finishGame();
    assert.equal(failed.won, false);
    assert.match(failed.reason, /ключ/i);

    game.save();
    const restored = loadGame();
    assert.equal(restored.currentRoom, 20);
    assert.equal(restored.keysFound(), 15);

    for (const roomId of SKIPPED_ROOMS) {
      assert.equal(restored.travelTo(roomId), true);
      const key = ROOMS[roomId - 1].items.find((item) => item.type === "key");
      assert.equal(restored.roomHasItem(key.id), true, `Ключ комнаты ${roomId} исчез`);
      assert.equal(restored.collectItem(key.id), true);
    }

    assert.equal(restored.keysFound(), 20);
    assert.equal(restored.canFinish(), true);

    const victory = restored.finishGame();
    assert.equal(victory.won, true);
    assert.match(victory.title, /Победа/);
    assert.ok(victory.ending.length > 100);
  });

  it("проходим на всех четырех уровнях сложности", () => {
    for (const difficulty of DIFFICULTIES) {
      clearSavedGame();
      const game = createGame({ difficulty: difficulty.id });

      for (const room of ROOMS) {
        game.enterRoom(room.id);
        for (const [index] of room.puzzle.plates.entries()) {
          game.touchPuzzlePlate(room.id, index);
        }
        revealWallSecrets(game, room);
        for (const item of room.items) {
          game.collectItem(item.id);
        }
      }

      assert.equal(game.collectedCount(), 120);
      assert.equal(game.secretPercent(), 100);
      assert.equal(game.keysFound(), 20);
      assert.equal(game.canFinish(), true);

      const result = game.finishGame();
      assert.equal(result.won, true, `Не завершается сложность ${difficulty.name}`);
      assert.equal(result.stats.secrets, 120);
      assert.equal(result.stats.rooms, 20);
      assert.equal(result.difficulty.id, difficulty.id);
    }
  });

  it("не допускает дублирования предметов при повторном сборе", () => {
    const game = createGame();
    game.enterRoom(6);
    const key = ROOMS[5].items.find((item) => item.type === "key");

    assert.equal(game.collectItem(key.id), true);
    assert.equal(game.collectItem(key.id), false);
    assert.equal(game.inventoryCount(key.id), 1);
    assert.equal(game.collectedCount(), 1);
  });

  it("автоматически подтверждает отсутствие тупиков после пропуска предметов", () => {
    const game = createGame();
    skipKey(game, 2);
    skipKey(game, 5);

    const result = game.validateNoSoftlocks();

    assert.equal(result.ok, true);
    assert.deepEqual(result.issues, []);
    assert.equal(result.repaired, 0);
    assert.equal(result.requiredKeysAvailable, 20);
  });

  it("сохраняет прогресс после смерти во время исследования", () => {
    const game = createGame({ difficulty: "nightmare" });
    game.enterRoom(11);
    const room = ROOMS[10];

    game.collectItem(room.items[0].id);
    game.collectItem(room.items[1].id);
    game.setHealth(0);
    game.respawn();

    assert.equal(game.currentRoom, 11);
    assert.equal(game.inventoryCount(room.items[0].id), 1);
    assert.equal(game.inventoryCount(room.items[1].id), 1);
    assert.equal(game.health, game.maxHealth);
  });

  it("не теряет прогресс после перезагрузки на середине маршрута", () => {
    const game = createGame();
    game.enterRoom(10);
    const room = ROOMS[9];
    for (const [index] of room.puzzle.plates.entries()) {
      game.touchPuzzlePlate(10, index);
    }
    revealWallSecrets(game, room);
    for (const item of room.items) {
      game.collectItem(item.id);
    }
    game.enterRoom(11);
    game.save();

    const restored = loadGame();
    assert.equal(restored.collectedCount(), 6);
    assert.equal(restored.roomStatus(10), "complete");
    assert.equal(restored.roomStatus(11), "partial");
    assert.equal(restored.currentRoom, 11);
  });

  it("финальные врата требуют все 20 ключей и дают полную концовку", () => {
    const game = createGame();
    for (let roomId = 1; roomId <= 20; roomId += 1) {
      game.enterRoom(roomId);
    }

    assert.equal(game.keysFound(), 0);
    assert.equal(game.canFinish(), false);
    assert.equal(game.finishGame().won, false);

    for (const room of ROOMS) {
      game.enterRoom(room.id);
      const key = room.items.find((item) => item.type === "key");
      game.collectItem(key.id);
    }

    assert.equal(game.keysFound(), 20);
    const result = game.finishGame();
    assert.equal(result.won, true);
    assert.equal(result.stats.keys, 20);
  });
});
