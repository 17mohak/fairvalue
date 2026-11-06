# Data provenance, lineage and licensing

## Chain of custody

```
Transfermarkt.co.uk  (crowd-sourced valuations + match data, web pages)
   │  scraped by the transfermarkt-scraper / transfermarkt-api pipelines
   ▼
dcaribou/transfermarkt-datasets  (dbt models -> 12 CSV tables)
   │  published to a public Cloudflare R2 bucket (also mirrored to Kaggle: davidcariboo/player-scores)
   ▼
data/raw/*.csv.gz   (src/data/acquire.py, SHA-256 in data/raw/MANIFEST.json)
   │  src/data/build_dataset.py
   ▼
data/processed/
   player_universe.parquet   all currently valued players + eligibility flags
   model_dataset.parquet     eligible players: id, target, features (no demographics)
   audit_lookup.parquet      player_id -> citizenship, confederation, audit_group
   drift_reference.parquet   earlier valuation snapshot (drift only)
   build_metadata.json       dates, filters, counts
```

- **Download date:** 2026-11-04. Server `Last-Modified` for the bundle: 2026-09-05.
- **Snapshot status:** upstream updates are paused. Per the maintainer's README,
  `games` ends 2026-07-06, `appearances` 2026-06-28, `player_valuations` 2026-06-12.
  Verified in the files: valuations max date 2026-06-12, appearances max 2026-06-28.

## Tables used

| Table | Rows | Key (verified unique) | Used for |
|---|---|---|---|
| players | 50,149 | player_id | profile (position, foot, height, birth date) + citizenship (audit only) |
| player_valuations | 656,301 | (player_id, date) | target, valuation club/league, drift reference |
| appearances | 1,894,350 | (player_id, game_id) | match stats |
| game_events | 1,274,469 | game_event_id | substitution appearances (start share) |
| games | 88,958 | game_id | club points per game |
| competitions | 65 | competition_id | competition type (league / cup / national team) |
| national_teams | 124 | national_team_id | independent check of the mapping |
| clubs, transfers, countries | — | — | downloaded and profiled; not used in features |

## Licensing: uncertain, documented

- The **transfermarkt-datasets repository** is published under **CC0 1.0** (LICENSE file checked).
- The **underlying data** comes from Transfermarkt's website. CC0 on the repository does
  not necessarily settle the rights to the scraped content. Transfermarkt's terms of use
  were **not reviewed** in this session and should be treated as an open question.
- Mitigations: research, non-commercial use; raw data is never committed or
  redistributed from this repo; provenance is disclosed in the data card.
- Data subjects are professional players; profile and performance data are public.
  The project frames processing under legitimate interest (per the report), and treats
  citizenship as sensitive: it is stored only in the audit table.

## Target caveat

`market_value_in_eur` is Transfermarkt's community-estimated market value, not a
transfer fee. It may itself reflect reputation, media attention or national bias.
The model learns to reproduce it; the audit measures whether the model's errors differ
by group. It cannot establish what a player's "true" value is.
