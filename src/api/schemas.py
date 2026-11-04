"""Request / response schemas for POST /predict.

Ranges reflect the approved modelling population (docs/RESEARCH_DESIGN.md §1): players with at
least 450 club minutes in the two years before valuation, at clubs in the 14 covered leagues.
Inputs outside that population are rejected rather than silently extrapolated.

`extra="forbid"`: unknown fields are rejected. In particular, nationality, citizenship or
confederation cannot be sent to the model, by design (requirement ER2).
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

COVERED_LEAGUES = Literal["BE1", "DK1", "ES1", "FR1", "GB1", "GR1", "IT1", "L1", "NL1",
                          "PO1", "RU1", "SC1", "TR1", "UKR1"]

DISCLAIMER = (
    "Research use only (BTECH CAP 501 academic project). Estimates reproduce Transfermarkt "
    "community valuations, which may themselves be biased, for players at clubs in 14 European "
    "first divisions (2025-26 snapshot). Not suitable for scouting, recruitment, contract or any "
    "decision about a person. Nationality is not used by the model; see the project's fairness audit."
)


class PlayerFeatures(BaseModel):
    """Match statistics are for club competitions in the 730 days up to the valuation date."""

    model_config = ConfigDict(extra="forbid", json_schema_extra={"example": {
        "age": 24.5, "height_in_cm": 181, "position": "Attack", "sub_position": "Centre-Forward",
        "foot": "right", "valuation_league_id": "ES1", "club_ppg": 1.6, "appearances": 60,
        "minutes": 4200, "start_share": 0.8, "goals_p90": 0.45, "assists_p90": 0.15,
        "yellow_p90": 0.1, "red_p90": 0.0, "intl_club_minutes_share": 0.1,
        "minutes_last_365": 2300, "days_since_last_match": 7, "valuation_club_minutes_share": 1.0}})

    age: float = Field(..., ge=15, le=45, description="Age in years at the valuation date")
    height_in_cm: float | None = Field(None, ge=150, le=215)
    position: Literal["Attack", "Midfield", "Defender", "Goalkeeper"]
    sub_position: str | None = Field(None, description="Transfermarkt sub-position, e.g. 'Centre-Forward'")
    foot: Literal["left", "right", "both"] | None = None
    valuation_league_id: COVERED_LEAGUES = Field(..., description="League of the club at valuation (Model A only)")
    club_ppg: float | None = Field(None, ge=0, le=3, description="Club league points per game, last 365 days (Model A only)")
    appearances: int = Field(..., ge=1, le=200)
    minutes: float = Field(..., ge=450, le=12000, description="Club minutes; >= 450 is the approved population")
    start_share: float = Field(..., ge=0, le=1)
    goals_p90: float = Field(..., ge=0, le=3)
    assists_p90: float = Field(..., ge=0, le=3)
    yellow_p90: float = Field(0.0, ge=0, le=3)
    red_p90: float = Field(0.0, ge=0, le=1)
    intl_club_minutes_share: float = Field(0.0, ge=0, le=1)
    minutes_last_365: float = Field(..., ge=0, le=7000)
    days_since_last_match: int = Field(..., ge=0, le=730)
    valuation_club_minutes_share: float = Field(1.0, ge=0, le=1)

    @model_validator(mode="after")
    def consistent(self):
        if self.minutes_last_365 > self.minutes:
            raise ValueError("minutes_last_365 cannot exceed minutes (two-year total)")
        if self.minutes / self.appearances > 130:
            raise ValueError("minutes per appearance cannot exceed 130")
        return self

    def to_features(self) -> dict:
        """Add the derived columns the pipeline expects (computed here, never sent by clients)."""
        d = self.model_dump()
        d["goal_contrib_p90"] = self.goals_p90 + self.assists_p90
        d["minutes_per_appearance"] = self.minutes / self.appearances
        return d


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    player: PlayerFeatures
    model: Literal["A", "B"] = Field("A", description="A = full features (default), B = performance-only ablation")


class PredictResponse(BaseModel):
    predicted_value_eur: float
    predicted_tier: str = Field(..., description="Tier of the regression estimate (€2M / €10M / €30M boundaries)")
    classifier_tier: str = Field(..., description="Most likely tier from the separate tier classifier")
    tier_probabilities: dict[str, float]
    model: Literal["A", "B"]
    model_version: dict[str, str]
    disclaimer: str = DISCLAIMER


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    models_loaded: list[str]
    model_versions: dict[str, str]
    dataset_sha256_16: str | None
