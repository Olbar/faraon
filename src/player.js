import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_BY_ID,
  WORLD,
} from "./content.js";

export const PLAYER_SIZE = Object.freeze({ width: 34, height: 54 });
export const PLAYER_PHYSICS = Object.freeze({
  speed: 315,
  jumpVelocity: 720,
  secondJumpVelocity: 650,
  gravity: 1900,
  maxFallSpeed: 1050,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  climbSpeed: 190,
  climbHorizontalSpeed: 105,
  climbDetachTime: 0.28,
});

export class Player {
  constructor(options = {}) {
    const difficulty =
      typeof options.difficulty === "string"
        ? DIFFICULTY_BY_ID.get(options.difficulty)
        : options.difficulty ?? DIFFICULTY_BY_ID.get(DEFAULT_DIFFICULTY);

    this.width = PLAYER_SIZE.width;
    this.height = PLAYER_SIZE.height;
    this.x = options.x ?? 90;
    this.y = options.y ?? 590;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.difficulty = difficulty;
    this.maxHealth = difficulty.maxHealth;
    this.health = options.health ?? this.maxHealth;
    this.onGround = options.onGround ?? true;
    this.jumpsUsed = 0;
    this.jumping = false;
    this.invulnerable = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.previousJump = false;
    this.animationTime = options.animationTime ?? 0;
    this.hurtFlash = 0;
    this.onLadder = false;
    this.climbing = false;
    this.climbable = null;
    this.climbCooldown = 0;
    this.lastSafe = {
      x: this.x,
      y: this.y,
    };
  }

  findClimbable(room) {
    if (!room?.climbables) return null;
    const centerX = this.x + this.width / 2;
    const top = this.y;
    const bottom = this.y + this.height;
    for (const climbable of room.climbables) {
      if (
        centerX >= climbable.x - 12 &&
        centerX <= climbable.x + climbable.w + 12 &&
        bottom >= climbable.y + 6 &&
        top <= climbable.y + climbable.h
      ) {
        return climbable;
      }
    }
    return null;
  }

  update(input = {}, dt = 1 / 60, room = null) {
    const step = Math.min(Math.max(dt, 0), 0.05);
    this.animationTime += step;
    this.climbCooldown = Math.max(0, this.climbCooldown - step);

    const left = Boolean(input.left);
    const right = Boolean(input.right);
    const up = Boolean(input.up);
    const down = Boolean(input.down);
    const direction = (right ? 1 : 0) - (left ? 1 : 0);

    if (direction !== 0) {
      this.vx = direction * PLAYER_PHYSICS.speed;
      this.facing = direction;
    } else {
      this.vx = 0;
    }

    const climbable = room ? this.findClimbable(room) : null;
    this.onLadder = Boolean(climbable);
    this.climbable = climbable;

    const jumpHeld = Boolean(input.jump);
    if (jumpHeld && !this.previousJump) {
      this.jumpBuffer = PLAYER_PHYSICS.jumpBuffer;
    } else {
      this.jumpBuffer = Math.max(0, this.jumpBuffer - step);
    }

    if (this.onGround) {
      this.coyote = PLAYER_PHYSICS.coyoteTime;
    } else {
      this.coyote = Math.max(0, this.coyote - step);
    }

    if (this.jumpBuffer > 0) {
      if (this.climbing) {
        this.detachFromLadder();
        this.performJump(PLAYER_PHYSICS.jumpVelocity);
      } else if (this.onGround || this.coyote > 0) {
        this.performJump(PLAYER_PHYSICS.jumpVelocity);
      } else if (this.jumpsUsed < 2) {
        this.performJump(PLAYER_PHYSICS.secondJumpVelocity);
      }
    }
    this.previousJump = jumpHeld;

    const wantsClimb =
      Boolean(climbable) &&
      this.climbCooldown <= 0 &&
      (up || down || this.climbing);

    if (wantsClimb) {
      this.climbing = true;
      this.onGround = false;
      this.jumping = false;
      this.vy = up ? -PLAYER_PHYSICS.climbSpeed : down ? PLAYER_PHYSICS.climbSpeed : 0;
      this.vx = direction * PLAYER_PHYSICS.climbHorizontalSpeed;
      this.jumpsUsed = 0;
    } else {
      this.climbing = false;
      this.vy = Math.min(
        this.vy + PLAYER_PHYSICS.gravity * step,
        PLAYER_PHYSICS.maxFallSpeed,
      );
    }

    const previousBottom = this.y + this.height;
    this.x += this.vx * step;
    this.y += this.vy * step;

    if (room) {
      const leftLimit = 16;
      const rightLimit = WORLD.width - this.width - 16;
      this.x = Math.max(leftLimit, Math.min(rightLimit, this.x));

      if (this.climbing && climbable) {
        if (this.y < climbable.y) {
          this.y = climbable.y;
          this.vy = 0;
        }
        const ladderBottom = climbable.y + climbable.h;
        if (this.y + this.height >= ladderBottom) {
          this.y = ladderBottom - this.height;
          this.vy = 0;
          this.climbing = false;
          this.onGround = true;
          this.jumpsUsed = 0;
          this.rememberSafePosition(this.x, this.y);
        } else {
          this.onGround = false;
        }
        const stillOnLadder = this.findClimbable(room);
        if (!stillOnLadder) {
          this.climbing = false;
          this.onLadder = false;
        }
      } else {
        let landed = false;
        for (const platform of room.platforms) {
          const horizontalOverlap =
            this.x + this.width > platform.x && this.x < platform.x + platform.w;
          if (!horizontalOverlap || this.vy < 0) continue;

          const platformTop = platform.y;
          const currentBottom = this.y + this.height;
          if (previousBottom <= platformTop + 2 && currentBottom >= platformTop) {
            this.y = platformTop - this.height;
            this.vy = 0;
            this.onGround = true;
            this.jumpsUsed = 0;
            this.jumping = false;
            this.rememberSafePosition(
              Math.max(platform.x + 16, Math.min(platform.x + platform.w - 16, this.x + this.width / 2)) -
                this.width / 2,
              this.y,
            );
            landed = true;
            break;
          }
        }

        if (!landed) {
          this.onGround = false;
        }
      }

      if (this.y + this.height > WORLD.height + 120) {
        this.fallen = true;
      }
    } else {
      this.onGround = false;
    }

    this.invulnerable = Math.max(0, this.invulnerable - step);
    this.hurtFlash = Math.max(0, this.hurtFlash - step);
    return this;
  }

  rememberSafePosition(x, y) {
    if (x < 24 || x > WORLD.width - this.width - 24) return;
    this.lastSafe = { x, y };
  }

  detachFromLadder() {
    this.climbing = false;
    this.onLadder = false;
    this.climbCooldown = PLAYER_PHYSICS.climbDetachTime;
    this.vy = 0;
  }

  isClimbing() {
    return Boolean(this.climbing && this.onLadder);
  }

  performJump(velocity) {
    this.vy = -velocity;
    this.onGround = false;
    this.jumping = true;
    this.jumpsUsed += 1;
    this.jumpBuffer = 0;
    this.coyote = 0;
  }

  queueJump() {
    this.jumpBuffer = PLAYER_PHYSICS.jumpBuffer;
  }

  isMovingRight() {
    return this.vx > 0;
  }

  isMovingLeft() {
    return this.vx < 0;
  }

  isJumping() {
    return Boolean(this.jumping && !this.onGround);
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  damage(amount = 1) {
    if (this.invulnerable > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerable = 1.25;
    this.hurtFlash = 1.25;
    this.vy = Math.min(this.vy, -250);
    return true;
  }

  heal(amount = 1) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  setHealth(value) {
    this.health = Math.max(0, Math.min(this.maxHealth, value));
  }

  setMaxHealth(value) {
    this.maxHealth = Math.max(1, value);
    this.health = Math.min(this.health, this.maxHealth);
  }

  respawn(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.health = this.maxHealth;
    this.onGround = false;
    this.jumpsUsed = 0;
    this.jumping = false;
    this.invulnerable = 1;
    this.hurtFlash = 0;
    this.previousJump = false;
    this.fallen = false;
    this.onLadder = false;
    this.climbing = false;
    this.climbable = null;
    this.climbCooldown = 0;
    this.lastSafe = { x, y };
  }

  resetTo(x, y, options = {}) {
    this.respawn(x, y);
    if (options.keepHealth) {
      this.health = options.health ?? this.health;
    }
  }
}

export function createPlayer(options = {}) {
  return new Player(options);
}
