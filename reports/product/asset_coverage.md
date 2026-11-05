# Product asset coverage

Generated 2026-11-05 by `python -m src.product.asset_coverage` from the full export
(5,820 players). Aggregate counts only. Policy and sources: `docs/PLAYER_ASSETS.md`.

| Asset | Coverage | Notes |
|---|---|---|
| Nationality (recorded) | 5,820 / 5,820 (100.0%) | 136 countries. One recorded citizenship per player (first-listed); second nationalities are not in the data. |
| Nationality flag | 5,798 / 5,820 (99.6%) | Text only, no settled flag: Bonaire (1), French Guiana (1), Guadeloupe (4), Martinique (3), Northern Ireland (13). Unmapped: none. |
| League flag | 14 / 14 leagues | Missing: none |
| Portrait | 0 / 5,820 (0.0%) | Licensed Wikimedia Commons cutouts only, after review |
| Shirt number | 0 / 5,820 | Not in the acquired tables; the upstream match-level game_lineups table (126 MB) is not downloaded (D-001). |
| Club crest | 0 / 330 clubs | No licensed source: club crests are trademarks and Transfermarkt images are not covered by the dataset licence. |
