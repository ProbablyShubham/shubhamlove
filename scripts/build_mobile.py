#!/usr/bin/env python3
"""Generate the m.shubhamlove.com build from index.html.

One source of truth. Edit index.html; run this; deploy dist-mobile/ to the
mobile repo. The mobile build differs in exactly four ways:

  1. the redirect is off (otherwise m. would bounce visitors back to itself)
  2. the line uses a lighter point budget and a shorter transition
  3. it declares shubhamlove.com as its canonical, so search engines
     consolidate all ranking signal on the primary host
  4. it offers a visible way back to the full site

Usage:  python3 scripts/build_mobile.py
"""
import pathlib
import re
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
OUT = ROOT / "dist-mobile"


def main() -> int:
    html = SRC.read_text()

    # 1 + 2 — behaviour flags
    html = html.replace("var IS_MOBILE_BUILD = false;", "var IS_MOBILE_BUILD = true; ")

    # 3 — canonical stays on the primary host; drop the self-referential alternate
    html = re.sub(r'\s*<link rel="alternate" media="only screen[^>]*>', "", html)

    # 4 — a way back, in the footer, phrased as a control not a warning
    html = html.replace(
        'Shubham <span class="eg">Love</span></p>',
        'Shubham <span class="eg">Love</span></p>\n        '
        '<p style="margin-top:10px"><a href="https://shubhamlove.com/?full=1">Full site</a></p>',
        1,
    )

    # the mobile host is a phone experience; open in the compact layout at any width
    html = html.replace("@media (max-width:900px){", "@media (max-width:1200px){", 1)

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "data").mkdir(parents=True)
    (OUT / "index.html").write_text(html)
    (OUT / "CNAME").write_text("m.shubhamlove.com\n")
    (OUT / ".nojekyll").write_text("")
    (OUT / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n"
    )  # crawlable on purpose: the canonical tag is what consolidates ranking
    shutil.copy(ROOT / "favicon.svg", OUT / "favicon.svg")
    for extra in ("apple-touch-icon.png", "og-image.png"):
        if (ROOT / extra).exists():
            shutil.copy(ROOT / extra, OUT / extra)
    shutil.copy(ROOT / "data" / "latest-post.json", OUT / "data" / "latest-post.json")
    shutil.copytree(ROOT / "scripts", OUT / "scripts")
    shutil.copytree(ROOT / ".github", OUT / ".github")

    print(f"Built {OUT} — deploy its contents to the m.shubhamlove.com repo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
