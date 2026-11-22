import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  ITEMS,
  ITEM_BY_ID,
  ROOMS,
  ROOM_BY_ID,
  TOTAL_KEYS,
  TOTAL_SECRETS,
} from "../src/content.js";
import { createGame } from "../src/game.js";
import { WORLD } from "../src/content.js";

const ADVANCED_HAZARDS = new Set(["blade", "flame", "sandstorm", "fallingStone"]);

describe("контент пирамиды", () => {
  it("содержит ровно 20 комнат с уникальными номерами", () => {
    assert.equal(ROOMS.length, 20);
    assert.deepEqual(
      ROOMS.map((room) => room.id),
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    assert.equal(new Set(ROOMS.map((room) => room.name)).size, 20);
  });

  it("содержит ровно 120 секретов по шесть в каждой комнате", () => {
    assert.equal(ITEMS.length, TOTAL_SECRETS);
    assert.equal(TOTAL_SECRETS, 120);
    assert.equal(TOTAL_KEYS, 20);

    for (const room of ROOMS) {
      assert.equal(room.items.length, 6, `В комнате ${room.id} должно быть 6 предметов`);
      assert.equal(room.items.filter((item) => item.type === "key").length, 1);
      assert.equal(room.items.filter((item) => item.type !== "key").length, 5);
      assert.equal(room.puzzle.hiddenItemId, room.items.find((item) => item.hidden).id);
    }
  });

  it("не допускает дублей идентификаторов и названий предметов", () => {
    assert.equal(ITEM_BY_ID.size, ITEMS.length);
    assert.equal(new Set(ITEMS.map((item) => item.name)).size, ITEMS.length);
    assert.equal(new Set(ITEMS.map((item) => item.id)).size, ITEMS.length);
  });

  it("не прячет обязательный ключ за загадкой", () => {
    for (const room of ROOMS) {
      const key = room.items.find((item) => item.type === "key");
      assert.equal(Boolean(key.hidden), false, `Ключ комнаты ${room.id} не должен быть скрыт`);
      assert.equal(Boolean(key.conceal), false, `Ключ комнаты ${room.id} не должен быть спрятан`);
    }
  });

  it("содержит новые препятствия, лестницы, канаты и обрывы", () => {
    let advancedCount = 0;

    for (const room of ROOMS) {
      assert.ok(room.ladders.length >= 1, `В комнате ${room.id} нет лестницы`);
      assert.ok(room.ropes.length >= 1, `В комнате ${room.id} нет каната`);
      assert.ok(room.chasms.length >= 1, `В комнате ${room.id} нет обрыва`);
      assert.ok(room.floors.length >= 2, `В комнате ${room.id} нет сегментов пола`);

      const chasmWidth = room.chasms.reduce((sum, chasm) => sum + chasm.w, 0);
      assert.equal(
        room.floors.reduce((sum, floor) => sum + floor.w, 0) + chasmWidth,
        WORLD.width,
        `Пол и обрывы комнаты ${room.id} не покрывают ширину мира`,
      );

      for (const chasm of room.chasms) {
        assert.ok(chasm.x > 100 && chasm.x + chasm.w < 1180);
        assert.ok(chasm.w >= 60 && chasm.w <= 150, `Слишком широкий обрыв в комнате ${room.id}`);
      }

      for (const climbable of [...room.ladders, ...room.ropes]) {
        assert.equal(climbable.y + climbable.h, WORLD.floorY);
        assert.ok(climbable.x > 100 && climbable.x + climbable.w < 1180);
        assert.ok(climbable.h > 80);
        const blockingHazard = room.hazards.find(
          (hazard) =>
            ["lava", "spikes", "flame"].includes(hazard.kind) &&
            typeof hazard.x === "number" &&
            climbable.x < hazard.x + hazard.w + 10 &&
            climbable.x + climbable.w > hazard.x - 10,
        );
        assert.equal(
          Boolean(blockingHazard),
          false,
          `Лестница или канат комнаты ${room.id} ведёт прямо в ловушку`,
        );
      }

      for (const hazard of room.hazards) {
        if (ADVANCED_HAZARDS.has(hazard.kind)) advancedCount += 1;
      }
    }

    assert.ok(advancedCount >= 20, "Новые ловушки должны встречаться по всей пирамиде");
  });

  it("прячет по одному тайнику в нише и загадке в каждой комнате", () => {
    for (const room of ROOMS) {
      const faint = room.items.filter((item) => item.conceal === "faint");
      const wall = room.items.filter((item) => item.conceal === "wall");
      const puzzle = room.items.filter((item) => item.hidden);

      assert.equal(faint.length, 1);
      assert.equal(wall.length, 1);
      assert.equal(puzzle.length, 1);
      assert.ok(wall[0].revealZone.x > 0);
      assert.ok(wall[0].revealZone.y > 0);
      assert.ok(wall[0].revealZone.w >= 40);
      assert.ok(wall[0].revealZone.h >= 40);
    }
  });

  it("содержит четыре полностью описанные сложности", () => {
    assert.equal(DIFFICULTIES.length, 4);
    assert.equal(new Set(DIFFICULTIES.map((item) => item.id)).size, 4);

    for (const difficulty of DIFFICULTIES) {
      assert.equal(DIFFICULTY_BY_ID.has(difficulty.id), true);
      assert.match(difficulty.name, /[А-Яа-яЁё]/);
      assert.ok(difficulty.maxHealth >= 2);
      assert.ok(difficulty.description.length > 10);
      assert.ok(difficulty.epithet.length > 3);
      assert.ok(difficulty.damage >= 1);
      assert.ok(difficulty.hazardSpeed > 0);
    }
  });

  it("размещает каждый предмет внутри игрового мира", () => {
    for (const room of ROOMS) {
      assert.ok(room.platforms.length >= 6, `В комнате ${room.id} мало платформ`);
      assert.ok(room.hint.length > 15, `В комнате ${room.id} нет подсказки`);
      assert.ok(room.description.length > 15, `В комнате ${room.id} нет описания`);
      assert.ok(room.connections.length >= 1);

      for (const item of room.items) {
        assert.ok(item.x > 0 && item.x < 1280, `Предмет ${item.id} вне мира по X`);
        assert.ok(item.y > 80 && item.y < 650, `Предмет ${item.id} вне мира по Y`);
        assert.equal(item.roomId, room.id);
        assert.equal(ITEM_BY_ID.get(item.id), item);
      }
    }
  });

  it("связывает все комнаты в проходимый маршрут от первой до двадцатой", () => {
    const visited = new Set([1]);
    const queue = [1];

    while (queue.length > 0) {
      const roomId = queue.shift();
      for (const target of ROOM_BY_ID.get(roomId).connections) {
        if (!visited.has(target)) {
          visited.add(target);
          queue.push(target);
        }
      }
    }

    assert.equal(visited.size, 20);
    assert.ok(ROOM_BY_ID.get(20).finalGate);
  });

  it("формирует данные карты с ключами, секретами и закрытым финальным проходом", () => {
    const game = createGame();
    game.enterRoom(3);
    game.collectItem("golden-key");

    const map = game.getMapData();
    assert.equal(map.rooms.length, 20);
    assert.equal(map.totalSecrets, 120);
    assert.equal(map.rooms[2].hasKey, false);
    assert.equal(map.rooms[2].missingSecrets, 5);
    assert.equal(map.rooms[0].status, "partial");
    assert.equal(map.rooms[1].status, "unvisited");
    assert.equal(map.gate.locked, true);
    assert.equal(map.gate.requiredKeys, 20);
    assert.ok(map.connections.length >= 19);
  });
});
