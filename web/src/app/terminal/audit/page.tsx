import type { Metadata } from "next";
import { Suspense } from "react";
import { fairnessData } from "./data";
import { Observatory } from "./Observatory";

export const metadata: Metadata = {
  title: "Fairness Audit",
  description:
    "Does a nationality-blind football valuation model err differently for players from inside and outside UEFA? Gaps, intervals, leagues, tiers and robustness checks.",
};

// Reading searchParams makes the route render per request, so a shared link such as
// /terminal/audit?view=leagues&model=B arrives fully rendered rather than filling in on the client.
export default async function FairnessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await searchParams;
  const data = fairnessData();
  return (
    <Suspense>
      <Observatory data={data} />
    </Suspense>
  );
}
