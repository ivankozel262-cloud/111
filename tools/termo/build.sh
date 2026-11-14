#!/bin/bash
# Сборка тренажёра «МКТ и термодинамика 7–10» в один офлайн-файл trainers/termo.html.
# Части: 05_style.css, 00_body.html, 10_helpers.js (рисунки, утверждения), 20–50 — генераторы №7–10, 90_engine.js — интерфейс.
# После сборки: node tools/termo/termo-check.mjs (из корня репозитория) и поднять version в data.js.
set -e
cd "$(dirname "$0")"
OUT=${1:-../../trainers/termo.html}
{
printf '%s\n' '<!DOCTYPE html>' '<html lang="ru">' '<head>' '<meta charset="utf-8">' '<meta name="viewport" content="width=device-width, initial-scale=1">' '<title>МКТ и термодинамика 7–10 — тренажёр</title>' '<style>'
cat 05_style.css
printf '%s\n' '</style>' '</head>' '<body>'
cat 00_body.html
echo '<script>'
cat 10_helpers.js 20_n7.js 30_n8.js 40_n9.js 50_n10.js
echo
cat 90_engine.js
printf '%s\n' '</script>' '</body>' '</html>'
} > "$OUT"
wc -c "$OUT"
