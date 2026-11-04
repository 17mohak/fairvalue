# Feature dictionary

All features are computed **as of each player's own valuation date**
(`src/data/build_dataset.py`). Lists live in `src/features/preprocess.py`.

| Feature | Source | Definition | Model A | Model B |
|---|---|---|---|---|
| age | players.date_of_birth | years at valuation date (pipeline adds age²) | ✓ | ✓ |
| height_in_cm | players | as recorded | ✓ | ✓ |
| position, sub_position, foot | players | categorical, one-hot | ✓ | ✓ |
| appearances | appearances | club matches in 730 days up to valuation date | ✓ | ✓ |
| minutes | appearances | sum of minutes_played, same window | ✓ | ✓ |
| minutes_per_appearance | derived | minutes / appearances | ✓ | ✓ |
| start_share | appearances + game_events | 1 − (matches entered as substitute / appearances) | ✓ | ✓ |
| goals_p90, assists_p90, goal_contrib_p90 | appearances | count × 90 / minutes (only if minutes ≥ 450) | ✓ | ✓ |
| yellow_p90, red_p90 | appearances | as above | ✓ | ✓ |
| intl_club_minutes_share | appearances | share of minutes in CL/EL/qualifiers/super cups | ✓ | ✓ |
| minutes_last_365 | appearances | club minutes in the 365 days up to valuation (recent form / injury signal) | ✓ | ✓ |
| days_since_last_match | appearances | days from last club match to valuation date | ✓ | ✓ |
| valuation_club_minutes_share | appearances | share of window minutes played for the valuation club (loans/transfers) | ✓ | ✓ |
| club_ppg | games | valuation club's league points per game, 365 days | ✓ | — |
| valuation_league_id | player_valuations | league of the club at valuation time | ✓ | — |

**Target:** `market_value_in_eur` (latest valuation in the 12 months to 2026-06-12).

## Never features
Citizenship, confederation, audit group, birth country/city, national-team id, caps
and international goals (nationality proxies), highest market value (target leakage),
earlier valuations (reserved for drift). Enforced by `assert_no_demographic_columns`
and `tests/test_leakage.py`.

Audit-only diagnostic (not a feature): `recent_arrival` (no recorded match more than a year
before valuation).

## Measured proxy strength
Allowed features predict UEFA vs non-UEFA with CV ROC AUC **0.671** (Model A) and
**0.644** (Model B); see COVERAGE_AUDIT.md §6.

## Known proxy risks that remain in Model A
- **League** and **club_ppg**: non-UEFA share varies by league (16.7%–42.1%), so league
  can carry group information indirectly. The Model B ablation measures this.
- **intl_club_minutes_share**: European competitions are open to clubs, not
  nationalities, so this is a club-strength signal, but it is still a reputation proxy.
- **height / foot / position** could correlate with recruitment patterns by region;
  to be checked with SHAP in the fairness milestone.
