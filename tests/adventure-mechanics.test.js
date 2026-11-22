import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROOM_BY_ID, ROOMS, WORLD } from "../src/content.js";
import {
  clearSavedGame,
  createGame,
  loadGame,
  SAVE_KEY,
} from "../src/game.js";
import { createPlayer } from "../src/player.js";

function putOnFloor(player, x) {
  player.x = x - player.width / 2;
  player.y = WORLD.floorY - player.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
}

beforeEach(() => {
  clearSavedGame();
});

describe("лазание, обрывы и скрытые тайники", () => {
  it("содержит лестницы, канаты и обрывы во всех комнатах", () => {
    for (const room of ROOMS) {
      assert.ok(room.ladders.length >= 1, `В комнате ${room.id} нет лестницы`);
      assert.ok(room.ropes.length >= 1, `В комнате ${room.id} нет каната`);
      assert.ok(room.chasms.length >= 1, `В комнате ${room.id} нет обрыва`);
      assert.ok(room.floors.length >= 2, `В комнате ${room.id} нет края обрыва`);
    }
  });

  it("поднимается по лестнице и останавливается при отпускании", () => {
    const room = ROOM_BY_ID.get(1);
    const ladder = room.ladders[0];
    const player = createPlayer({
      x: ladder.x + ladder.w / 2 - 17,
      y: WORLD.floorY - 54,
      onGround: true,
    });
    const startY = player.y;

    for (let index = 0; index < 30; index += 1) {
      player.update({ up: true }, 1 / 60, room);
    }

    assert.ok(player.y < startY - 30, "Игрок не поднялся по лестнице");
    assert.equal(player.isClimbing(), true);

    const heldY = player.y;
    player.update({}, 1 / 60, room);
    assert.equal(player.vy, 0);
    assert.ok(Math.abs(player.y - heldY) < 2);
  });

  it("спускается по канату", () => {
    const room = ROOM_BY_ID.get(1);
    const rope = room.ropes[0];
    const player = createPlayer({
      x: rope.x + rope.w / 2 - 17,
      y: rope.y + 40,
      onGround: false,
    });

    const startY = player.y;
    for (let index = 0; index < 24; index += 1) {
      player.update({ down: true }, 1 / 60, room);
    }

    assert.ok(player.y > startY + 25, "Игрок не спустился по канату");
  });

  it("прыгает с лестницы и отцепляется от неё", () => {
    const room = ROOM_BY_ID.get(1);
    const ladder = room.ladders[0];
    const player = createPlayer({
      x: ladder.x + ladder.w / 2 - 17,
      y: WORLD.floorY - 54,
      onGround: true,
    });

    player.update({ up: true }, 1 / 60, room);
    assert.equal(player.isClimbing(), true);

    player.update({ jump: true, up: true }, 1 / 60, room);

    assert.equal(player.isClimbing(), false);
    assert.equal(player.isJumping(), true);
  });

  it("падает в обрыв, если не перепрыгнуть провал", () => {
    const room = ROOM_BY_ID.get(1);
    const chasm = room.chasms[0];
    const player = createPlayer({
      x: chasm.x + chasm.w / 2,
      y: WORLD.floorY - 54,
      onGround: true,
    });

    for (let index = 0; index < 140; index += 1) {
      player.update({}, 1 / 60, room);
    }

    assert.equal(player.fallen, true);
  });

  it("не позволяет забрать тайник со стены без осмотра", () => {
    const game = createGame();
    game.enterRoom(1);
    const room = ROOM_BY_ID.get(1);
    const wallSecret = room.items.find((item) => item.conceal === "wall");

    assert.ok(wallSecret, "В комнате нет тайника со стены");
    assert.equal(game.roomHasItem(wallSecret.id), false);
    assert.equal(game.collectItem(wallSecret.id), false);
    assert.equal(game.revealSecret(1, wallSecret.id), true);
    assert.equal(game.roomHasItem(wallSecret.id), true);
    assert.equal(game.collectItem(wallSecret.id), true);
    assert.equal(game.inventoryHas(wallSecret.id), true);
  });

  it("сохраняет найденную нишу после перезагрузки", () => {
    const game = createGame();
    game.enterRoom(2);
    const room = ROOM_BY_ID.get(2);
    const wallSecret = room.items.find((item) => item.conceal === "wall");

    game.revealSecret(2, wallSecret.id);
    game.save();

    const restored = loadGame();
    restored.enterRoom(2);

    assert.equal(restored.isSecretRevealed(2, wallSecret.id), true);
    assert.equal(restored.roomHasItem(wallSecret.id), true);
  });

  it("хранит состояние ниш отдельно для каждой комнаты", () => {
    const game = createGame();
    const room1 = ROOM_BY_ID.get(1);
    const room2 = ROOM_BY_ID.get(2);
    const secret1 = room1.items.find((item) => item.conceal === "wall");
    const secret2 = room2.items.find((item) => item.conceal === "wall");

    game.enterRoom(1);
    game.revealSecret(1, secret1.id);
    game.enterRoom(2);
    game.revealSecret(2, secret2.id);
    game.enterRoom(1);

    assert.equal(game.isSecretRevealed(1, secret1.id), true);
    assert.equal(game.isSecretRevealed(2, secret2.id), true);
    assert.equal(game.isSecretRevealed(1, secret2.id), false);
  });

  it("делает часть секретов малозаметными, но доступными", () => {
    for (const room of ROOMS) {
      const faint = room.items.filter((item) => item.conceal === "faint");
      const wall = room.items.filter((item) => item.conceal === "wall");
      const puzzle = room.items.filter((item) => item.hidden);

      assert.equal(faint.length, 1, `В комнате ${room.id} нет малозаметного тайника`);
      assert.equal(wall.length, 1, `В комнате ${room.id} нет тайника-ниши`);
      assert.equal(puzzle.length, 1, `В комнате ${room.id} нет тайника загадки`);
      assert.ok(wall[0].revealZone, "У тайника-ниши нет зоны осмотра");
    }
  });
});
