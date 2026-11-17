"""PDF «Орфография_ЕГЭ_9-15_теория» → JSON-блоки для страницы приложения.

Запуск: python3 parse_pdf.py src.pdf out.json
PDF собран ReportLab-ом, поэтому геометрия регулярная:
  линия 3.2 слева      — правило (суть, учить первой)
  рамка 1.2            — блок «■ ВЫУЧИТЬ», под заголовком линия 0.6
  сетка 0.45 (+1.3)    — таблица, 1.3 — низ шапки
  вертикали 0.40       — колонки списка (словарные слова, пары в рамке)
  линия 2.2            — под заголовком задания, ниже до линии 0.6 — блок «Что проверяют»
"""
import json
import re
import sys
from html import escape

import pdfplumber

HEADER_Y = 36      # выше — колонтитул
FOOTER_Y = 805     # ниже — номер страницы
L, R = 41, 554


def near(a, b, tol=1.0):
    return abs(a - b) <= tol


def is_bold(c):
    return 'Bold' in c['fontname']


def is_sans(c):
    return 'Sans' in c['fontname'] or 'Helvetica' in c['fontname']


# ---------- строки из символов ----------

def make_lines(chars):
    """Символы (в порядке потока) → строки. Строка = список символов с одним top."""
    rows = []
    for c in chars:
        for r in rows:
            if abs(r['top'] - c['top']) < 2.5:
                r['chars'].append(c)
                break
        else:
            rows.append({'top': c['top'], 'chars': [c]})
    out = []
    for r in rows:
        cs = r['chars']  # порядок потока: ударение идёт сразу за своей буквой
        vis = [c for c in cs if c['text'].strip() and c['text'] != '\u0301']
        if not vis:
            continue
        main = max(set((round(c['size'], 1)) for c in vis), key=lambda s: sum(1 for c in vis if round(c['size'], 1) == s))
        out.append({
            'top': r['top'],
            'x0': min(c['x0'] for c in vis),
            'x1': max(c['x1'] for c in vis),
            'chars': cs,
            'size': main,
            'sans': sum(is_sans(c) for c in vis) > len(vis) / 2,
            'bold': sum(is_bold(c) for c in vis) > len(vis) / 2,
        })
    out.sort(key=lambda l: l['top'])
    return out


def runs_of(line):
    """Строка → список (текст, жирный). Пропущенные пробелы между кусками добавляются по зазору."""
    runs = []
    prev = None
    for c in line['chars']:
        t = c['text']
        if 'Helvetica' in c['fontname']:
            t = '•'
        if prev is not None and t != '\u0301':
            gap = c['x0'] - prev['x1']
            if gap > 1.6 and prev['text'] != ' ' and t != ' ':
                runs.append((' ', False))
        b = is_bold(c)
        if t == ' ':
            b = None  # пробел нейтрален
        runs.append((t, b))
        prev = c
    return runs


def runs_html(runs):
    """(текст, жирный) → HTML. Пробелы прилипают к соседнему куску, чтобы не плодить <b>."""
    # нейтральные пробелы получают стиль соседа слева
    out = []
    cur = None
    for t, b in runs:
        if b is None:
            b = cur if cur is not None else False
        out.append((t, b))
        cur = b
    html = []
    buf = ''
    state = False
    for t, b in out:
        if b != state:
            if buf:
                html.append(f'<b>{escape(buf)}</b>' if state else escape(buf))
            buf = ''
            state = b
        buf += t
    if buf:
        html.append(f'<b>{escape(buf)}</b>' if state else escape(buf))
    s = ''.join(html)
    # пробелы на краях жирного — наружу
    s = re.sub(r'<b>(\s+)', r'\1<b>', s)
    s = re.sub(r'(\s+)</b>', r'</b>\1', s)
    s = s.replace('<b></b>', '')
    s = re.sub(r'</b>(\s*)<b>', r'\1', s)
    return re.sub(r'\s+', ' ', s).strip()


def first_word_width(line):
    w = 0
    start = line['chars'][0]['x0']
    for c in line['chars']:
        if c['text'] == ' ':
            break
        w = c['x1'] - start
    return w


def paragraphs(lines, right, split_gap=1.42, hang=False, label_break=False):
    """Строки одного столбца/ячейки → абзацы (список списков строк).
    Новый абзац: другой шрифт, большой интервал, маркер «•», или предыдущая строка короткая
    (следующее слово поместилось бы на неё — значит, был явный перенос)."""
    paras = []
    for ln in lines:
        if not paras:
            paras.append([ln])
            continue
        prev = paras[-1][-1]
        gap = ln['top'] - prev['top']
        new = False
        if ln['chars'][0]['text'] in '•' or 'Helvetica' in ln['chars'][0]['fontname']:
            new = True
        elif abs(ln['size'] - prev['size']) > 0.5 or ln['sans'] != prev['sans']:
            new = True
        elif gap > split_gap * prev['size']:
            new = True
        elif prev['x1'] + 3 + first_word_width(ln) < right - 2:
            new = True
        if label_break and not new:
            # строка начинается с жирной подписи «…:» — в PDF это явный перенос
            head = ''
            for c in ln['chars']:
                if c['text'] != ' ' and not is_bold(c):
                    break
                head += c['text']
            last = [c for c in prev['chars'] if c['text'].strip() and c['text'] != '\u0301'][-1]
            if ':' in head and len(head) <= 45 and not is_bold(last):
                new = True
        if hang:  # висячий отступ: продолжение сдвинуто вправо
            new = ln['x0'] < paras[-1][0]['x0'] + 2.5
        if new:
            paras.append([ln])
        else:
            paras[-1].append(ln)
    return paras


def para_html(lines):
    runs = []
    for i, ln in enumerate(lines):
        if i:
            runs.append((' ', None))
        runs += runs_of(ln)
    return runs_html(runs)


def chars_in(chars, x0, top, x1, bottom):
    return [c for c in chars if c['x0'] >= x0 - 0.5 and c['x1'] <= x1 + 0.5
            and c['top'] >= top - 1 and c['bottom'] <= bottom + 1]


# ---------- страница ----------

def parse_page(page, pno):
    chars = [c for c in page.chars if HEADER_Y < c['top'] < FOOTER_Y]
    H = [l for l in page.lines if near(l['top'], l['bottom'], 0.1)]
    V = [l for l in page.lines if near(l['x0'], l['x1'], 0.1)]
    used = set()  # id символов, уже разобранных в регионах
    blocks = []

    def take(cs):
        for c in cs:
            used.add(id(c))
        return cs

    def lw(l, w):
        return abs(l['linewidth'] - w) < 0.03

    # --- таблицы: вертикали 0.45 с общим верхом/низом ---
    groups = {}
    for v in V:
        if lw(v, 0.45):
            groups.setdefault((round(v['top'], 1), round(v['bottom'], 1)), []).append(v['x0'])
    for (top, bot), xs in groups.items():
        xs = sorted(set(round(x, 1) for x in xs))
        hs = sorted(set(round(h['top'], 1) for h in H if (lw(h, 0.45) or lw(h, 1.3))
                        and top - 0.5 <= h['top'] <= bot + 0.5 and h['x0'] <= xs[0] + 1))
        head_bottom = [h['top'] for h in H if lw(h, 1.3) and top - 0.5 <= h['top'] <= bot + 0.5]
        rows = []
        has_head = False
        for i in range(len(hs) - 1):
            y0, y1 = hs[i], hs[i + 1]
            if y1 - y0 < 2:
                continue
            cells = []
            for j in range(len(xs) - 1):
                cs = take(chars_in(chars, xs[j], y0, xs[j + 1], y1))
                lines = make_lines(cs)
                ps = paragraphs(lines, xs[j + 1] - 4, label_break=True)
                cells.append([para_html(p) for p in ps])
            is_head = any(near(y1, hb, 0.6) for hb in head_bottom)
            if is_head:
                has_head = True
                cells = [' '.join(c) for c in cells]
            rows.append({'head': is_head, 'cells': cells})
        blocks.append({'t': 'table', 'top': top, 'cols': len(xs) - 1,
                       'widths': [xs[j + 1] - xs[j] for j in range(len(xs) - 1)], 'rows': rows})

    # --- рамки ВЫУЧИТЬ: горизонтали 1.2 парами + боковины 1.2 ---
    tops = sorted(h['top'] for h in H if lw(h, 1.2))
    sides = [v for v in V if lw(v, 1.2)]
    for v in sides:
        if v['x0'] > L + 1:
            continue
        top, bot = v['top'], v['bottom']
        sep = [h['top'] for h in H if lw(h, 0.6) and top < h['top'] < bot]
        inner_v = [w for w in V if lw(w, 0.40) and top < w['top'] and w['bottom'] < bot]
        body_top = sep[0] if sep else top
        head = ''
        if sep:
            hl = make_lines(take(chars_in(chars, L, top, R, sep[0])))
            head = ' '.join(para_html([l]) for l in hl)
        body = []
        # колонки внутри рамки
        col_top = min((w['top'] for w in inner_v), default=None)
        col_bot = max((w['bottom'] for w in inner_v), default=None)
        if inner_v:
            xs = [L] + sorted(set(round(w['x0'], 1) for w in inner_v)) + [R]
            cols = []
            for j in range(len(xs) - 1):
                cs = take(chars_in(chars, xs[j], col_top - 3, xs[j + 1], col_bot + 1))
                lines = make_lines(cs)
                ps = paragraphs(lines, xs[j + 1] - 6, split_gap=1.3)
                cols.append([(p[0]['top'], para_html(p)) for p in ps])
            body.append({'t': 'pairs', 'top': col_top, 'cols': cols})
        # абзацы вне колонок
        rest = [c for c in chars_in(chars, L, body_top, R, bot) if id(c) not in used]
        take(rest)
        lines = make_lines(rest)
        for p in paragraphs(lines, R - 6, label_break=True):
            body.append({'t': 'p', 'top': p[0]['top'], 'html': para_html(p)})
        body.sort(key=lambda b: b['top'])
        blocks.append({'t': 'box', 'top': top, 'head': head, 'body': body})

    # --- правило: черта 3.2 ---
    for v in V:
        if lw(v, 3.2):
            cs = take([c for c in chars_in(chars, L, v['top'], R, v['bottom']) if id(c) not in used])
            lines = make_lines(cs)
            blocks.append({'t': 'rule', 'top': v['top'],
                           'html': '<br>'.join(para_html(p) for p in paragraphs(lines, R - 8))})

    # --- колонки без рамки (словарные слова) ---
    free_cols = [v for v in V if lw(v, 0.40) and not any(
        s['top'] < v['top'] and v['bottom'] < s['bottom'] for s in sides)]
    if free_cols:
        top = min(v['top'] for v in free_cols)
        bot = max(v['bottom'] for v in free_cols)
        xs = [L] + sorted(set(round(v['x0'], 1) for v in free_cols)) + [R]
        entries = []
        for j in range(len(xs) - 1):
            cs = take([c for c in chars_in(chars, xs[j], top - 3, xs[j + 1], bot + 2) if id(c) not in used])
            lines = make_lines(cs)
            if not lines:
                continue
            left = min(l['x0'] for l in lines)
            hang = any(l['x0'] > left + 3 for l in lines)
            ps = paragraphs(lines, xs[j + 1] - 4, split_gap=1.0, hang=hang)
            entries += [para_html(p) for p in ps]
        blocks.append({'t': 'words', 'top': top, 'entries': entries})

    # --- блок «Что проверяют» между линией 2.2 и 0.6 ---
    for h in H:
        if lw(h, 2.2):
            sep = sorted(x['top'] for x in H if lw(x, 0.6) and x['top'] > h['top']
                         and not any(s['top'] < x['top'] < s['bottom'] for s in sides))
            if not sep or pno == 1:
                continue
            cs = take([c for c in chars_in(chars, L, h['top'], R, sep[0]) if id(c) not in used])
            lines = make_lines(cs)
            rows = []
            for ln in lines:
                if ln['x0'] < L + 2:
                    # подпись — жирное начало до большого зазора
                    k = 0
                    cs2 = ln['chars']
                    for i in range(1, len(cs2)):
                        if cs2[i]['x0'] - cs2[i - 1]['x1'] > 6:
                            k = i
                            break
                    lab = {'chars': cs2[:k]}
                    val = dict(ln, chars=cs2[k:])
                    rows.append([runs_html(runs_of(lab)), [val]])
                else:
                    rows[-1][1].append(ln)
            rows = [[a, para_html(v)] for a, v in rows]
            blocks.append({'t': 'info', 'top': h['top'], 'rows': rows})

    # --- остальной текст ---
    rest = [c for c in chars if id(c) not in used]
    lines = make_lines(rest)
    cur = []

    def flush():
        if not cur:
            return
        for p in paragraphs(cur, R):
            first = p[0]
            html = para_html(p)
            plain = re.sub(r'<[^>]+>', '', html)
            if first['sans']:
                html = plain
            if first['sans'] and first['size'] >= 20:
                t = 'cover'
            elif first['sans'] and first['size'] >= 15:
                t = 'title'
            elif first['sans'] and first['size'] >= 11:
                t = 'h2'
            elif first['sans'] and plain.startswith('ЗАДАНИЕ'):
                t = 'task'
            elif first['sans'] and first['size'] >= 9:
                t = 'kicker' if pno == 1 and first['top'] < 60 else 'h3'
            elif first['sans']:
                t = 'learnhead'
            elif plain.startswith('•'):
                t = 'li'
                html = html.lstrip('• ').strip()
            elif first['size'] >= 12.5:
                t = 'subtitle'
            else:
                t = 'p'
            blocks.append({'t': t, 'top': first['top'], 'html': html})
        cur.clear()

    for ln in lines:
        cur.append(ln)
    flush()
    blocks.sort(key=lambda b: b['top'])
    return blocks


def main(src, out):
    pdf = pdfplumber.open(src)
    pages = []
    for i, page in enumerate(pdf.pages, 1):
        if i == 2:
            continue  # оглавление — на странице строится своё
        pages.append({'page': i, 'blocks': parse_page(page, i)})
    json.dump(pages, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(*sys.argv[1:])
