import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HAZARD_KINDS,
  getHazardState,
} from "../src/hazards.js";
import { ROOMS } from "../src/content.js";

const ADVANCED_KINDS = ["blade", "flame", "sandstorm", "fallingStone"];

describe("новые виды препятствий", () => {
  it("поддерживает шипы, лаву и четыре новых типа ловушек", () => {
    for (const kind of ["spikes", "lava", ...ADVANCED_KINDS]) {
      assert.ok(HAZARD_KINDS.includes(kind), `Нет типа ловушки ${kind}`);
    }
  });

  it("размещает новые ловушки в комнатах", () => {
    const usedKinds = new Set();

    for (const room of ROOMS) {
      assert.ok(room.hazards.length >= 2, `В комнате ${room.id} мало ловушек`);
      for (const hazard of room.hazards) usedKinds.add(hazard.kind);
    }

    for (const kind of ADVANCED_KINDS) {
      assert.equal(usedKinds.has(kind), true, `Тип ${kind} не встречается в игре`);
    }
  });

  it("включает и выключает пламя по циклу", () => {
    const flame = {
      kind: "flame",
      x: 200,
      y: 500,
      w: 30,
      h: 100,
      period: 2.4,
      phase: 0,
      dutyCycle: 0.48,
    };

    const active = getHazardState(flame, 0.2);
    const idle = getHazardState(flame, 1.6);

    assert.equal(active.active, true);
    assert.equal(idle.active, false);
    assert.equal(active.bounds.w, 30);
  });

  it("двигает качающийся клинок и падающий камень", () => {
    const blade = {
      kind: "blade",
      pivotX: 640,
      pivotY: 120,
      length: 230,
      speed: 1.1,
      phase: 0,
      w: 48,
      h: 48,
    };
    const stone = {
      kind: "fallingStone",
      x: 800,
      y: 80,
      w: 54,
      h: 54,
      period: 3,
      phase: 0,
      floorY: 650,
    };

    const bladeA = getHazardState(blade, 0.1);
    const bladeB = getHazardState(blade, 0.9);
    const stoneA = getHazardState(stone, 0.1);
    const stoneB = getHazardState(stone, 1.1);

    assert.notEqual(bladeA.bounds.x, bladeB.bounds.x);
    assert.notEqual(stoneA.bounds.y, stoneB.bounds.y);
    assert.equal(bladeA.active, true);
    assert.equal(stoneA.active, true);
  });

  it("заставляет песчаный вихрь двигаться по комнате", () => {
    const storm = {
      kind: "sandstorm",
      x: 300,
      y: 500,
      w: 80,
      h: 140,
      range: 170,
      speed: 0.8,
      phase: 0,
    };

    const first = getHazardState(storm, 0);
    const second = getHazardState(storm, 1.2);

    assert.equal(first.active, true);
    assert.notEqual(first.bounds.x, second.bounds.x);
    assert.equal(first.bounds.w, 80);
  });
});
