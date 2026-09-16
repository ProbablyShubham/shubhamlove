#!/usr/bin/env python3
"""Refresh external data used by shubhamlove.com.

The public website remains a static GitHub Pages site. This script runs in
GitHub Actions, caches NOAA N2O data and the latest haevyre.com RSS item as
small JSON files, and leaves the last good files untouched if a source is
unavailable.
"""
from __future__ import annotations

import csv
import io
import json
import pathlib
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
N2O_MONTHLY = "https://gml.noaa.gov/webdata/ccgg/trends/n2o/n2o_mm_gl.csv"
N2O_GROWTH = "https://gml.noaa.gov/webdata/ccgg/trends/n2o/n2o_gr_gl.csv"
FEED = "https://haevyre.com/feed/"
UA = "shubhamlove.com static data refresh (contact: shubham@alumni.upenn.edu)"


def fetch(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def atomic_json(path: pathlib.Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def parse_number(value: str):
    try:
        n = float(value.strip())
        return None if n <= -9 else n
    except (TypeError, ValueError, AttributeError):
        return None


def refresh_n2o() -> bool:
    try:
        text = fetch(N2O_MONTHLY).decode("utf-8", "replace")
        rows = []
        for row in csv.reader(io.StringIO(text)):
            if not row or not row[0].strip() or row[0].lstrip().startswith("#") or len(row) < 4:
                continue
            try:
                year = int(row[0].strip())
                month = int(row[1].strip())
            except ValueError:
                continue
            average = parse_number(row[3])
            trend = parse_number(row[5]) if len(row) > 5 else None
            if average is None:
                continue
            rows.append({"date": f"{year:04d}-{month:02d}", "value": round(average, 3), "trend": None if trend is None else round(trend, 3)})
        if not rows:
            raise ValueError("NOAA monthly CSV contained no usable rows")

        latest = rows[-1]
        year, month = map(int, latest["date"].split("-"))
        year_ago = next((r for r in reversed(rows) if r["date"] == f"{year-1:04d}-{month:02d}"), None)
        month_label = datetime(year, month, 1).strftime("%B %Y")

        growth = []
        try:
            growth_text = fetch(N2O_GROWTH).decode("utf-8", "replace")
            for row in csv.reader(io.StringIO(growth_text)):
                if not row or row[0].lstrip().startswith("#") or len(row) < 2:
                    continue
                try:
                    y = int(row[0].strip())
                except ValueError:
                    continue
                value = parse_number(row[1])
                uncertainty = parse_number(row[2]) if len(row) > 2 else None
                if value is not None:
                    growth.append({"year": y, "value": round(value, 3), "uncertainty": None if uncertainty is None else round(uncertainty, 3)})
        except Exception as exc:
            print(f"NOAA growth-rate file unavailable ({exc}); continuing without it.", file=sys.stderr)

        atomic_json(DATA / "n2o.json", {
            "source": "NOAA Global Monitoring Laboratory",
            "source_url": "https://gml.noaa.gov/ccgg/trends_n2o/",
            "doi": "10.15138/P8XG-AA10",
            "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "latest": {**latest, "label": month_label},
            "year_ago": year_ago,
            "series": rows,
            "annual_growth": growth
        })
        print(f"N2O: wrote {len(rows)} monthly observations; latest {month_label} = {latest['value']} ppb")
        return True
    except Exception as exc:
        print(f"N2O refresh failed ({exc}); leaving existing cache in place.", file=sys.stderr)
        return False


def refresh_feed() -> bool:
    try:
        xml = fetch(FEED)
        item = ET.fromstring(xml).find("./channel/item")
        if item is None:
            raise ValueError("RSS feed had no items")

        def text(tag: str) -> str:
            el = item.find(tag)
            return (el.text or "").strip() if el is not None else ""

        date = text("pubDate")
        try:
            date = parsedate_to_datetime(date).astimezone(timezone.utc).isoformat()
        except Exception:
            date = ""
        atomic_json(DATA / "latest-post.json", {
            "title": text("title"),
            "link": text("link"),
            "date": date,
            "fetched": datetime.now(timezone.utc).isoformat(timespec="seconds")
        })
        print("Feed: wrote latest haevyre.com post")
        return True
    except Exception as exc:
        print(f"Feed refresh failed ({exc}); leaving existing cache in place.", file=sys.stderr)
        return False


def main() -> int:
    DATA.mkdir(exist_ok=True)
    refresh_n2o()
    refresh_feed()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
