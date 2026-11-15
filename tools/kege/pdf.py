"""PDF для печати из листов tools/kege: та же оболочка, что в приложении, но в режиме печати
(только чёрный, без заливок). Нужен Playwright с Chromium.

Запуск из корня репозитория:
    python3 tools/kege/pdf.py tools/kege/14.html out/КЕГЭ_14_шаблоны.pdf
"""
import pathlib
import re
import sys
import tempfile

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from build import SHELL  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402


def render(src, out, chrome=None):
    text = pathlib.Path(src).read_text(encoding='utf-8')
    m = re.match(r'\s*<!--\s*title:\s*(.*?)\s*-->\s*', text)
    html = SHELL.replace('__TITLE__', m.group(1)).replace('__BODY__', text[m.end():])
    with tempfile.TemporaryDirectory() as d:
        page_file = pathlib.Path(d) / 'p.html'
        page_file.write_text(html, encoding='utf-8')
        with sync_playwright() as p:
            b = p.chromium.launch(**({'executable_path': chrome} if chrome else {}))
            pg = b.new_page(color_scheme='light')
            pg.goto(page_file.as_uri())
            pg.emulate_media(media='print')
            pg.pdf(path=str(out), prefer_css_page_size=True, print_background=False)
            b.close()


if __name__ == '__main__':
    import os
    render(sys.argv[1], sys.argv[2], os.environ.get('CHROME'))
    print('ok', sys.argv[2])
