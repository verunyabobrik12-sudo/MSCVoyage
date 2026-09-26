# Автотесты в браузере (e2e)

Запускать при работающем сервере (`start.bat` или `node tools/serve.mjs`):

```
node tests/e2e/playthrough.cjs              # вся игра с нуля до финала
node tests/e2e/playthrough.cjs 390 844 phone 2   # то же на размере телефона
node tests/e2e/fixes_test.cjs               # двери, вход в сцену, походка, подсказки, кнопки
node tests/e2e/finale_test.cjs | map_test.cjs | shop_test.cjs
node tests/e2e/ball_cal.cjs | run_test.cjs  # мини-игры бассейна и раннера ботом
node tests/e2e/dir_test.cjs                 # поза героини не дёргается при ходьбе
```

Скриншоты — во временную папку `mscvoyage-e2e` (или `E2E_OUT`). Пути к
Playwright/Chromium — в `pw.cjs` (переменные `PW_PATH`, `PW_CHROME`).
Не запускать два теста параллельно.
