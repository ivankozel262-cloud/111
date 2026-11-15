"""Собирает листы шаблонов КЕГЭ для приложения.

Каждый лист — файл tools/kege/NN.html с содержимым (первая строка — <!-- title: ... -->).
Сборка оборачивает его в общую оболочку ниже и пишет trainers/kege-NN.html:
один файл, без внешних ссылок, светлая и тёмная тема, кнопка «Скрыть код».

Запуск из корня репозитория:  python3 tools/kege/build.py
Новый лист: положить tools/kege/NN.html, запустить сборку, добавить строку в data.js, поднять version.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools' / 'kege'
OUT = ROOT / 'trainers'

SHELL = r'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>__TITLE__</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f2f2f7; --card: #ffffff; --ink: #1c1c1e; --muted: #6c6c70; --line: #e5e5ea; --soft: #f2f2f7;
    --r: 16px; --ease: cubic-bezier(.2, .8, .2, 1);
    --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #000000; --card: #1c1c1e; --ink: #f2f2f7; --muted: #98989f; --line: #38383a; --soft: #2c2c2e; }
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: var(--bg); color: var(--ink); }
  body { font: 16px/1.45 -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
  button { font: inherit; color: inherit; background: none; border: 0; padding: 0; margin: 0; cursor: pointer; touch-action: manipulation; }
  b { font-weight: 700; }
  p { margin: 0 0 8px; }

  .page { max-width: 680px; margin: 0 auto; padding: 12px 16px 40px; padding-bottom: max(40px, env(safe-area-inset-bottom)); }
  .head { margin: 4px 2px 12px; }
  .kicker { font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
  h1 { font-size: 26px; line-height: 1.15; margin: 4px 0 6px; font-weight: 700; letter-spacing: -.01em; }
  .meta { font-size: 14px; color: var(--muted); }

  .bar { position: sticky; top: 0; z-index: 5; margin: 0 -16px; padding: 8px 16px; background: var(--bg); }
  .switch { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;
            padding: 12px 14px; border-radius: var(--r); background: var(--card); text-align: left; }
  .switch .t { font-weight: 600; }
  .switch .s { display: block; font-size: 13px; color: var(--muted); font-weight: 400; }
  .knob { flex: none; width: 51px; height: 31px; border-radius: 16px; background: var(--line); position: relative; transition: background-color .25s var(--ease); }
  .knob::after { content: ""; position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff;
                 box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .25s var(--ease); }
  .switch[aria-checked="true"] .knob { background: #34c759; }
  .switch[aria-checked="true"] .knob::after { transform: translateX(20px); }

  .card { background: var(--card); border-radius: var(--r); padding: 14px; margin-top: 12px; }
  .sec-h { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .sec-h h2 { flex: 1; font-size: 17px; line-height: 1.25; margin: 0; font-weight: 700; }
  .letter { flex: none; min-width: 30px; height: 30px; padding: 0 4px; display: grid; place-items: center;
            border: 2px solid var(--ink); border-radius: 9px; font-weight: 800; font-size: 16px; }
  .letter.mono { font-family: var(--mono); font-size: 13px; }
  .tag { flex: none; font-size: 10.5px; font-weight: 800; letter-spacing: .08em; border: 1.5px solid var(--ink); border-radius: 6px; padding: 2px 6px; }
  .tag.soft { font-weight: 600; border-width: 1px; color: var(--muted); border-color: var(--muted); }
  .sub-h { font-weight: 700; margin: 12px 0 6px; }
  .note { font-size: 14px; color: var(--muted); margin: 10px 0 0; }

  .q { border-top: 1px solid var(--line); padding: 8px 0 4px; }
  .q-h { font-weight: 700; margin-bottom: 4px; }
  .q-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; padding: 4px 0; font-size: 15px; }
  .q-row > span:first-child { flex: 1 1 220px; color: var(--muted); }
  .q-row > span:last-child { flex: 0 1 auto; }

  code { font-family: var(--mono); font-size: .86em; background: var(--soft); border-radius: 5px; padding: 1px 4px; white-space: nowrap; }
  pre.code { margin: 0; font-family: var(--mono); font-size: 12.5px; line-height: 1.55; background: var(--soft); border-radius: 12px;
             padding: 10px 12px; overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: pre; tab-size: 4; }
  pre.code i { font-style: italic; color: var(--muted); }
  pre.code b { font-weight: 800; }

  .cb { position: relative; margin: 0 0 10px; }
  .cb .cover { display: none; }
  .hide .cb:not(.open) pre.code { color: transparent; user-select: none; -webkit-user-select: none; }
  .hide .cb:not(.open) pre.code i { color: transparent; }
  .hide .cb:not(.open) .cover { display: flex; position: absolute; inset: 0; align-items: center; justify-content: center; text-align: center;
                                padding: 10px; border-radius: 12px; border: 1.5px dashed var(--muted); color: var(--muted); font-size: 15px; }
  .hide .cb.open::after { content: "нажми ещё раз, чтобы скрыть"; display: block; font-size: 12px; color: var(--muted); margin-top: 4px; text-align: right; }
  .hide .cb { cursor: pointer; }

  ul.notes, ol.rules { margin: 0 0 8px; padding-left: 20px; }
  ul.notes li, ol.rules li { margin-bottom: 6px; }

  .tbl { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 14.5px; }
  th, td { text-align: left; vertical-align: top; padding: 7px 8px 7px 0; border-bottom: 1px solid var(--line); }
  thead th { font-size: 13px; color: var(--muted); font-weight: 700; }
  tbody th { font-weight: 700; padding-right: 10px; }
  td code { white-space: normal; }
  table.two td, table.two th { min-width: 96px; }

  .ruler-wrap { overflow-x: auto; margin: 2px 0 10px; }
  table.ruler { width: auto; border-collapse: separate; border-spacing: 3px 0; }
  table.ruler td { border: 0; padding: 0; text-align: center; width: 40px; font-family: var(--mono); }
  table.ruler td.lbl { width: auto; text-align: right; padding-right: 8px; font-family: inherit; font-size: 12px; color: var(--muted); white-space: nowrap; }
  table.ruler tr.chars td:not(.lbl) { border: 2px solid var(--ink); border-radius: 8px; font-size: 19px; font-weight: 700; height: 40px; font-family: inherit; }
  table.ruler tr.pos td:not(.lbl) { font-size: 13px; padding-bottom: 3px; color: var(--muted); }
  table.ruler tr.neg td:not(.lbl) { font-size: 15px; font-weight: 800; padding-top: 3px; }

  .rule { border: 2px solid var(--ink); border-radius: 12px; padding: 10px 12px; margin-top: 10px; }
  .rule p:last-child { margin-bottom: 0; }
  .big-rule { font-weight: 800; font-size: 17px; }
</style>
</head>
<body>
<main class="page" id="page">
__BODY__
</main>
<script>
(function () {
  var KEY = 'kege_tpl_v1';           // общий для всех листов шаблонов: включён ли режим «Скрыть код»
  var page = document.getElementById('page');
  var head = page.querySelector('.head');
  var codes = page.querySelectorAll('pre.code');
  for (var i = 0; i < codes.length; i++) {
    var wrap = document.createElement('div');
    wrap.className = 'cb';
    codes[i].parentNode.insertBefore(wrap, codes[i]);
    wrap.appendChild(codes[i]);
    var cover = document.createElement('div');
    cover.className = 'cover';
    cover.textContent = 'Напиши по памяти, потом нажми — сверить';
    wrap.appendChild(cover);
    wrap.addEventListener('click', function () {
      if (page.classList.contains('hide')) this.classList.toggle('open');
    });
  }
  var bar = document.createElement('div');
  bar.className = 'bar';
  bar.innerHTML = '<button type="button" class="switch" role="switch" aria-checked="false">' +
    '<span><span class="t">Скрыть код</span><span class="s">проверка себя: пишешь шаблон сам, потом открываешь</span></span>' +
    '<span class="knob" aria-hidden="true"></span></button>';
  head.parentNode.insertBefore(bar, head.nextSibling);
  var sw = bar.firstChild;
  function set(on) {
    page.classList.toggle('hide', on);
    sw.setAttribute('aria-checked', String(on));
    var open = page.querySelectorAll('.cb.open');
    for (var j = 0; j < open.length; j++) open[j].classList.remove('open');
  }
  var saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) {}
  set(saved);
  sw.addEventListener('click', function () {
    var on = !page.classList.contains('hide');
    set(on);
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
  });
})();
</script>
</body>
</html>
'''


def build():
    made = []
    for src in sorted(SRC.glob('[0-9][0-9].html')):
        text = src.read_text(encoding='utf-8')
        m = re.match(r'\s*<!--\s*title:\s*(.*?)\s*-->\s*', text)
        if not m:
            raise SystemExit(src.name + ': первая строка должна быть <!-- title: ... -->')
        body = text[m.end():].rstrip() + '\n'
        out = OUT / ('kege-' + src.stem + '.html')
        out.write_text(SHELL.replace('__TITLE__', m.group(1)).replace('__BODY__', body), encoding='utf-8')
        made.append(out.relative_to(ROOT).as_posix())
    return made


if __name__ == '__main__':
    for f in build():
        print('ok', f)
