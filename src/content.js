export const WORLD = Object.freeze({
  width: 1280,
  height: 720,
  floorY: 650,
  floorHeight: 70,
});

export const DIFFICULTIES = Object.freeze([
  {
    id: "wanderer",
    name: "Странник",
    epithet: "Тихий шаг",
    level: 1,
    maxHealth: 5,
    damage: 1,
    hazardSpeed: 0.72,
    description:
      "Лёгкое путешествие для тех, кто хочет насладиться историей. Пять сегментов здоровья и мягкие ловушки.",
    accent: "#9fe3c8",
  },
  {
    id: "seeker",
    name: "Искатель",
    epithet: "Зов приключений",
    level: 2,
    maxHealth: 4,
    damage: 1,
    hazardSpeed: 1,
    description:
      "Сбалансированное испытание. Четыре сегмента здоровья и знакомые ловушки пирамиды.",
    accent: "#f0c86a",
  },
  {
    id: "keeper",
    name: "Хранитель",
    epithet: "Тяжёлая ноша",
    level: 3,
    maxHealth: 3,
    damage: 2,
    hazardSpeed: 1.28,
    description:
      "Суровое испытание для знатоков пирамиды. Три сегмента здоровья, а каждая ловушка отнимает вдвое больше сил.",
    accent: "#e39a5c",
  },
  {
    id: "nightmare",
    name: "Проклятый",
    epithet: "Без права на ошибку",
    level: 4,
    maxHealth: 2,
    damage: 2,
    hazardSpeed: 1.62,
    description:
      "Проклятие усиливается. Два сегмента здоровья, безжалостные ловушки, но путь остаётся проходимым.",
    accent: "#d76f76",
  },
]);

export const DIFFICULTY_BY_ID = new Map(DIFFICULTIES.map((item) => [item.id, item]));
export const DEFAULT_DIFFICULTY = "seeker";

const KEY_NAMES = [
  "Ключ рассветного стража",
  "Ключ забытого царя",
  "Золотой ключ",
  "Ключ шёпотов",
  "Древний ключ",
  "Ключ скарабея",
  "Лунный ключ",
  "Ключ песчаного лабиринта",
  "Ключ небесной кузни",
  "Зеркальный ключ",
  "Ключ безмолвия",
  "Костяной ключ",
  "Ключ затмения",
  "Ключ чёрного стекла",
  "Ключ ветров",
  "Ключ проклятого архива",
  "Ключ песочных часов",
  "Змеиный ключ",
  "Царский ключ",
  "Ключ сердца пирамиды",
];

const KEY_IDS = KEY_NAMES.map((_, index) => `room-${index + 1}-key`);
KEY_IDS[2] = "golden-key";
KEY_IDS[4] = "ancient-key";

const RELIC_ADJECTIVES = [
  "Солнечный",
  "Лунный",
  "Нефритовый",
  "Кровавый",
  "Забытый",
  "Звёздный",
  "Медный",
  "Теневой",
  "Хрустальный",
  "Огненный",
];

const RELIC_NOUNS = [
  "скарабей",
  "амулет",
  "сосуд",
  "медальон",
  "свиток",
  "перстень",
  "обелиск",
  "веер",
  "венок",
  "колокол",
];

const RELIC_NAMES = RELIC_ADJECTIVES.flatMap((adjective) =>
  RELIC_NOUNS.map((noun) => `${adjective} ${noun}`),
);

const ROOM_SEEDS = [
  {
    name: "Врата рассвета",
    subtitle: "Первый луч ещё не коснулся песка",
    hint: "Начните с нижнего уступа слева, затем поднимайтесь по камням к солнечному диску. Три печати откроют скрытый тайник.",
    description:
      "Вход в пирамиду освещён золотым светом. На стенах оживают изображения первых жрецов, а под ногами шуршит тёплый песок.",
    palette: ["#261d31", "#5b3740", "#d9a95c", "#ffd889", "#f7e6b5"],
  },
  {
    name: "Зал забытых царей",
    subtitle: "Каменные лики помнят больше, чем люди",
    hint: "Царские платформы высоки, но двойной прыжок поможет добраться до верхнего яруса. Не забудьте про печати у колонн.",
    description:
      "Огромные статуи смотрят в пустоту. Их имена стёрты, но золотые маски всё ещё хранят отблеск былой славы.",
    palette: ["#1d2433", "#4c3c33", "#c9a35c", "#ffcf70", "#ead9a4"],
  },
  {
    name: "Пылающая бездна",
    subtitle: "Здесь камень помнит вкус огня",
    hint: "Прыгайте через лавовые потоки и не задерживайтесь на полу. Безопаснее двигаться по каменным карнизам.",
    description:
      "Раскалённые реки разрезают пол. Воздух дрожит от жара, а на дальней стене мерцает золотой ключ, запертый над бездной.",
    palette: ["#2a1519", "#6a2c22", "#e0834c", "#ffb96a", "#ffd9a0"],
  },
  {
    name: "Коридор шёпота",
    subtitle: "Тишина здесь громче крика",
    hint: "Слушайте шёпот стен: он подсказывает, что верхний тайник открывается только после трёх печатей. Ключ лежит на среднем ярусе.",
    description:
      "Узкий коридор извивается между колоннами. Каждый шаг отзывается шёпотом, а факелы гаснут, стоит отвернуться.",
    palette: ["#1b202b", "#40384f", "#b18bd1", "#e8c8ff", "#d8d2e8"],
  },
  {
    name: "Колодец звёзд",
    subtitle: "Небо упало в каменный колодец",
    hint: "Поднимайтесь по спирали уступов. Древний ключ ждёт на самом высоком камне, а звёздный тайник скрыт печатями.",
    description:
      "В центре зала зияет колодец, на дне которого мерцают звёзды. Свет поднимается вверх и рисует на стенах созвездия.",
    palette: ["#141d2e", "#28365b", "#9cc7ff", "#e3f0ff", "#c5d8f7"],
  },
  {
    name: "Палата скарабеев",
    subtitle: "Миллион лапок в темноте",
    hint: "Скарабеи не любят резких движений. Перепрыгивайте их ряды и собирайте светящиеся реликвии на уступах.",
    description:
      "Стены покрыты живыми узорами из нефритовых скарабеев. Они расступаются перед смельчаком, но смыкаются за его спиной.",
    palette: ["#18261f", "#31513c", "#6fc79a", "#c8ffd9", "#d5e9d9"],
  },
  {
    name: "Сад лунных лилий",
    subtitle: "Цветы раскрываются только во тьме",
    hint: "Лунные лилии растут у печатей. Коснитесь всех трёх, чтобы открыть тайник над водой, и заберите ключ с верхнего уступа.",
    description:
      "Подземный сад цветёт серебряным светом. Лепестки лилий дрожат от каждого шага, а в воде отражается чужая луна.",
    palette: ["#17212f", "#334c5e", "#9bd8e8", "#d6f6ff", "#d7e8ee"],
  },
  {
    name: "Лабиринт песков",
    subtitle: "Песок заметает любые следы",
    hint: "Не пытайтесь идти по прямой: песчаные вихри сбивают с пути. Двигайтесь по платформам и проверяйте каждый ярус.",
    description:
      "Коридоры меняются местами, пока песок течёт сквозь щели. На стенах остаются следы тех, кто уже пытался найти выход.",
    palette: ["#2b2318", "#6b5534", "#d8b46f", "#ffe2a1", "#f0ddb4"],
  },
  {
    name: "Кузница богов",
    subtitle: "Молот бьёт даже в тишине",
    hint: "Раскалённые искры опасны. Кузнечный ключ лежит на наковальне у дальней стены, а верхний тайник открывают печати.",
    description:
      "Горн пылает уже тысячи лет. На наковальне лежат недоделанные короны, а воздух пахнет металлом и грозой.",
    palette: ["#26181a", "#5d3027", "#e0a04f", "#ffd27a", "#f6d9ae"],
  },
  {
    name: "Зеркальный зал",
    subtitle: "Отражения живут своей жизнью",
    hint: "Зеркала показывают ложные уступы. Доверяйте камню под ногами, а не отражению, и соберите три печати.",
    description:
      "Стены из чёрного стекла отражают путника бесконечное число раз. Иногда отражения двигаются чуть раньше оригинала.",
    palette: ["#1d1d2b", "#41415e", "#b4b9e0", "#f1f3ff", "#d6d9ee"],
  },
  {
    name: "Гробница молчания",
    subtitle: "Здесь не произносят имён",
    hint: "Саркофаги служат ступенями. Не задерживайтесь внизу: тишина отнимает силы. Ключ ждёт на среднем ярусе.",
    description:
      "Саркофаги выстроились вдоль стен. На крышках нет ни имён, ни лиц — только знак закрытого рта.",
    palette: ["#1c1c22", "#3d3a43", "#9f98a8", "#e0dbe5", "#d2ccd5"],
  },
  {
    name: "Мост из костей",
    subtitle: "Каждый шаг отзывается эхом",
    hint: "Костяной мост узок. Перепрыгивайте провалы и собирайте реликвии по краям, чтобы не упасть в тёмную воду.",
    description:
      "Мост собран из исполинских рёбер. Внизу клубится туман, и кажется, будто кости дышат под ногами.",
    palette: ["#20201d", "#4d493f", "#c8b98f", "#f7e9c0", "#e7dfc8"],
  },
  {
    name: "Чертог затмения",
    subtitle: "Солнце здесь погасло навсегда",
    hint: "Свет факелов выхватывает только часть пути. Прыгайте по тёмным уступам и разбудите все три печати.",
    description:
      "Чёрное солнце застыло под потолком. Его корона медленно вращается, отбрасывая длинные тени на каждый камень.",
    palette: ["#1a1425", "#3b2850", "#a26ad6", "#f0c7ff", "#d8c7e8"],
  },
  {
    name: "Озеро чёрного стекла",
    subtitle: "Вода отражает не тебя",
    hint: "Чёрное стекло обжигает. Передвигайтесь по обсидиановым плитам, а ключ забирайте с дальнего карниза.",
    description:
      "Озеро неподвижно, как полированный камень. В его глубине светится чужой город, которого нет на картах.",
    palette: ["#151c26", "#2b3a4c", "#74a8b8", "#c5f1f5", "#c6d9dd"],
  },
  {
    name: "Лестница ветров",
    subtitle: "Ветер вырезал ступени из скалы",
    hint: "Порывы ветра меняют траекторию прыжка. Двигайтесь против ветра и не отпускайте кнопку движения раньше времени.",
    description:
      "Ступени уходят вверх, в холодную синеву. Ветер несёт обрывки молитв и запах далёких дождей.",
    palette: ["#17232c", "#345361", "#8cc7cf", "#d7fbff", "#d0e7ea"],
  },
  {
    name: "Проклятый архив",
    subtitle: "Свитки помнят запретные слова",
    hint: "Стеллажи сдвигаются, когда вы отворачиваетесь. Запоминайте путь и открывайте тайник тремя печатями.",
    description:
      "Тысячи свитков лежат в каменных ячейках. Некоторые шевелятся, будто пытаются дописать себя сами.",
    palette: ["#241d1c", "#513e35", "#c79b68", "#ffe1b0", "#e8d3b8"],
  },
  {
    name: "Песочные часы",
    subtitle: "Время здесь течёт в обе стороны",
    hint: "Песок ускоряет падение. Прыгайте заранее и не ждите последнего мгновения, чтобы добраться до ключа.",
    description:
      "Огромные часы встроены в стену. Песок в них течёт вверх, а тени на полу растут с каждым ударом сердца.",
    palette: ["#2d2519", "#6d5832", "#d9b96b", "#ffeba8", "#f2e1b8"],
  },
  {
    name: "Логово змея",
    subtitle: "Чешуя блестит в темноте",
    hint: "Змеиные кольца образуют уступы. Двигайтесь быстро и забирайте ключ с верхнего кольца, пока хвост не сомкнулся.",
    description:
      "Исполинский змей спит, обвив колонны. Его дыхание поднимает пыль, а чешуя отливает нефритом и золотом.",
    palette: ["#18241f", "#35513a", "#89c983", "#e0ffc2", "#d9ebcf"],
  },
  {
    name: "Тронный зал",
    subtitle: "Трон ждёт нового правителя",
    hint: "Царский ключ лежит у подножия трона. Поднимитесь по ступеням, но не пропустите верхние тайники.",
    description:
      "Зал поражает размахом. На троне из чёрного камня лежит корона, а за спиной статуи пылает золотой портал.",
    palette: ["#241b18", "#5a3b2b", "#e0b45e", "#ffe29a", "#f4e2c1"],
  },
  {
    name: "Сердце пирамиды",
    subtitle: "Последняя дверь ведёт к свободе",
    hint: "Соберите все двадцать ключей, чтобы открыть Врата Вечности. Если ключа не хватает, карта укажет пропущенную комнату.",
    description:
      "В центре пульсирует кристальное сердце пирамиды. За ним стоят Врата Вечности, увитые золотыми змеями.",
    palette: ["#24151d", "#5c2433", "#e0a85a", "#fff0b0", "#ffe6c8"],
  },
];

const BASE_LAYOUTS = [
  {
    platforms: [
      { x: 110, y: 556, w: 250, h: 22 },
      { x: 430, y: 468, w: 210, h: 22 },
      { x: 720, y: 546, w: 230, h: 22 },
      { x: 1010, y: 430, w: 180, h: 22 },
      { x: 560, y: 330, w: 180, h: 22 },
      { x: 270, y: 292, w: 160, h: 22 },
    ],
    hazards: [
      { x: 390, y: 638, w: 170, h: 12, kind: "lava" },
      { x: 980, y: 638, w: 140, h: 12, kind: "spikes" },
      {
        kind: "blade",
        pivotX: 690,
        pivotY: 150,
        length: 260,
        arc: 1.05,
        speed: 0.85,
        phase: 0.4,
        w: 54,
        h: 54,
      },
    ],
    chasms: [
      { x: 150, w: 80 },
      { x: 820, w: 90 },
    ],
    plates: [
      { x: 496, y: 448, w: 44, h: 12 },
      { x: 1064, y: 410, w: 44, h: 12 },
      { x: 596, y: 310, w: 44, h: 12 },
    ],
  },
  {
    platforms: [
      { x: 140, y: 520, w: 200, h: 22 },
      { x: 400, y: 430, w: 180, h: 22 },
      { x: 650, y: 340, w: 190, h: 22 },
      { x: 930, y: 438, w: 200, h: 22 },
      { x: 1050, y: 320, w: 140, h: 22 },
      { x: 700, y: 552, w: 210, h: 22 },
    ],
    hazards: [
      { x: 330, y: 638, w: 150, h: 12, kind: "lava" },
      { x: 540, y: 638, w: 120, h: 12, kind: "spikes" },
      { x: 880, y: 638, w: 110, h: 12, kind: "lava" },
      {
        kind: "flame",
        x: 505,
        y: 548,
        w: 30,
        h: 102,
        period: 2.6,
        phase: 0.2,
        dutyCycle: 0.44,
        speed: 1,
      },
    ],
    chasms: [
      { x: 150, w: 80 },
      { x: 720, w: 80 },
    ],
    plates: [
      { x: 188, y: 500, w: 44, h: 12 },
      { x: 698, y: 320, w: 44, h: 12 },
      { x: 1098, y: 300, w: 44, h: 12 },
    ],
  },
  {
    platforms: [
      { x: 70, y: 470, w: 190, h: 22 },
      { x: 330, y: 560, w: 230, h: 22 },
      { x: 620, y: 470, w: 210, h: 22 },
      { x: 900, y: 560, w: 210, h: 22 },
      { x: 940, y: 360, w: 170, h: 22 },
      { x: 560, y: 300, w: 170, h: 22 },
    ],
    hazards: [
      { x: 290, y: 638, w: 130, h: 12, kind: "spikes" },
      { x: 590, y: 638, w: 160, h: 12, kind: "lava" },
      { x: 1060, y: 638, w: 100, h: 12, kind: "spikes" },
      {
        kind: "sandstorm",
        x: 430,
        y: 478,
        w: 84,
        h: 154,
        range: 165,
        speed: 0.7,
        phase: 0.6,
      },
    ],
    chasms: [
      { x: 170, w: 80 },
      { x: 800, w: 80 },
    ],
    plates: [
      { x: 118, y: 450, w: 44, h: 12 },
      { x: 668, y: 450, w: 44, h: 12 },
      { x: 616, y: 280, w: 44, h: 12 },
    ],
  },
  {
    platforms: [
      { x: 130, y: 560, w: 230, h: 22 },
      { x: 430, y: 500, w: 190, h: 22 },
      { x: 690, y: 410, w: 200, h: 22 },
      { x: 960, y: 500, w: 190, h: 22 },
      { x: 940, y: 310, w: 170, h: 22 },
      { x: 500, y: 280, w: 170, h: 22 },
    ],
    hazards: [
      { x: 380, y: 638, w: 140, h: 12, kind: "lava" },
      { x: 770, y: 638, w: 130, h: 12, kind: "spikes" },
      {
        kind: "fallingStone",
        x: 735,
        y: 68,
        w: 56,
        h: 56,
        period: 3.3,
        phase: 0.8,
        speed: 1,
        floorY: 650,
      },
    ],
    chasms: [
      { x: 180, w: 80 },
      { x: 620, w: 80 },
    ],
    plates: [
      { x: 486, y: 480, w: 44, h: 12 },
      { x: 1006, y: 480, w: 44, h: 12 },
      { x: 546, y: 260, w: 44, h: 12 },
    ],
  },
  {
    platforms: [
      { x: 90, y: 540, w: 210, h: 22 },
      { x: 350, y: 430, w: 170, h: 22 },
      { x: 600, y: 520, w: 200, h: 22 },
      { x: 850, y: 420, w: 180, h: 22 },
      { x: 1080, y: 520, w: 150, h: 22 },
      { x: 720, y: 300, w: 190, h: 22 },
    ],
    hazards: [
      { x: 310, y: 638, w: 100, h: 12, kind: "spikes" },
      { x: 570, y: 638, w: 120, h: 12, kind: "lava" },
      { x: 860, y: 638, w: 120, h: 12, kind: "spikes" },
      {
        kind: "blade",
        pivotX: 560,
        pivotY: 130,
        length: 270,
        arc: 1.05,
        speed: 1.05,
        phase: 0.9,
        w: 50,
        h: 50,
      },
    ],
    chasms: [
      { x: 160, w: 80 },
      { x: 750, w: 80 },
    ],
    plates: [
      { x: 146, y: 520, w: 44, h: 12 },
      { x: 656, y: 500, w: 44, h: 12 },
      { x: 776, y: 280, w: 44, h: 12 },
    ],
  },
];

function mirrorLayout(layout) {
  return {
    platforms: layout.platforms.map((platform) => ({
      ...platform,
      x: WORLD.width - platform.x - platform.w,
    })),
    hazards: layout.hazards.map((hazard) => {
      const mirrored = { ...hazard };
      if (typeof hazard.x === "number") {
        mirrored.x = WORLD.width - hazard.x - hazard.w;
      }
      if (typeof hazard.pivotX === "number") {
        mirrored.pivotX = WORLD.width - hazard.pivotX;
      }
      return mirrored;
    }),
    plates: layout.plates.map((plate) => ({
      ...plate,
      x: WORLD.width - plate.x - plate.w,
    })),
    chasms: layout.chasms.map((chasm) => ({
      ...chasm,
      x: WORLD.width - chasm.x - chasm.w,
    })),
  };
}

function buildFloorSections(chasms) {
  const sections = [];
  let cursor = 0;
  for (const chasm of [...chasms].sort((a, b) => a.x - b.x)) {
    if (chasm.x > cursor) {
      sections.push({
        x: cursor,
        y: WORLD.floorY,
        w: chasm.x - cursor,
        h: WORLD.floorHeight,
        kind: "floor",
      });
    }
    cursor = chasm.x + chasm.w;
  }
  if (cursor < WORLD.width) {
    sections.push({
      x: cursor,
      y: WORLD.floorY,
      w: WORLD.width - cursor,
      h: WORLD.floorHeight,
      kind: "floor",
    });
  }
  return sections;
}

function findSafeClimbX(platform, floors, width, floorHazards = []) {
  const candidates = [];
  const start = platform.x + 18;
  const end = platform.x + platform.w - width - 18;
  for (let x = start; x <= end; x += 18) {
    candidates.push(x);
  }
  candidates.push(platform.x + (platform.w - width) / 2);

  for (const x of candidates) {
    if (x < 102 || x + width > 1178) continue;
    const supported = floors.some(
      (floor) => x >= floor.x + 6 && x + width <= floor.x + floor.w - 6,
    );
    if (!supported) continue;
    if (
      floorHazards.some(
        (hazard) =>
          x < hazard.x + hazard.w + 10 && x + width > hazard.x - 10,
      )
    ) {
      continue;
    }
    return Math.round(x);
  }

  return null;
}

function createClimbables(platforms, floors, chasms, hazards) {
  const ordered = [...platforms].sort((a, b) => a.y - b.y);
  const usedPlatforms = new Set();
  const ladders = [];
  const ropes = [];
  const floorHazards = hazards.filter(
    (hazard) =>
      ["lava", "spikes", "flame"].includes(hazard.kind) &&
      typeof hazard.x === "number",
  );

  const choose = (kind, preferredIndexes, width) => {
    for (const index of preferredIndexes) {
      const platform = ordered[index % ordered.length];
      if (!platform || usedPlatforms.has(platform)) continue;
      const x = findSafeClimbX(platform, floors, width, floorHazards);
      if (x === null) continue;
      if (chasms.some((chasm) => x < chasm.x + chasm.w && x + width > chasm.x)) {
        continue;
      }
      usedPlatforms.add(platform);
      const topY = platform.y - 74;
      return {
        x,
        y: topY,
        w: width,
        h: WORLD.floorY - topY,
        kind,
        topPlatformY: platform.y,
      };
    }
    return null;
  };

  const ladder = choose("ladder", [1, 2, 3, 0, 4, 5], 30);
  const rope = choose("rope", [4, 5, 3, 2, 1, 0], 20);

  if (ladder) ladders.push(ladder);
  if (rope) ropes.push(rope);

  return { ladders, ropes };
}

function itemPosition(platform) {
  return {
    x: Math.round(platform.x + platform.w / 2),
    y: Math.round(platform.y - 30),
  };
}

function itemDescription(type, roomName, itemName) {
  if (type === "key") {
    return `Ключ из комнаты «${roomName}». Одна из двадцати печатей, отпирающих Врата Вечности. ${itemName} помнит тепло жреческого огня.`;
  }
  if (type === "relic") {
    return `Реликвия из комнаты «${roomName}». Древние жрецы верили, что такие вещи хранят память пирамиды и приносят удачу смельчаку.`;
  }
  return `Тайник из комнаты «${roomName}». Его спрятали от чужих глаз тысячи лет назад. Теперь находка пополнит вашу коллекцию секретов.`;
}

export const ROOMS = ROOM_SEEDS.map((seed, index) => {
  const id = index + 1;
  const base = BASE_LAYOUTS[index % BASE_LAYOUTS.length];
  const layout = index % 2 === 1 ? mirrorLayout(base) : base;
  const platforms = [...layout.platforms].sort((a, b) => a.y - b.y);
  const slotPlatforms = [
    platforms.find((platform) => platform.y > 480) ?? platforms[0],
    platforms.find((platform) => platform.y >= 420 && platform.y <= 480) ?? platforms[1],
    platforms.find((platform) => platform.y >= 500) ?? platforms[2],
    platforms.find((platform) => platform.y >= 400 && platform.y < 500) ?? platforms[3],
    platforms.find((platform) => platform.y >= 300 && platform.y < 400) ?? platforms[4],
    platforms.find((platform) => platform.y < 320) ?? platforms[5],
  ];

  const uniquePlatforms = [];
  for (const platform of slotPlatforms) {
    if (!uniquePlatforms.includes(platform)) {
      uniquePlatforms.push(platform);
    }
  }
  for (const platform of platforms) {
    if (uniquePlatforms.length >= 6) {
      break;
    }
    if (!uniquePlatforms.includes(platform)) {
      uniquePlatforms.push(platform);
    }
  }

  const chasms = layout.chasms.map((chasm) => ({ ...chasm }));
  const floors = buildFloorSections(chasms);
  const { ladders, ropes } = createClimbables(
    uniquePlatforms,
    floors,
    chasms,
    layout.hazards,
  );

  const itemNames = RELIC_NAMES.slice(index * 5, index * 5 + 5);
  const itemTypes = ["relic", "relic", "secret", "secret", "key"];
  const ids = [
    `room-${id}-relic-1`,
    `room-${id}-relic-2`,
    `room-${id}-secret-1`,
    `room-${id}-secret-2`,
    KEY_IDS[index],
  ];

  const items = itemTypes.map((type, itemIndex) => {
    const platform = uniquePlatforms[itemIndex];
    const position = itemPosition(platform);
    const name = type === "key" ? KEY_NAMES[index] : itemNames[itemIndex];
    const conceal =
      type === "secret" && itemIndex === 2
        ? "faint"
        : type === "secret" && itemIndex === 3
          ? "wall"
          : null;
    const item = {
      id: ids[itemIndex],
      roomId: id,
      type,
      name,
      description: itemDescription(type, seed.name, name),
      ...position,
      hidden: false,
      conceal,
      quality: type === "key" ? "key" : type === "relic" ? "relic" : "secret",
    };

    if (conceal === "wall") {
      const zoneW = 112;
      const zoneH = 108;
      item.revealZone = {
        x: Math.round(Math.min(WORLD.width - zoneW - 8, Math.max(8, item.x - zoneW / 2))),
        y: Math.round(item.y - 72),
        w: zoneW,
        h: zoneH,
      };
    }

    return item;
  });

  const hiddenPosition = itemPosition(uniquePlatforms[5]);
  const hiddenItem = {
    id: `room-${id}-secret-3`,
    roomId: id,
    type: "secret",
    name: itemNames[4],
    description: itemDescription("secret", seed.name, itemNames[4]),
    ...hiddenPosition,
    hidden: true,
    conceal: null,
    quality: "secret",
  };

  items.push(hiddenItem);

  const connections = [];
  if (id > 1) connections.push(id - 1);
  if (id < 20) connections.push(id + 1);
  if (id === 3) connections.push(7);
  if (id === 5) connections.push(9);
  if (id === 7) connections.push(3);
  if (id === 9) connections.push(5);
  if (id === 10) connections.push(15);
  if (id === 15) connections.push(10);
  if (id === 13) connections.push(18);
  if (id === 18) connections.push(13);

  return {
    id,
    name: seed.name,
    subtitle: seed.subtitle,
    hint: seed.hint,
    description: seed.description,
    palette: seed.palette,
    ordinal: id,
    themeIndex: index,
    platforms: [
      ...uniquePlatforms.map((platform) => ({ ...platform, kind: "stone" })),
      ...floors,
    ].sort((a, b) => a.y - b.y),
    floors,
    chasms,
    ladders,
    ropes,
    climbables: [...ladders, ...ropes],
    hazards: layout.hazards.map((hazard) => ({ ...hazard })),
    puzzle: {
      plates: layout.plates.map((plate, plateIndex) => ({
        ...plate,
        index: plateIndex,
        rune: ["Анх", "Око", "Перо"][plateIndex],
      })),
      hiddenItemId: hiddenItem.id,
      rewardName: "Скрытый тайник",
      solvedText: "Все три печати пробуждены. Скрытый тайник открыт.",
    },
    items,
    connections: [...new Set(connections)].sort((a, b) => a - b),
    start: { x: 90, y: 590 },
    exit: { x: 1202, y: 548, w: 58, h: 102 },
    entrance: { x: 20, y: 548, w: 58, h: 102 },
    finalGate: id === 20
      ? {
          name: "Врата Вечности",
          requiredKeys: 20,
          description:
            "Двадцать замков соединены в один. Только все ключи пирамиды способны повернуть печать и выпустить пленника на свободу.",
        }
      : null,
  };
});

export const ROOM_BY_ID = new Map(ROOMS.map((room) => [room.id, room]));
export const ITEMS = ROOMS.flatMap((room) => room.items);
export const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
export const TOTAL_KEYS = ITEMS.filter((item) => item.type === "key").length;
export const TOTAL_SECRETS = ITEMS.length;
export const TOTAL_ROOMS = ROOMS.length;

export const ACHIEVEMENTS = Object.freeze([
  {
    id: "first-step",
    name: "Первый шаг",
    description: "Войдите в первую комнату пирамиды.",
    condition: (game) => game.hasVisited(1),
    reward: "Пыль веков",
  },
  {
    id: "pathfinder",
    name: "Следопыт",
    description: "Посетите все двадцать комнат.",
    condition: (game) => game.visitedCount() >= 20,
    reward: "Карта пирамиды",
  },
  {
    id: "keykeeper",
    name: "Хранитель ключей",
    description: "Найдите все двадцать ключей.",
    condition: (game) => game.keysFound() >= 20,
    reward: "Печать Вечности",
  },
  {
    id: "collector",
    name: "Собиратель реликвий",
    description: "Найдите сорок реликвий и тайников.",
    condition: (game) => game.collectedCount() >= 40,
    reward: "Нефритовый скарабей",
  },
  {
    id: "archivist",
    name: "Хранитель тайн",
    description: "Соберите шестьдесят секретов.",
    condition: (game) => game.collectedCount() >= 60,
    reward: "Свиток забытых слов",
  },
  {
    id: "perfectionist",
    name: "Полное собрание",
    description: "Найдите все сто двадцать секретов.",
    condition: (game) => game.collectedCount() >= 120,
    reward: "Золотая маска",
  },
  {
    id: "puzzle-master",
    name: "Пробудивший печати",
    description: "Решите загадки в десяти комнатах.",
    condition: (game) => game.solvedPuzzlesCount() >= 10,
    reward: "Око Гора",
  },
  {
    id: "fearless",
    name: "Бесстрашный",
    description: "Завершите игру на сложности «Проклятый».",
    condition: (game) => game.finished && game.difficulty === "nightmare",
    reward: "Корона проклятых",
  },
]);

export const STORY = Object.freeze({
  prologue:
    "Тысячи лет пирамида спала под песками. Теперь её печати ослабли, и проклятие Вечности отпустило пленника лишь наполовину. Чтобы выйти на свободу, нужно собрать двадцать ключей и открыть Врата Вечности.",
  ending:
    "Двадцать ключей вспыхивают одновременно. Врата Вечности рассыпаются золотым песком, и проклятие, державшее тебя тысячи лет, наконец отпускает. Над пирамидой поднимается солнце. Ты свободен — но шёпот древних камней останется с тобой навсегда.",
  endingPerfect:
    "Все сто двадцать секретов пирамиды найдены. Врата Вечности открываются не просто как выход, а как благодарность. Золотой свет выносит тебя к рассвету, а за спиной пирамида впервые за тысячи лет замолкает.",
});
