import { Suspense } from "react";
import { Explorer } from "@/components/terminal/Explorer";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";
import { explorerRow, filterSort, paginate, parseExplorerQuery } from "@/lib/explorer";
import { leagueName } from "@/lib/football";
import { integer } from "@/lib/format";
import { playerSet } from "@/lib/players.server";
import { research } from "@/lib/research";

export const metadata = { title: "Player Explorer" };

export default async function ExplorerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = parseExplorerQuery(await searchParams);
  const set = playerSet();
  const all = set.players.map(explorerRow);
  const filtered = filterSort(all, query);
  const { rows, page, pages } = paginate(filtered, query.page);
  const leagues = [...new Set(all.map((r) => r.league_id))].sort((a, b) => leagueName(a).localeCompare(leagueName(b)));
  const population = research.population.funnel.at(-1)!.total;

  const note =
    set.source === "full" ? (
      <>
        Full local export: <b>{integer(all.length)}</b> players from the modelling population. Model A figures are held-out (cross-validated)
        estimates.
      </>
    ) : (
      <>
        Showcase export: <b>{all.length}</b> of the {integer(population)} modelled players, one per audit group and predicted tier. Model A
        figures are the served model&apos;s cached results (in-sample). The full population needs the local export.
      </>
    );

  return (
    <>
      <WorkspaceHead id="explorer" note={note} />
      <Suspense>
        <Explorer query={query} rows={rows} count={filtered.length} total={all.length} page={page} pages={pages} leagues={leagues} />
      </Suspense>
    </>
  );
}
