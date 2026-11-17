"""Собирает trainers/rus-teoriya.html — теорию по орфографии (задания 9–15) для приложения.

Источник — tools/rus/teoriya_9-15.json: блоки, разобранные из PDF «Орфография_ЕГЭ_9-15_теория»
скриптом tools/rus/parse_pdf.py (python3 tools/rus/parse_pdf.py ПУТЬ_К_PDF tools/rus/teoriya_9-15.json).
Правки текста — в JSON или в FIXES ниже; потом из корня репозитория:  python3 tools/rus/build_theory.py
"""
import html as H
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools' / 'rus' / 'teoriya_9-15.json'
OUT = ROOT / 'trainers' / 'rus-teoriya.html'

# Исправления к присланному PDF (версия от 11.10.2026).
FIXES = [
    # 9.1: в «заморозить» проверяемая гласная ударная — проверять нечего. В октябре в PDF заменили на «уговорить».
    ('замор<b>о</b>зить — мор<b>о́</b>з (а не «замора́живать»)',
     'угов<b>о</b>рить — угов<b>о́</b>р (а не «угова́ривать»)'),
]

TITLE_COL = {'Тип', 'Корни', 'Суффиксы', 'Случай', 'Знак', 'Форма', 'Пишем', 'Признак',
             'Обозначение', '№', 'Начало', 'Где', 'Приставка'}


def plain(s):
    return re.sub(r'<[^>]+>', '', s)


def load():
    pages = json.loads(SRC.read_text(encoding='utf-8'))
    blocks = []
    for p in pages:
        for i, b in enumerate(p['blocks']):
            b['first'] = i == 0
            blocks.append(b)
    s = json.dumps(blocks, ensure_ascii=False)
    for old, new in FIXES:
        o, n = json.dumps(old, ensure_ascii=False)[1:-1], json.dumps(new, ensure_ascii=False)[1:-1]
        assert o in s, 'исправление не нашло текст: ' + old
        s = s.replace(o, n)
    blocks = json.loads(s)
    out = []
    for b in blocks:
        prev = out[-1] if out else None
        if b['t'] == 'table' and prev and prev['t'] == 'table' and prev['cols'] == b['cols'] \
                and (b['first'] or prev.get('open')):
            # таблица, разорванная страницей: на новой странице повтор шапки (иногда отдельно от строк)
            ph = [r['cells'] for r in prev['rows'] if r['head']]
            bh = [r['cells'] for r in b['rows'] if r['head']]
            if not bh or (ph and bh[0] == ph[0]):
                body = [r for r in b['rows'] if not r['head']]
                prev['rows'] += body
                prev['open'] = not body
                continue
        if prev:
            prev.pop('open', None)
        if b['t'] == 'words' and prev and prev['t'] == 'words':
            prev['entries'] += b['entries']
            continue
        out.append(b)
    return out


def cell(c):
    return '<br>'.join(c) if isinstance(c, list) else c


def render_table(b):
    head = next((r['cells'] for r in b['rows'] if r['head']), None)
    rows = [r['cells'] for r in b['rows'] if not r['head']]
    labels = [plain(h).strip() for h in head] if head else [''] * b['cols']
    longest = max((len(plain(cell(c))) for r in rows for c in r), default=0)
    keep = (b['cols'] == 2 and longest <= 80) or (b['cols'] == 3 and longest <= 60)
    titled = labels[0] in TITLE_COL and b['cols'] >= 2 and not keep
    cls = ['tbl']
    cls.append('keep' if keep else 'stack')
    if titled:
        cls.append('titled')
    w = sum(b['widths'])
    cols = ''.join(f'<col style="width:{x / w * 100:.1f}%">' for x in b['widths'])
    out = [f'<div class="{" ".join(cls)}"><table><colgroup>{cols}</colgroup>']
    if head:
        out.append('<thead><tr>' + ''.join(f'<th>{H.escape(l)}</th>' for l in labels) + '</tr></thead>')
    out.append('<tbody>')
    for r in rows:
        tds = []
        for j, c in enumerate(r):
            v = cell(c) or '—'
            lab = H.escape(labels[j], quote=True)
            tds.append(f'<td data-l="{lab}">{v}</td>')
        out.append('<tr class="u">' + ''.join(tds) + '</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)


def render_pairs(x):
    c0, c1 = x['cols'][0], x['cols'][1] if len(x['cols']) > 1 else []
    rows = []
    for top, h in c0:
        rows.append([top, h, ''])
    for top, h in c1:
        for r in rows:
            if abs(r[0] - top) < 3 and not r[2]:
                r[2] = h
                break
        else:
            rows.append([top, '', h])
    rows.sort(key=lambda r: r[0])
    return '<div class="pairs">' + ''.join(
        f'<div class="pr u"><div>{a}</div><div>{b}</div></div>' for _, a, b in rows) + '</div>'


def learn_head(text):
    t = plain(text).strip()
    t = re.sub(r'^■\s*ВЫУЧИТЬ\s*—?\s*', '', t)
    return f'<div class="lh"><span class="tag">Выучить</span><span>{H.escape(t)}</span></div>'


def build():
    blocks = load()
    overview = {'id': 'obzor', 'chip': 'Обзор', 'kicker': '', 'title': '', 'sub': '', 'body': [], 'toc': []}
    sections = [overview]
    cur = overview
    ul = []

    def flush_ul():
        if ul:
            cur['body'].append('<ul>' + ''.join(f'<li class="u">{x}</li>' for x in ul) + '</ul>')
            ul.clear()

    pending_title = False
    for b in blocks:
        t = b['t']
        if t != 'li':
            flush_ul()
        if t == 'kicker':
            cur['kicker'] = plain(b['html'])
        elif t == 'cover':
            cur['title'] = plain(b['html'])
        elif t == 'subtitle':
            cur['sub'] = plain(b['html'])
        elif t == 'task':
            n = re.search(r'\d+', b['html']).group()
            cur = {'id': f't{n}', 'chip': n, 'kicker': f'Задание {n}', 'title': '', 'sub': '', 'body': [], 'toc': []}
            sections.append(cur)
            pending_title = True
        elif t == 'title' and pending_title:
            cur['title'] = plain(b['html'])
            pending_title = False
        elif t == 'info':
            cur['body'].append('<dl class="info">' + ''.join(
                f'<div class="u"><dt>{plain(a)}</dt><dd>{v}</dd></div>' for a, v in b['rows']) + '</dl>')
        elif t == 'h2':
            m = re.match(r'(\d+\.\d+)\s+(.*)', plain(b['html']))
            num, txt = m.group(1), m.group(2)
            sid = 's' + num.replace('.', '-')
            cur['toc'].append((sid, num, txt))
            cur['body'].append(f'<h3 class="sec" id="{sid}"><span class="num">{num}</span><span>{H.escape(txt)}</span></h3>')
        elif t == 'h3':
            cur['body'].append(f'<h4 class="sub">{H.escape(plain(b["html"]))}</h4>')
        elif t == 'learnhead':
            cur['body'].append(learn_head(b['html']))
        elif t == 'rule':
            cur['body'].append(f'<div class="rule u">{b["html"]}</div>')
        elif t == 'p':
            cur['body'].append(f'<p class="u">{b["html"]}</p>')
        elif t == 'li':
            ul.append(b['html'])
        elif t == 'table':
            cur['body'].append(render_table(b))
        elif t == 'box':
            inner = []
            for x in b['body']:
                if x['t'] == 'pairs':
                    inner.append(render_pairs(x))
                else:
                    inner.append(f'<p class="u">{x["html"]}</p>')
            cur['body'].append('<section class="box">' + learn_head(b['head']) + ''.join(inner) + '</section>')
        elif t == 'words':
            cur['body'].append('<div class="words">' + ''.join(
                f'<span class="w u">{e}</span>' for e in b['entries']) + '</div>')
        else:
            raise SystemExit('неизвестный блок: ' + t)
    flush_ul()

    # «Источники» в обзоре — свернуть, чтобы не занимали экран
    ov = overview['body']
    for i, s in enumerate(ov):
        if s == '<h4 class="sub">Источники</h4>':
            ov[i:] = ['<details class="src"><summary>Источники</summary>' + ''.join(ov[i + 1:]) + '</details>']
            break

    chips = ''.join(f'<a class="chip" href="#{s["id"]}" data-s="{s["id"]}">{s["chip"]}</a>' for s in sections)
    parts = []
    for s in sections:
        toc = ''
        if s['toc']:
            toc = '<nav class="toc">' + ''.join(
                f'<a href="#{sid}"><span class="num">{num}</span>{H.escape(txt)}</a>' for sid, num, txt in s['toc']) + '</nav>'
        if s['id'] == 'obzor':
            headh = (f'<header class="head"><div class="kicker">{H.escape(s["kicker"])}</div>'
                     f'<h1>{H.escape(s["title"])}</h1><div class="meta">{H.escape(s["sub"])}</div></header>')
            parts.append(f'<section class="part" id="obzor" data-s="obzor">{headh}<div class="card">{"".join(s["body"])}</div></section>')
        else:
            headh = (f'<header class="th"><div class="kicker">{H.escape(s["kicker"])}</div>'
                     f'<h2>{H.escape(s["title"])}</h2></header>')
            parts.append(f'<section class="part" id="{s["id"]}" data-s="{s["id"]}">{headh}'
                         f'<div class="card">{toc}{"".join(s["body"])}</div></section>')
    page = SHELL.replace('__CHIPS__', chips).replace('__BODY__', '\n'.join(parts))
    OUT.write_text(page, encoding='utf-8')
    print('написано', OUT.relative_to(ROOT), f'{len(page) // 1024} КБ', f'разделов {len(sections)}')


SHELL = (pathlib.Path(__file__).parent / 'theory_shell.html').read_text(encoding='utf-8')

if __name__ == '__main__':
    build()
