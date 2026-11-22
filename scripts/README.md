# Браузерные проверки

Эти сценарии не входят в `npm test`, потому что им нужен запущенный Chrome с отладочным портом и локальный сервер игры.

1. Запустите игру:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

2. Запустите Chrome в headless-режиме:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' `
  --headless=new `
  --no-sandbox `
  --disable-gpu `
  --remote-debugging-port=9222 `
  --user-data-dir="$PWD\.chrome-e2e" `
  about:blank
```

3. В другом терминале выполните:

```powershell
node scripts/e2e-browser.mjs
node scripts/mechanics-browser.mjs
```

`e2e-browser.mjs` проверяет клавиатуру, прыжок, двойной прыжок, переход между комнатами, карту, сохранение после перезагрузки и одновременное сенсорное управление.

`mechanics-browser.mjs` проверяет сбор всех предметов через сцену, печати, скрытый тайник, поражение, возрождение без потери прогресса и открытие Врат Вечности.

Оба сценария используют отладочный адрес `http://127.0.0.1:4173/?debug=1`. В обычной игре отладочный интерфейс недоступен.
