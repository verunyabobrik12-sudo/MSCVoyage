#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

PORT=8080
URL="http://localhost:$PORT"

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL"
  fi
}

( sleep 1; open_browser ) &

if node --version >/dev/null 2>&1; then
  echo "Запускаю сервер на $URL ..."
  PORT="$PORT" node tools/serve.mjs
elif python3 --version >/dev/null 2>&1; then
  echo "Node.js не найден, пробую через Python..."
  python3 -m http.server "$PORT"
elif python --version >/dev/null 2>&1; then
  echo "Node.js не найден, пробую через Python..."
  python -m http.server "$PORT"
else
  echo "Не найден ни Node.js, ни Python."
  echo "Установите Node.js (https://nodejs.org) или Python (https://python.org) — достаточно одного из них."
  exit 1
fi
