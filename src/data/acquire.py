"""Download the raw transfermarkt-datasets tables and record a checksum manifest.

Usage:
    python -m src.data.acquire            # download missing tables
    python -m src.data.acquire --force    # re-download everything

The manifest (data/raw/MANIFEST.json) is committed to git. It records exactly
which bytes we analysed (URL, size, SHA-256, server Last-Modified, download time),
so anyone can verify they are working on the same snapshot.
"""

import argparse
import hashlib
import json
import urllib.request
from datetime import datetime, timezone

from src.config import DATASET_BASE_URL, RAW_DIR, TABLES, get_logger

log = get_logger(__name__)
MANIFEST_PATH = RAW_DIR / "MANIFEST.json"


def sha256_of(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download_table(table: str, force: bool = False) -> dict:
    """Download one table as .csv.gz and return its manifest entry."""
    url = f"{DATASET_BASE_URL}/{table}.csv.gz"
    dest = RAW_DIR / f"{table}.csv.gz"
    last_modified = None

    if dest.exists() and not force:
        log.info("%-18s already present, skipping download", table)
    else:
        log.info("%-18s downloading %s", table, url)
        tmp = dest.with_suffix(".part")
        # The bucket rejects Python's default "Python-urllib" user agent with 403,
        # so we identify the project explicitly.
        req = urllib.request.Request(url, headers={"User-Agent": "fairvalue-research/0.1"})
        with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as out:
            last_modified = resp.headers.get("Last-Modified")
            while chunk := resp.read(1 << 20):
                out.write(chunk)
        tmp.replace(dest)  # only replace once the download finished cleanly

    return {
        "table": table,
        "url": url,
        "file": dest.name,
        "bytes": dest.stat().st_size,
        "sha256": sha256_of(dest),
        "server_last_modified": last_modified,
        "downloaded_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def main(force: bool = False) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    old = {}
    if MANIFEST_PATH.exists():
        old = {e["table"]: e for e in json.loads(MANIFEST_PATH.read_text())["tables"]}

    entries = []
    for table in TABLES:
        entry = download_table(table, force=force)
        prev = old.get(table)
        # Keep the original download metadata if the file did not change.
        if prev and prev["sha256"] == entry["sha256"]:
            entry = prev
        elif prev:
            log.warning("%s changed since the last manifest (sha256 differs)", table)
        entries.append(entry)

    manifest = {
        "source": "dcaribou/transfermarkt-datasets (public R2 bucket)",
        "source_note": "Upstream updates paused; snapshot current to 2026-07-06 per maintainer README.",
        "tables": entries,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    log.info("Wrote %s", MANIFEST_PATH)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="re-download all tables")
    main(force=parser.parse_args().force)
