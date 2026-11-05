"use client";

// The Comparison Studio's explanation panel. Published explanations exist only for the research
// showcase players; for anyone else the served Model A is asked live, the same way the dossier's
// Valuation Journey does it. One basis for every column, never a mix of published and live.

import { useEffect, useState } from "react";
import { explain } from "@/lib/api/client";
import { useServiceStatus } from "@/lib/api/service";
import { buildJourney } from "@/lib/journey";
import type { PlayerProfile } from "@/lib/players";
import { ExplanationMatrix } from "./CompareCharts";

type Live = { status: "loading" | "done" | "offline"; players: PlayerProfile[] };

export function CompareExplanations({ players }: { players: PlayerProfile[] }) {
  const published = players.filter((p) => p.explanation).length >= 2;
  const service = useServiceStatus();
  const [live, setLive] = useState<Live>({ status: "loading", players: [] });

  useEffect(() => {
    if (published) return;
    let alive = true;
    Promise.allSettled(players.map((p) => explain({ player: p.features, model: "A" }))).then((results) => {
      if (!alive) return;
      const withLive = players.map((p, i) => {
        const r = results[i]!;
        if (r.status !== "fulfilled") return { ...p, explanation: null };
        const e = r.value;
        const explanation = { model: e.model, source: e.model_version, base_log_value: e.base_log_value, predicted_log_value: e.predicted_log_value, contributions: e.contributions };
        // Same safeguard as the Valuation Journey: drop an explanation that does not add up.
        return { ...p, explanation: buildJourney(explanation).ok ? explanation : null };
      });
      const explained = withLive.filter((p) => p.explanation).length;
      setLive({ status: explained >= 2 ? "done" : "offline", players: withLive });
    });
    return () => {
      alive = false;
    };
  }, [players, published]);

  if (published) return <ExplanationMatrix players={players} basis="published" />;
  if (live.status === "loading") return <p className="tm-note">Asking the prediction API to explain Model A for each player…</p>;
  if (live.status === "offline")
    return (
      <p className="tm-note">
        Side-by-side explanations need a published explanation for at least two of these players, or the live prediction API, which is not
        available.
      </p>
    );
  return <ExplanationMatrix players={live.players} basis={service.state === "online" ? "live" : "live-unverified"} />;
}
