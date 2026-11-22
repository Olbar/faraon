import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("контракт разметки и приложения", () => {
  it("содержит все элементы, к которым обращается приложение", () => {
    const referenced = new Set(
      [...app.matchAll(/\$\("#([a-z0-9-]+)"\)/g)].map((match) => match[1]),
    );
    const existing = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
    );

    assert.ok(referenced.size > 30);

    for (const id of referenced) {
      assert.equal(existing.has(id), true, `В разметке нет элемента #${id}`);
    }
  });

  it("содержит все экраны, которые открывает приложение", () => {
    const screens = new Set(
      [...app.matchAll(/openScreen\("([a-z0-9-]+)"/g)].map((match) => match[1]),
    );
    const existing = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]),
    );

    for (const screen of screens) {
      assert.equal(existing.has(screen), true, `В разметке нет экрана #${screen}`);
    }
  });

  it("подключает сенсорные кнопки для всех обязательных действий", () => {
    for (const action of ["left", "right", "jump", "interact"]) {
      assert.match(html, new RegExp(`data-control="${action}"`));
    }
    assert.match(html, /data-ui="map"/);
    assert.match(html, /data-ui="hint"/);
  });
});
