import { WORLD } from "./content.js";

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function seeded(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawAnkh(ctx, x, y, scale, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -9, 5, 7, 0, 0, TAU);
  ctx.moveTo(0, -2);
  ctx.lineTo(0, 17);
  ctx.moveTo(-8, 4);
  ctx.lineTo(8, 4);
  ctx.stroke();
  ctx.restore();
}

function drawEye(ctx, x, y, scale, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(0, -10, 14, 0);
  ctx.quadraticCurveTo(0, 10, -14, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 3.4, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-13, 8);
  ctx.quadraticCurveTo(-4, 12, 4, 7);
  ctx.stroke();
  ctx.restore();
}

function drawBird(ctx, x, y, scale, color, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-4, -8);
  ctx.lineTo(2, 3);
  ctx.lineTo(9, -6);
  ctx.lineTo(13, 7);
  ctx.stroke();
  ctx.restore();
}

export class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    if (!this.ctx) throw new Error("Браузер не поддерживает холст.");
    this.canvas.width = WORLD.width;
    this.canvas.height = WORLD.height;
    this.particles = [];
    this.ambientDust = this.createDust();
    this.shake = 0;
    this.flash = 0;
    this.flashColor = "255,255,255";
    this.time = 0;
  }

  createDust() {
    const random = seeded(991);
    return Array.from({ length: 46 }, () => ({
      x: random() * WORLD.width,
      y: 90 + random() * 500,
      r: 0.5 + random() * 1.7,
      speed: 2 + random() * 8,
      drift: -4 + random() * 8,
      alpha: 0.08 + random() * 0.3,
      phase: random() * TAU,
    }));
  }

  spawnParticles(x, y, options = {}) {
    const count = options.count ?? 18;
    const colors = options.colors ?? ["#f9e2a4", "#e4bd6b", "#fff6d8"];
    const spread = options.spread ?? 150;
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * TAU;
      const speed = 30 + Math.random() * spread;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 45,
        life: 0.45 + Math.random() * 0.7,
        maxLife: 0.9,
        size: 1.2 + Math.random() * 3.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: options.gravity ?? 120,
        shape: options.shape ?? "spark",
      });
    }
  }

  spawnDustBurst(x, y, count = 10) {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 80,
        vy: -20 - Math.random() * 45,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 3,
        color: "rgba(205, 184, 145, 0.55)",
        gravity: 90,
        shape: "dust",
      });
    }
  }

  setShake(amount = 8) {
    this.shake = Math.max(this.shake, amount);
  }

  setFlash(amount = 0.4, color = "255,255,255") {
    this.flash = Math.max(this.flash, amount);
    this.flashColor = color;
  }

  update(dt) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 34);
    this.flash = Math.max(0, this.flash - dt * 1.6);

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        this.particles.splice(index, 1);
        continue;
      }
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.985;
    }

    for (const mote of this.ambientDust) {
      mote.y -= mote.speed * dt;
      mote.x += mote.drift * dt;
      if (mote.y < 40) {
        mote.y = 620;
        mote.x = Math.random() * WORLD.width;
      }
      if (mote.x < 0) mote.x = WORLD.width;
      if (mote.x > WORLD.width) mote.x = 0;
    }
  }

  render(game, player, options = {}) {
    const ctx = this.ctx;
    const room = game?.room;
    if (!room) return;

    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawBackground(ctx, room, options);
    this.drawArchitecture(ctx, room, options);
    this.drawFloor(ctx, room);
    this.drawPlatforms(ctx, room);
    this.drawHazards(ctx, room, options);
    this.drawPuzzle(ctx, game, room);
    this.drawDoors(ctx, game, room, options);
    this.drawItems(ctx, game, room, options);
    if (player) this.drawPlayer(ctx, player, room, options);
    this.drawAmbientDust(ctx, room);
    this.drawParticles(ctx);
    this.drawForeground(ctx, room);
    ctx.restore();

    if (this.flash > 0.001) {
      ctx.save();
      ctx.globalAlpha = this.flash;
      ctx.fillStyle = `rgba(${this.flashColor}, 1)`;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.restore();
    }
  }

  drawBackground(ctx, room, options) {
    const [bg1, bg2, stone, accent, light] = room.palette;
    const time = this.time;

    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    gradient.addColorStop(0, bg1);
    gradient.addColorStop(0.55, bg2);
    gradient.addColorStop(1, bg1);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    const radial = ctx.createRadialGradient(940, 150, 30, 940, 190, 580);
    radial.addColorStop(0, `${accent}46`);
    radial.addColorStop(0.42, `${stone}18`);
    radial.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    const random = seeded(room.id * 173 + 19);
    ctx.save();
    for (let index = 0; index < 54; index += 1) {
      const x = random() * WORLD.width;
      const y = 30 + random() * 480;
      const radius = 0.4 + random() * 1.45;
      const alpha = 0.08 + random() * 0.24;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const sunX = 950;
    const sunY = 190;
    const sunRadius = 118;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunRadius * 2.5);
    sunGlow.addColorStop(0, `${accent}88`);
    sunGlow.addColorStop(0.32, `${accent}2e`);
    sunGlow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = `${accent}24`;
    ctx.strokeStyle = `${light}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.24;
    for (let ring = 1; ring <= 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius + ring * 16, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 0.7, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const beams = 5;
    for (let index = 0; index < beams; index += 1) {
      const x = 140 + index * 260;
      const beam = ctx.createLinearGradient(x, 0, x + 70, 640);
      beam.addColorStop(0, `${light}12`);
      beam.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 80, 0);
      ctx.lineTo(x + 230, 650);
      ctx.lineTo(x + 110, 650);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const horizon = ctx.createLinearGradient(0, 400, 0, 650);
    horizon.addColorStop(0, "rgba(0,0,0,0)");
    horizon.addColorStop(1, `${bg1}cc`);
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 360, WORLD.width, 290);

    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = `${stone}44`;
    ctx.beginPath();
    ctx.moveTo(0, 610);
    ctx.lineTo(150, 470);
    ctx.lineTo(300, 610);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(860, 610);
    ctx.lineTo(1060, 430);
    ctx.lineTo(1280, 610);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const pulse = 0.5 + Math.sin(time * 0.7) * 0.12;
    ctx.save();
    ctx.globalAlpha = pulse * 0.45;
    ctx.strokeStyle = `${accent}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * (0.94 + Math.sin(time * 0.45) * 0.02), 0, TAU);
    ctx.stroke();
    ctx.restore();

    if (options.preview) {
      const veil = ctx.createLinearGradient(0, 0, 0, WORLD.height);
      veil.addColorStop(0, "rgba(8, 5, 12, 0.12)");
      veil.addColorStop(1, "rgba(8, 5, 12, 0.34)");
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
  }

  drawArchitecture(ctx, room, options) {
    const [, , stone, accent, light] = room.palette;
    const random = seeded(room.id * 97 + 5);

    ctx.save();
    for (let side = 0; side < 2; side += 1) {
      const baseX = side === 0 ? 38 : WORLD.width - 38;
      for (let index = 0; index < 3; index += 1) {
        const x = baseX + (side === 0 ? 1 : -1) * index * 92;
        const y = 80 + index * 12;
        const width = 54 - index * 8;
        const height = 560;
        const columnGradient = ctx.createLinearGradient(x - width / 2, 0, x + width / 2, 0);
        columnGradient.addColorStop(0, `${stone}20`);
        columnGradient.addColorStop(0.42, `${stone}55`);
        columnGradient.addColorStop(0.7, `${stone}2c`);
        columnGradient.addColorStop(1, `${stone}10`);
        ctx.fillStyle = columnGradient;
        ctx.fillRect(x - width / 2, y, width, height);
        ctx.strokeStyle = `${accent}18`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - width / 2 + 3, y + 10, width - 6, height - 30);

        ctx.strokeStyle = `${light}2e`;
        for (let band = 0; band < 9; band += 1) {
          const bandY = y + 32 + band * 54;
          ctx.beginPath();
          ctx.moveTo(x - width / 2 + 6, bandY);
          ctx.lineTo(x + width / 2 - 6, bandY);
          ctx.stroke();
        }

        ctx.fillStyle = `${stone}80`;
        ctx.fillRect(x - width / 2 - 7, y - 10, width + 14, 12);
        ctx.fillRect(x - width / 2 - 7, y + height - 8, width + 14, 12);
      }
    }

    ctx.strokeStyle = `${accent}22`;
    ctx.lineWidth = 1;
    for (let index = 0; index < 6; index += 1) {
      const x = 120 + index * 180;
      ctx.beginPath();
      ctx.moveTo(x, 42);
      ctx.lineTo(x + 56, 42);
      ctx.lineTo(x + 56, 96);
      ctx.stroke();
      drawAnkh(ctx, x + 28, 62, 0.72, `${light}3d`, 0.7);
    }

    const bandY = 590;
    ctx.globalAlpha = 0.12;
    for (let index = 0; index < 9; index += 1) {
      const x = 115 + index * 125;
      if (index % 3 === 0) drawEye(ctx, x, bandY, 0.8, light, 0.3);
      else if (index % 3 === 1) drawBird(ctx, x, bandY, 0.8, light, 0.3);
      else drawAnkh(ctx, x, bandY, 0.85, light, 0.3);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = `${bgFor(room)}cc`;
    ctx.fillRect(0, 0, WORLD.width, 30);
    ctx.strokeStyle = `${accent}22`;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(WORLD.width, 30);
    ctx.stroke();

    ctx.restore();
  }

  drawFloor(ctx, room) {
    const [, , stone, accent, light] = room.palette;
    const y = WORLD.floorY;
    const floorGradient = ctx.createLinearGradient(0, y, 0, WORLD.height);
    floorGradient.addColorStop(0, "#2b242a");
    floorGradient.addColorStop(0.2, "#1d181e");
    floorGradient.addColorStop(1, "#100c12");
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, y, WORLD.width, WORLD.floorHeight);

    ctx.fillStyle = `${stone}66`;
    ctx.fillRect(0, y, WORLD.width, 4);
    ctx.fillStyle = `${light}35`;
    ctx.fillRect(0, y, WORLD.width, 1);

    ctx.strokeStyle = `${accent}26`;
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD.width; x += 82) {
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x - 12, WORLD.height);
      ctx.stroke();
    }
    ctx.strokeStyle = `${stone}44`;
    for (let x = 0; x < WORLD.width; x += 164) {
      const h = 30 + ((x / 82) % 3) * 15;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + 58, y + h + 2);
      ctx.lineTo(x + 72, WORLD.height);
      ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = 0.24;
    for (let index = 0; index < 7; index += 1) {
      const x = 50 + index * 190;
      ctx.fillStyle = `${stone}66`;
      ctx.fillRect(x, y + 8, 52, 3);
    }
    ctx.restore();
  }

  drawPlatforms(ctx, room) {
    const [, , stone, accent, light] = room.palette;
    for (const platform of room.platforms) {
      if (platform.kind === "floor") continue;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 7;
      const gradient = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h);
      gradient.addColorStop(0, "#6a5b4c");
      gradient.addColorStop(0.18, "#493f3c");
      gradient.addColorStop(1, "#211c22");
      ctx.fillStyle = gradient;
      roundedRect(ctx, platform.x, platform.y, platform.w, platform.h, 4);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = `${light}88`;
      ctx.fillRect(platform.x + 4, platform.y, platform.w - 8, 1.5);
      ctx.fillStyle = `${accent}4d`;
      ctx.fillRect(platform.x + 6, platform.y + platform.h - 3, platform.w - 12, 1);

      ctx.strokeStyle = `${stone}55`;
      ctx.lineWidth = 1;
      ctx.strokeRect(platform.x + 2, platform.y + 4, platform.w - 4, platform.h - 8);

      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = `${accent}3a`;
      for (let x = platform.x + 20; x < platform.x + platform.w - 14; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, platform.y + 5);
        ctx.lineTo(x + 7, platform.y + 11);
        ctx.lineTo(x + 3, platform.y + platform.h - 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = `${accent}40`;
      ctx.beginPath();
      ctx.moveTo(platform.x + 12, platform.y + platform.h + 1);
      ctx.lineTo(platform.x + 24, platform.y + platform.h + 1);
      ctx.lineTo(platform.x + 17, platform.y + platform.h + 8);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawHazards(ctx, room, options) {
    const time = this.time * (options.hazardSpeed ?? 1);
    for (const hazard of room.hazards) {
      if (hazard.kind === "lava") {
        const glow = ctx.createLinearGradient(0, hazard.y - 32, 0, hazard.y + 14);
        glow.addColorStop(0, "rgba(255, 129, 51, 0)");
        glow.addColorStop(0.6, "rgba(255, 109, 40, 0.18)");
        glow.addColorStop(1, "rgba(255, 195, 87, 0.4)");
        ctx.fillStyle = glow;
        ctx.fillRect(hazard.x - 10, hazard.y - 34, hazard.w + 20, 50);

        const lava = ctx.createLinearGradient(0, hazard.y, 0, hazard.y + hazard.h);
        lava.addColorStop(0, "#ffd36b");
        lava.addColorStop(0.35, "#f47b33");
        lava.addColorStop(1, "#9f241f");
        ctx.fillStyle = lava;
        ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);

        ctx.save();
        ctx.globalAlpha = 0.75;
        for (let index = 0; index < Math.floor(hazard.w / 26); index += 1) {
          const x = hazard.x + 12 + index * 26;
          const offset = Math.sin(time * 2 + index * 1.7) * 4;
          ctx.fillStyle = index % 3 === 0 ? "#ffe99e" : "#ffb34e";
          ctx.beginPath();
          ctx.arc(x, hazard.y + 3 + offset * 0.3, 2 + (index % 2), 0, TAU);
          ctx.fill();
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "#ffdc8a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = hazard.x; x <= hazard.x + hazard.w; x += 8) {
          const y = hazard.y - 5 + Math.sin(x * 0.07 + time * 3) * 4;
          if (x === hazard.x) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        const spikeCount = Math.max(2, Math.floor(hazard.w / 22));
        ctx.save();
        ctx.shadowColor = "rgba(220, 220, 210, 0.18)";
        ctx.shadowBlur = 8;
        for (let index = 0; index < spikeCount; index += 1) {
          const x = hazard.x + index * (hazard.w / spikeCount);
          const width = hazard.w / spikeCount;
          ctx.fillStyle = index % 2 === 0 ? "#b8b0a4" : "#89837d";
          ctx.beginPath();
          ctx.moveTo(x, hazard.y + hazard.h);
          ctx.lineTo(x + width / 2, hazard.y - 17);
          ctx.lineTo(x + width, hazard.y + hazard.h);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "rgba(255, 247, 222, 0.35)";
          ctx.beginPath();
          ctx.moveTo(x + width / 2, hazard.y - 12);
          ctx.lineTo(x + width / 2 + 2, hazard.y + 2);
          ctx.lineTo(x + width / 2 - 2, hazard.y + 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  drawPuzzle(ctx, game, room) {
    const state = game.getRoomState(room.id);
    for (const plate of room.puzzle.plates) {
      const active = state?.puzzlePlates.has(plate.index);
      const solved = state?.puzzleSolved;
      const glowColor = solved ? "#f9e2a4" : active ? "#79c9b8" : "#7d6a4b";

      ctx.save();
      if (active || solved) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = solved ? 24 : 14;
      }
      ctx.fillStyle = active ? "rgba(121, 201, 184, 0.28)" : "rgba(44, 35, 27, 0.92)";
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.3;
      roundedRect(ctx, plate.x, plate.y, plate.w, plate.h, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = active || solved ? 0.9 : 0.45;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.1;
      const cx = plate.x + plate.w / 2;
      const cy = plate.y + plate.h / 2;
      if (plate.index === 0) drawAnkh(ctx, cx, cy + 2, 0.48, glowColor, 0.9);
      else if (plate.index === 1) drawEye(ctx, cx, cy - 1, 0.53, glowColor, 0.9);
      else drawBird(ctx, cx, cy, 0.54, glowColor, 0.9);
      ctx.restore();

      if (!active) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(this.time * 2 + plate.index) * 0.12;
        ctx.strokeStyle = "#e4bd6b";
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawDoors(ctx, game, room, options) {
    this.drawDoor(ctx, room.entrance, false, room.id > 1, room, options);
    this.drawDoor(ctx, room.exit, true, true, room, options);

    if (room.finalGate) {
      const unlocked = game.canFinish();
      const x = 1125;
      const y = 510;
      ctx.save();
      const glow = ctx.createRadialGradient(x + 38, y + 58, 5, x + 38, y + 58, 130);
      glow.addColorStop(0, unlocked ? "rgba(249, 226, 164, 0.35)" : "rgba(207, 98, 108, 0.15)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 80, y - 90, 260, 260);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = unlocked ? "#f9e2a4" : "#cf626c";
      ctx.fillStyle = unlocked ? "rgba(80, 61, 28, 0.7)" : "rgba(49, 20, 27, 0.72)";
      ctx.lineWidth = 2;
      roundedRect(ctx, x, y, 76, 132, 38);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1;
      roundedRect(ctx, x + 7, y + 7, 62, 118, 31);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(x + 38, y + 66);
      ctx.rotate(unlocked ? Math.sin(this.time) * 0.04 : 0);
      ctx.strokeStyle = unlocked ? "#f9e2a4" : "#d97a83";
      ctx.fillStyle = unlocked ? "rgba(249, 226, 164, 0.18)" : "rgba(207, 98, 108, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * TAU - Math.PI / 2;
        const radius = index % 2 === 0 ? 25 : 14;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.stroke();
      ctx.restore();

      if (!unlocked) {
        ctx.save();
        ctx.translate(x + 38, y + 68);
        ctx.strokeStyle = "#cf626c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -2, 7, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = "#cf626c";
        roundedRect(ctx, -9, -2, 18, 14, 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  drawDoor(ctx, door, isExit, active, room, options) {
    const [bg1, bg2, stone, accent, light] = room.palette;
    const x = door.x;
    const y = door.y;
    ctx.save();

    ctx.fillStyle = "rgba(5, 3, 8, 0.58)";
    roundedRect(ctx, x - 10, y - 14, door.w + 20, door.h + 20, 28);
    ctx.fill();

    ctx.strokeStyle = `${accent}75`;
    ctx.lineWidth = 2;
    roundedRect(ctx, x - 4, y - 4, door.w + 8, door.h + 8, 24);
    ctx.stroke();

    const inside = ctx.createLinearGradient(x, y, x, y + door.h);
    inside.addColorStop(0, isExit ? `${accent}36` : "rgba(4,3,7,0.9)");
    inside.addColorStop(0.5, "rgba(7, 5, 11, 0.94)");
    inside.addColorStop(1, "rgba(4, 2, 6, 0.98)");
    ctx.fillStyle = inside;
    roundedRect(ctx, x + 2, y + 2, door.w - 4, door.h - 4, 21);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = isExit ? 0.36 : 0.16;
    const beam = ctx.createLinearGradient(0, y, 0, y + door.h);
    beam.addColorStop(0, `${light}55`);
    beam.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = beam;
    ctx.fillRect(x + 16, y, door.w - 32, door.h);
    ctx.restore();

    ctx.strokeStyle = `${accent}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + door.w / 2, y + door.h / 2, 15, 0, TAU);
    ctx.stroke();
    drawAnkh(ctx, x + door.w / 2, y + door.h / 2 + 2, 0.55, `${accent}88`, 0.8);

    if (isExit) {
      ctx.fillStyle = `${accent}99`;
      ctx.beginPath();
      ctx.moveTo(x + 17, y + door.h / 2);
      ctx.lineTo(x + 28, y + door.h / 2 - 7);
      ctx.lineTo(x + 28, y + door.h / 2 + 7);
      ctx.closePath();
      ctx.fill();
    } else if (!active) {
      ctx.strokeStyle = `${stone}88`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 18);
      ctx.lineTo(x + door.w - 12, y + door.h - 18);
      ctx.moveTo(x + door.w - 12, y + 18);
      ctx.lineTo(x + 12, y + door.h - 18);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawItems(ctx, game, room, options) {
    for (const item of room.items) {
      if (game.isCollected(item.id)) continue;
      if (item.hidden && !game.isPuzzleSolved(room.id)) continue;
      const time = this.time + item.x * 0.013 + item.y * 0.01;
      const bob = Math.sin(time * 2.1) * 4;
      const cx = item.x;
      const cy = item.y + bob;
      const color = item.type === "key" ? "#f9e2a4" : item.type === "relic" ? "#e4bd6b" : "#79c9b8";

      ctx.save();
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
      glow.addColorStop(0, `${color}88`);
      glow.addColorStop(0.45, `${color}24`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 38, cy - 38, 76, 76);

      ctx.globalAlpha = 0.45 + Math.sin(time * 1.6) * 0.12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 15, 20, 5, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin(time * 1.1) * 0.15);
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.fillStyle = `${color}2c`;
      ctx.lineWidth = 1.7;

      if (item.type === "key") {
        ctx.beginPath();
        ctx.arc(-5, 0, 7, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(19, 0);
        ctx.moveTo(14, 0);
        ctx.lineTo(14, 6);
        ctx.moveTo(19, 0);
        ctx.lineTo(19, 5);
        ctx.stroke();
      } else if (item.type === "relic") {
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(11, 0);
        ctx.lineTo(0, 13);
        ctx.lineTo(-11, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 13);
        ctx.moveTo(-11, 0);
        ctx.lineTo(11, 0);
        ctx.globalAlpha = 0.55;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, TAU);
        ctx.fill();
        ctx.stroke();
        drawEye(ctx, 0, 0, 0.58, color, 0.92);
      }
      ctx.restore();
    }
  }

  drawPlayer(ctx, player, room, options) {
    const time = player.animationTime;
    const speedRatio = Math.min(1, Math.abs(player.vx) / 315);
    const moving = speedRatio > 0.05 && player.onGround;
    const step = moving ? Math.sin(time * 13) : 0;
    const air = !player.onGround;
    const facing = player.facing >= 0 ? 1 : -1;
    const blink = player.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;

    ctx.save();
    if (blink) ctx.globalAlpha = 0.48;

    ctx.save();
    ctx.globalAlpha *= 0.34;
    ctx.fillStyle = "#030205";
    ctx.beginPath();
    ctx.ellipse(player.x + player.width / 2, player.y + player.height + 2, 21, 5.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.translate(player.x + player.width / 2, player.y + player.height);
    ctx.scale(facing, 1);

    if (player.jumping) {
      const flame = 0.6 + Math.sin(time * 12) * 0.2;
      const torchGlow = ctx.createRadialGradient(24, -44, 2, 24, -44, 70);
      torchGlow.addColorStop(0, `rgba(255, 210, 113, ${0.3 * flame})`);
      torchGlow.addColorStop(1, "rgba(255, 168, 74, 0)");
      ctx.fillStyle = torchGlow;
      ctx.fillRect(-50, -100, 150, 150);
    }
    const legSwing = air ? 0.22 : step * 0.36;
    ctx.strokeStyle = "#2b2027";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-4, -18);
    ctx.lineTo(-7 - legSwing * 8, -2);
    ctx.lineTo(-10 - legSwing * 13, 0);
    ctx.moveTo(5, -18);
    ctx.lineTo(7 + legSwing * 8, -2);
    ctx.lineTo(11 + legSwing * 13, 0);
    ctx.stroke();

    ctx.strokeStyle = "#d0a45b";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-9 - legSwing * 13, 0);
    ctx.lineTo(-12 - legSwing * 14, 1);
    ctx.moveTo(11 + legSwing * 13, 0);
    ctx.lineTo(14 + legSwing * 14, 1);
    ctx.stroke();

    const cloak = ctx.createLinearGradient(-18, -48, 17, -10);
    cloak.addColorStop(0, "#426c67");
    cloak.addColorStop(0.5, "#2f514f");
    cloak.addColorStop(1, "#213638");
    ctx.fillStyle = cloak;
    ctx.beginPath();
    ctx.moveTo(-13, -44);
    ctx.quadraticCurveTo(-21, -25, -16, -9);
    ctx.lineTo(-4, -15);
    ctx.lineTo(0, -8);
    ctx.lineTo(5, -15);
    ctx.lineTo(17, -9);
    ctx.quadraticCurveTo(21, -27, 12, -44);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#6a3f31";
    ctx.beginPath();
    ctx.moveTo(-14, -42);
    ctx.quadraticCurveTo(-19, -23, -15, -12);
    ctx.lineTo(-4, -18);
    ctx.lineTo(-2, -37);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#e4bd6b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, -36);
    ctx.quadraticCurveTo(0, -30, 14, -36);
    ctx.stroke();

    ctx.fillStyle = "#c79a62";
    ctx.beginPath();
    ctx.arc(0, -50, 10, 0, TAU);
    ctx.fill();

    ctx.fillStyle = "#2a1b1a";
    ctx.beginPath();
    ctx.arc(0, -54, 10, Math.PI, TAU);
    ctx.lineTo(8, -47);
    ctx.lineTo(-8, -47);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#e4bd6b";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, -54, 9, Math.PI, TAU);
    ctx.stroke();

    ctx.fillStyle = "#1d1618";
    ctx.beginPath();
    ctx.arc(4, -50, 1.1, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "#a8e0d1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, -40);
    ctx.quadraticCurveTo(-21, -38 + Math.sin(time * 9) * 2, -28, -32 + Math.sin(time * 9) * 4);
    ctx.stroke();

    ctx.strokeStyle = "#c79a62";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, -37);
    ctx.lineTo(19, -40);
    ctx.stroke();

    ctx.save();
    ctx.translate(21, -46);
    ctx.rotate(-0.2 + Math.sin(time * 8) * 0.03);
    ctx.strokeStyle = "#8b5a33";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, -22);
    ctx.stroke();

    const flameHeight = 12 + Math.sin(time * 13) * 2.5;
    const flame = ctx.createRadialGradient(0, -29, 1, 0, -29, flameHeight + 6);
    flame.addColorStop(0, "#fff7c9");
    flame.addColorStop(0.35, "#ffd36b");
    flame.addColorStop(0.7, "#f57a32");
    flame.addColorStop(1, "rgba(245, 122, 50, 0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.ellipse(0, -31, 6, flameHeight, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#fff5c0";
    ctx.beginPath();
    ctx.ellipse(0, -30, 2.5, 5 + Math.sin(time * 16) * 1.5, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    if (player.invulnerable > 0.75) {
      ctx.save();
      ctx.globalAlpha = 0.14 + Math.sin(time * 20) * 0.06;
      ctx.fillStyle = "#cf626c";
      ctx.beginPath();
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 34, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawAmbientDust(ctx, room) {
    ctx.save();
    for (const mote of this.ambientDust) {
      ctx.globalAlpha = mote.alpha * (0.72 + Math.sin(this.time * 0.8 + mote.phase) * 0.28);
      ctx.fillStyle = room.palette[4];
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawParticles(ctx) {
    ctx.save();
    for (const particle of this.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      if (particle.shape === "dust") {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 1.8, 0, TAU);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(alpha * 3);
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  drawForeground(ctx, room) {
    ctx.save();
    const vignette = ctx.createRadialGradient(
      WORLD.width / 2,
      WORLD.height / 2,
      260,
      WORLD.width / 2,
      WORLD.height / 2,
      760,
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(4,2,7,0.38)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = room.palette[4];
    ctx.fillRect(0, 0, 3, WORLD.height);
    ctx.fillRect(WORLD.width - 3, 0, 3, WORLD.height);
    ctx.restore();
  }
}

function bgFor(room) {
  return room.palette[0];
}
