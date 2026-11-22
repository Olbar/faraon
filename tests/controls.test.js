import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPlayer } from "../src/player.js";
import { TouchControls } from "../src/touch-controls.js";
import { DIFFICULTY_BY_ID } from "../src/content.js";

describe("сенсорное управление", () => {
  it("позволяет одновременно двигаться и прыгать", () => {
    const controls = new TouchControls();
    const player = createPlayer();

    controls.press("right");
    controls.press("jump");

    player.update(controls.getInput());

    assert.equal(player.isMovingRight(), true);
    assert.equal(player.isJumping(), true);
  });

  it("поддерживает независимые касания разными пальцами", () => {
    const controls = new TouchControls();

    controls.pointerDown(11, "right");
    controls.pointerDown(12, "jump");

    const input = controls.getInput();
    assert.equal(input.right, true);
    assert.equal(input.jump, true);

    controls.pointerUp(11);
    assert.equal(controls.getInput().right, false);
    assert.equal(controls.getInput().jump, true);
  });

  it("двигает персонажа непрерывно при удержании кнопки", () => {
    const controls = new TouchControls();
    const player = createPlayer({ x: 100, y: 500, onGround: true });
    const startX = player.x;

    controls.press("right");
    for (let index = 0; index < 30; index += 1) {
      player.update(controls.getInput(), 1 / 60);
    }

    assert.ok(player.x > startX + 20);
    assert.equal(player.isMovingRight(), true);
  });

  it("останавливает персонажа после отпускания кнопки", () => {
    const controls = new TouchControls();
    const player = createPlayer({ x: 100, y: 500, onGround: true });

    controls.press("right");
    player.update(controls.getInput(), 1 / 60);
    controls.release("right");
    player.update(controls.getInput(), 1 / 60);

    assert.equal(player.isMovingRight(), false);
    assert.equal(player.vx, 0);
  });

  it("сбрасывает все касания при потере фокуса", () => {
    const controls = new TouchControls();
    controls.press("right");
    controls.press("jump");
    controls.releaseAll();

    const input = controls.getInput();
    assert.equal(input.left, false);
    assert.equal(input.right, false);
    assert.equal(input.jump, false);
    assert.equal(input.interact, false);
  });

  it("применяет выбранную сложность к игроку", () => {
    const easy = createPlayer({ difficulty: DIFFICULTY_BY_ID.get("wanderer") });
    const nightmare = createPlayer({ difficulty: DIFFICULTY_BY_ID.get("cursed") });

    assert.ok(easy.maxHealth > nightmare.maxHealth);
    assert.equal(easy.health, easy.maxHealth);
  });
});
