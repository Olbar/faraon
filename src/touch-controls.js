export const CONTROL_ACTIONS = Object.freeze([
  "left",
  "right",
  "jump",
  "interact",
  "hint",
  "map",
  "inventory",
  "pause",
]);

const ACTION_SET = new Set(CONTROL_ACTIONS);

export class TouchControls {
  constructor() {
    this.direct = new Set();
    this.pointers = new Map();
    this.lastAction = null;
  }

  press(action) {
    if (!ACTION_SET.has(action)) return false;
    this.direct.add(action);
    this.lastAction = action;
    return true;
  }

  release(action) {
    if (!ACTION_SET.has(action)) return false;
    this.direct.delete(action);
    return true;
  }

  toggle(action, pressed) {
    return pressed ? this.press(action) : this.release(action);
  }

  pointerDown(pointerId, action) {
    if (!ACTION_SET.has(action)) return false;
    this.pointers.set(pointerId, action);
    this.lastAction = action;
    return true;
  }

  pointerUp(pointerId) {
    return this.pointers.delete(pointerId);
  }

  pointerCancel(pointerId) {
    return this.pointers.delete(pointerId);
  }

  isPressed(action) {
    if (this.direct.has(action)) return true;
    for (const pointerAction of this.pointers.values()) {
      if (pointerAction === action) return true;
    }
    return false;
  }

  getInput() {
    return {
      left: this.isPressed("left"),
      right: this.isPressed("right"),
      jump: this.isPressed("jump"),
      interact: this.isPressed("interact"),
      hint: this.isPressed("hint"),
      map: this.isPressed("map"),
      inventory: this.isPressed("inventory"),
      pause: this.isPressed("pause"),
    };
  }

  getPointerAction(pointerId) {
    return this.pointers.get(pointerId) ?? null;
  }

  releaseAll() {
    this.direct.clear();
    this.pointers.clear();
    this.lastAction = null;
  }
}

export class KeyboardControls {
  constructor() {
    this.keys = new Set();
  }

  setKey(code, pressed) {
    if (pressed) {
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  releaseAll() {
    this.keys.clear();
  }

  getInput() {
    return {
      left: this.keys.has("ArrowLeft") || this.keys.has("KeyA"),
      right: this.keys.has("ArrowRight") || this.keys.has("KeyD"),
      jump: this.keys.has("Space") || this.keys.has("KeyW"),
      interact: this.keys.has("ArrowUp") || this.keys.has("KeyE") || this.keys.has("Enter"),
      hint: this.keys.has("KeyH") || this.keys.has("KeyG"),
      map: this.keys.has("KeyM") || this.keys.has("KeyV"),
      inventory: this.keys.has("KeyI") || this.keys.has("KeyB"),
      pause:
        this.keys.has("Escape") ||
        this.keys.has("KeyP") ||
        this.keys.has("KeyR"),
    };
  }
}

export class CompositeControls {
  constructor(...sources) {
    this.sources = sources;
  }

  getInput() {
    const result = {
      left: false,
      right: false,
      jump: false,
      interact: false,
      hint: false,
      map: false,
      inventory: false,
      pause: false,
    };

    for (const source of this.sources) {
      const input = source.getInput();
      for (const action of CONTROL_ACTIONS) {
        result[action] = result[action] || Boolean(input[action]);
      }
    }

    return result;
  }

  releaseAll() {
    for (const source of this.sources) {
      if (typeof source.releaseAll === "function") source.releaseAll();
    }
  }
}

export function bindTouchButtons(root, controls, onAction) {
  if (!root) return () => {};

  const activePointers = new Map();
  const cleanups = [];

  const bindButton = (button) => {
    const action = button.dataset.control;
    if (!ACTION_SET.has(action)) return;

    const down = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId ?? 0;
      activePointers.set(pointerId, action);
      controls.pointerDown(pointerId, action);
      button.classList.add("is-pressed");
      button.setAttribute("aria-pressed", "true");
      if (typeof button.setPointerCapture === "function") {
        try {
          button.setPointerCapture(pointerId);
        } catch {
          // Захват указателя недоступен в некоторых браузерах.
        }
      }
      if (action === "jump" || action === "interact") {
        onAction?.(action, "press");
      }
    };

    const up = (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pointerId = event.pointerId ?? 0;
      activePointers.delete(pointerId);
      controls.pointerUp(pointerId);
      if (![...activePointers.values()].includes(action)) {
        button.classList.remove("is-pressed");
        button.setAttribute("aria-pressed", "false");
      }
    };

    const cancel = (event) => {
      const pointerId = event.pointerId ?? 0;
      activePointers.delete(pointerId);
      controls.pointerCancel(pointerId);
      button.classList.remove("is-pressed");
      button.setAttribute("aria-pressed", "false");
    };

    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", cancel);
    button.addEventListener("lostpointercapture", cancel);
    button.addEventListener("contextmenu", (event) => event.preventDefault());

    cleanups.push(() => {
      button.removeEventListener("pointerdown", down);
      button.removeEventListener("pointerup", up);
      button.removeEventListener("pointercancel", cancel);
      button.removeEventListener("lostpointercapture", cancel);
    });
  };

  for (const button of root.querySelectorAll("[data-control]")) {
    bindButton(button);
  }

  const preventGesture = (event) => event.preventDefault();
  document.addEventListener("gesturestart", preventGesture, { passive: false });
  cleanups.push(() => document.removeEventListener("gesturestart", preventGesture));

  return () => {
    for (const cleanup of cleanups) cleanup();
    controls.releaseAll();
  };
}
