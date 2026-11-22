import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

function stringsWithCyrillic(text) {
  const results = [];
  const pattern = /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const match of text.matchAll(pattern)) {
    const value = match[2];
    if (/[А-Яа-яЁё]/.test(value)) results.push(value);
  }
  return results;
}

function visiblePart(value) {
  return value.replace(/\$\{[\s\S]*?\}/g, " ");
}

describe("русификация динамического интерфейса", () => {
  it("не смешивает кириллицу и латиницу в строках приложения", () => {
    const values = stringsWithCyrillic(source);
    assert.ok(values.length >= 2);

    for (const value of values) {
      assert.equal(
        /[A-Za-z]/.test(visiblePart(value)),
        false,
        `В видимой строке приложения есть латиница: «${value}»`,
      );
    }
  });

  it("не использует запрещённые английские подписи в русских строках", () => {
    const values = stringsWithCyrillic(source);
    const banned =
      /\b(Start|Continue|Settings|Inventory|Jump|Hint|Victory|Game|Over|Map|Pause|Restart)\b/i;

    for (const value of values) {
      assert.equal(
        banned.test(visiblePart(value)),
        false,
        `Запрещённая английская подпись: «${value}»`,
      );
    }
  });
});
