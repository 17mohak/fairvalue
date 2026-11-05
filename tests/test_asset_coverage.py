"""Asset coverage on the real export (skips where the git-ignored export is absent, e.g. CI)."""

import pytest

from src.product import asset_coverage as ac

pytestmark = pytest.mark.skipif(not ac.EXPORT.exists(), reason="full player export not generated")


def test_every_recorded_nationality_and_league_is_mapped():
    r = ac.build()
    assert r["nationality"]["unmapped"] == {}
    assert r["league_flags"]["with_flag"] == r["league_flags"]["leagues"] == 14
    # Coverage is a display question only; the report never lists players.
    assert "players" not in r
