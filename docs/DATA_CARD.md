# Data card: FairValue modelling and audit datasets

Format loosely follows Gebru et al., "Datasheets for Datasets", and Google's Data Cards. Details
of the source chain are in `docs/DATA_PROVENANCE.md`; coverage evidence is in `docs/reports/COVERAGE_AUDIT.md`.

## Summary
| | |
|---|---|
| Source | `dcaribou/transfermarkt-datasets` (scraped from Transfermarkt), public R2 bucket; Kaggle mirror `davidcariboo/player-scores` |
| Snapshot | Frozen upstream (updates paused July 2026). Valuations to 2026-06-12, appearances to 2026-06-28 |
| Acquired | 2026-11-04; SHA-256 per table in `data/raw/MANIFEST.json` |
| Derived tables | `model_dataset` (5,820 × target + 20 features), `audit_lookup` (citizenship → confederation → group), `player_universe` (19,364 currently valued players), `drift_reference` + `drift_reference_features` (5,278 eligible players in the earlier period) |
| Unit | One row per player (latest valuation in the window) |
| Target | `market_value_in_eur`: Transfermarkt community valuation (not a transfer fee) |

## Composition (primary population)
- 5,820 players: 4,324 UEFA, 1,496 non-UEFA (25.7%).
  - Non-UEFA by confederation: CAF 675, CONMEBOL 533, CONCACAF 154, AFC 127, OFC 7.
- 14 leagues: BE1, DK1, ES1, FR1, GB1, GR1, IT1, L1, NL1, PO1, RU1, SC1, TR1, UKR1.
  - Non-UEFA share by league ranges from 16.7% (UKR1) to 42.1% (PO1).
- Tiers: Emerging < €2M (2,776), Established €2M–10M (1,856), Elite €10M–30M (843), World Class ≥ €30M (345).
- Feature missingness is under 3.1% in every group (height, foot, club strength).

## Collection and processing
- **Features:** club-competition matches in the 730 days up to each player's own valuation date;
  per-90 rates require ≥ 450 minutes; national-team matches are excluded (D-010); impossible heights
  are set to missing.
- **League and club:** taken from the valuation record (as at valuation time).
- **Nationality mapping:** 202 citizenship strings mapped by football confederation membership
  (`src/data/mappings/country_confederation.csv`). It agrees with the dataset's own `national_teams`
  table for all 123 countries that table labels.
- **Quality checks:** 13 checks (`reports/data_quality.csv`); none blocking.

## Sensitive attributes
- Citizenship, country of birth, national-team id, caps: **never** in the feature table; kept only in
  `audit_lookup` for the post-hoc audit.
- Only one citizenship per player is recorded, so dual nationality is not observed.
- Nationality is not a GDPR special category, but it can be a proxy for ethnic origin. It is treated as sensitive.

## Known biases and limitations
| Issue | Evidence |
|---|---|
| Coverage bias | Match data only for 14 European leagues; 79% of currently valued non-UEFA players excluded (UEFA: 47%) |
| Survivorship / selection | Retained non-UEFA players sit at the 82nd percentile of their group's value distribution (UEFA: 74th) |
| Target bias | Crowd-sourced valuations can reflect reputation and media attention |
| Reputation proxies | League identity, club strength, European-cup minutes |
| Thin data for some roles | No defensive or passing statistics; goalkeepers described mostly by minutes |
| Rounding | Values are rounded (102 distinct values in the population) |
| Frozen source | No further updates expected; drift is simulated historically |

## Licensing and permitted use
- The repository is CC0 1.0. The underlying content comes from Transfermarkt, whose terms of use were
  **not reviewed**, so licensing is uncertain.
- The raw data is not redistributed from this repository. Use is research and non-commercial only.

## Maintenance
- Re-acquire with `python -m src.data.acquire`. A changed checksum flags an upstream change.
- An unmapped new citizenship spelling raises an error rather than defaulting to non-UEFA.
