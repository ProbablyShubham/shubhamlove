#!/usr/bin/env python3
"""Pull the newest post from haevyre.com's RSS feed into data/latest-post.json.

Run at build time (GitHub Actions), never in the browser: fetching the raw
feed client-side trips CORS, and a third-party proxy would put someone else
between the site and its own content.
"""
import json, pathlib, sys, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

FEED = "https://haevyre.com/feed/"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "latest-post.json"


def main() -> int:
    req = urllib.request.Request(FEED, headers={"User-Agent": "shubhamlove.com feed reader"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            xml = r.read()
    except Exception as e:                      # keep the last good copy
        print(f"Feed unreachable ({e}); leaving existing data in place.", file=sys.stderr)
        return 0

    item = ET.fromstring(xml).find("./channel/item")
    if item is None:
        print("Feed had no items; leaving existing data in place.", file=sys.stderr)
        return 0

    def text(tag):
        el = item.find(tag)
        return (el.text or "").strip() if el is not None else ""

    date = text("pubDate")
    try:
        date = parsedate_to_datetime(date).astimezone(timezone.utc).isoformat()
    except Exception:
        date = ""

    OUT.write_text(json.dumps({
        "title": text("title"),
        "link": text("link"),
        "date": date,
        "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }, indent=2) + "\n")
    print("Wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
