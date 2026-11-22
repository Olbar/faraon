import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAllDynamicMessageSamples,
  getAllVisibleInterfaceTexts,
  UI_TEXT,
} from "../src/texts.js";
import { ITEMS, ROOMS } from "../src/content.js";

const LATIN = /[A-Za-z]/;
const BANNED_ENGLISH =
  /\b(Start|Continue|Settings|Inventory|Jump|Hint|Victory|Game\s*Over|Level\s*Completed|Restart|Save\s*Game|Loading|Pause|Map|New\s*Game)\b/i;

describe("полная русификация", () => {
  it("не содержит латинских букв ни в одной видимой надписи", () => {
    const texts = getAllVisibleInterfaceTexts();

    assert.ok(texts.length >= 200);
    for (const text of texts) {
      assert.equal(typeof text, "string");
      assert.ok(text.trim().length > 0);
      assert.equal(
        LATIN.test(text),
        false,
        `Латинские буквы в пользовательской надписи: «${text}»`,
      );
    }
  });

  it("не содержит запрещённых английских слов в интерфейсе", () => {
    const texts = [...getAllVisibleInterfaceTexts(), ...getAllDynamicMessageSamples()];

    for (const text of texts) {
      assert.equal(
        BANNED_ENGLISH.test(text),
        false,
        `Английская надпись в интерфейсе: «${text}»`,
      );
    }
  });

  it("переводит все базовые экраны и кнопки", () => {
    const required = {
      newGame: "Новая игра",
      continueGame: "Продолжить",
      settings: "Настройки",
      inventory: "Инвентарь",
      map: "Карта",
      jump: "Прыжок",
      hint: "Подсказка",
      interact: "Взаимодействие",
      gameOver: "Игра окончена",
      roomComplete: "Комната пройдена",
      victory: "Победа",
      restart: "Начать заново",
      saveGame: "Сохранить игру",
      loading: "Загрузка",
      pause: "Пауза",
      mainMenu: "Главное меню",
      achievements: "Достижения",
      tutorial: "Обучение",
    };

    for (const [key, expected] of Object.entries(required)) {
      assert.equal(UI_TEXT[key].includes(expected), true, `Не переведено поле ${key}`);
    }
  });

  it("переводит названия всех 20 комнат", () => {
    for (const room of ROOMS) {
      assert.match(room.name, /^[А-Яа-яЁё0-9 :—«»-]+$/);
      assert.match(room.hint, /[А-Яа-яЁё]/);
      assert.match(room.description, /[А-Яа-яЁё]/);
      assert.ok(getAllVisibleInterfaceTexts().includes(room.name));
    }
  });

  it("переводит все 120 названий предметов и их описания", () => {
    const texts = getAllVisibleInterfaceTexts();

    for (const item of ITEMS) {
      assert.match(item.name, /[А-Яа-яЁё]/);
      assert.match(item.description, /[А-Яа-яЁё]/);
      assert.equal(LATIN.test(item.name), false);
      assert.equal(LATIN.test(item.description), false);
      assert.ok(texts.includes(item.name), `Нет в словаре: ${item.name}`);
    }
  });

  it("проверяет динамические сообщения, подсказки и финальные экраны", () => {
    const samples = getAllDynamicMessageSamples();

    assert.ok(samples.length >= 40);
    assert.ok(samples.some((text) => text.includes("ключ")));
    assert.ok(samples.some((text) => text.includes("Комната")));
    assert.ok(samples.some((text) => text.includes("Победа")));
    assert.ok(samples.some((text) => text.includes("Игра окончена")));
    assert.ok(samples.some((text) => text.includes("Сохранено")));
  });

  it("не оставляет английских надписей в разметке страницы", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const visible = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ");

    assert.ok(visible.trim().length > 50);
    assert.equal(LATIN.test(visible), false, "В видимой разметке остались латинские буквы");
  });
});
