"""Request / response schemas for POST /predict.

Ranges are the training data's min/max (rounded slightly outward) for the approved modelling population (docs/RESEARCH_DESIGN.md §1): players with at
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

    age: float = Field(..., ge=16, le=44, description="Age in years at the valuation date (training range 16.4-43.4)")
    height_in_cm: float | None = Field(None, ge=160, le=206, description="Missing allowed (imputed as in training)")
    position: Literal["Attack", "Midfield", "Defender", "Goalkeeper"]
    sub_position: str = Field(..., description="Transfermarkt sub-position, e.g. 'Centre-Forward' (never missing in training)")
    foot: Literal["left", "right", "both"] | None = None
    valuation_league_id: COVERED_LEAGUES = Field(..., description="League of the club at valuation (Model A only)")
    club_ppg: float | None = Field(None, ge=0.2, le=2.7, description="Club league points per game, last 365 days (Model A only; missing allowed)")
    appearances: int = Field(..., ge=5, le=113)
    minutes: float = Field(..., ge=450, le=9650, description="Club minutes; >= 450 is the approved population")
    start_share: float = Field(..., ge=0, le=1)
    goals_p90: float = Field(..., ge=0, le=1.2)
    assists_p90: float = Field(..., ge=0, le=0.75)
    # Optional inputs with documented default assumptions (never missing in training):
    yellow_p90: float = Field(0.0, ge=0, le=0.91, description="Default 0")
    red_p90: float = Field(0.0, ge=0, le=0.2, description="Default 0")
    intl_club_minutes_share: float = Field(0.0, ge=0, le=1, description="Default 0 (no European club minutes)")
    minutes_last_365: float = Field(..., ge=0, le=4970)
    days_since_last_match: int = Field(..., ge=0, le=620)
    valuation_club_minutes_share: float = Field(1.0, ge=0, le=1, description="Default 1 (all minutes at current club)")

    @model_validator(mode="after")
    def consistent(self):
        if self.minutes_last_365 > self.minutes:
            raise ValueError("minutes_last_365 cannot exceed minutes (two-year total)")
        if not 14 <= self.minutes / self.appearances <= 101.25:
            raise ValueError("minutes per appearance must be within the training range 14-101.25")
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
