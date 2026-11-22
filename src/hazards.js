export const HAZARD_KINDS = Object.freeze([
  "spikes",
  "lava",
  "blade",
  "flame",
  "sandstorm",
  "fallingStone",
]);

const TAU = Math.PI * 2;

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function staticBounds(hazard) {
  return {
    x: hazard.x,
    y: hazard.y,
    w: hazard.w,
    h: hazard.h,
  };
}

/**
 * Возвращает единое состояние ловушки для физики и отрисовки.
 * Время приходит уже с учётом сложности; speed задаёт индивидуальный ритм.
 */
export function getHazardState(hazard, time = 0) {
  const speed = hazard.speed ?? 1;
  const phase = hazard.phase ?? 0;
  const localTime = time * speed + phase;

  if (hazard.kind === "blade") {
    const angle = Math.sin(localTime) * (hazard.arc ?? 1.08);
    const bladeX = hazard.pivotX + Math.sin(angle) * hazard.length;
    const bladeY = hazard.pivotY + Math.cos(angle) * hazard.length;
    return {
      kind: hazard.kind,
      active: true,
      bounds: {
        x: bladeX - hazard.w / 2,
        y: bladeY - hazard.h / 2,
        w: hazard.w,
        h: hazard.h,
      },
      pivotX: hazard.pivotX,
      pivotY: hazard.pivotY,
      bladeX,
      bladeY,
      angle,
      progress: (Math.sin(localTime) + 1) / 2,
    };
  }

  if (hazard.kind === "flame") {
    const period = hazard.period ?? 2.6;
    const dutyCycle = hazard.dutyCycle ?? 0.46;
    const cycle = positiveModulo(localTime, period);
    const active = cycle < period * dutyCycle;
    return {
      kind: hazard.kind,
      active,
      bounds: active ? staticBounds(hazard) : null,
      progress: cycle / period,
      intensity: active ? 1 : 0,
    };
  }

  if (hazard.kind === "sandstorm") {
    const offset = Math.sin(localTime) * (hazard.range ?? 160);
    return {
      kind: hazard.kind,
      active: true,
      bounds: {
        x: hazard.x + offset,
        y: hazard.y,
        w: hazard.w,
        h: hazard.h,
      },
      offset,
      progress: (Math.sin(localTime) + 1) / 2,
    };
  }

  if (hazard.kind === "fallingStone") {
    const period = hazard.period ?? 3.2;
    const cycle = positiveModulo(localTime, period);
    const progress = cycle / period;
    const floorY = hazard.floorY ?? 650;
    const y = hazard.y + progress * (floorY - hazard.y);
    return {
      kind: hazard.kind,
      active: true,
      bounds: {
        x: hazard.x,
        y,
        w: hazard.w,
        h: hazard.h,
      },
      progress,
      impact: progress > 0.86,
    };
  }

  return {
    kind: hazard.kind,
    active: true,
    bounds: staticBounds(hazard),
    progress: positiveModulo(localTime, TAU) / TAU,
  };
}

export function isAdvancedHazard(hazard) {
  return ["blade", "flame", "sandstorm", "fallingStone"].includes(hazard.kind);
}
