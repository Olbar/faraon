import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROOMS, WORLD } from "../src/content.js";

function horizontalGap(a, b) {
  if (a.x + a.w < b.x) return b.x - (a.x + a.w);
  if (b.x + b.w < a.x) return a.x - (b.x + b.w);
  return 0;
}

function reachablePlatforms(room) {
  const platforms = room.platforms.filter((platform) => platform.kind !== "floor");
  const reachable = new Set();
  const queue = [];

  for (const platform of platforms) {
    const rise = WORLD.floorY - platform.y;
    if (rise <= 215) {
      reachable.add(platform);
      queue.push(platform);
    }
  }

  for (const climbable of [...room.ladders, ...room.ropes]) {
    const center = climbable.x + climbable.w / 2;
    for (const platform of platforms) {
      if (center < platform.x || center > platform.x + platform.w) continue;
      if (platform.y !== climbable.topPlatformY) continue;
      if (!reachable.has(platform)) {
        reachable.add(platform);
        queue.push(platform);
      }
    }
  }

  while (queue.length > 0) {
    const current = queue.shift();
    for (const platform of platforms) {
      if (reachable.has(platform)) continue;
      const rise = current.y - platform.y;
      if (rise > 215) continue;
      if (horizontalGap(current, platform) > 340) continue;
      reachable.add(platform);
      queue.push(platform);
    }
  }

  return reachable;
}

function supportingPlatform(room, x, y) {
  return room.platforms.find(
    (platform) =>
      x >= platform.x &&
      x <= platform.x + platform.w &&
      Math.abs(y - platform.y) <= 16,
  );
}

describe("физическая доступность всех предметов", () => {
  it("размещает каждый предмет и каждую печать на достижимом уступе", () => {
    for (const room of ROOMS) {
      const reachable = reachablePlatforms(room);

      for (const item of room.items) {
        const support = supportingPlatform(room, item.x, item.y + 30);
        assert.ok(support, `Предмет ${item.id} висит без уступа`);
        assert.ok(
          reachable.has(support),
          `Уступ предмета ${item.id} недостижим в комнате ${room.id}`,
        );
      }

      for (const plate of room.puzzle.plates) {
        const support = supportingPlatform(room, plate.x + plate.w / 2, plate.y + plate.h);
        assert.ok(support, `Печать ${plate.index} комнаты ${room.id} висит в воздухе`);
        assert.ok(
          reachable.has(support),
          `Печать ${plate.index} комнаты ${room.id} недостижима`,
        );
      }

      assert.ok(
        room.floors.length >= 2,
        "В комнате должны быть края обрыва",
      );

      for (const chasm of room.chasms) {
        assert.ok(
          chasm.w <= 150,
          `Обрыв в комнате ${room.id} слишком широк для прыжка`,
        );
      }
    }
  });
});
