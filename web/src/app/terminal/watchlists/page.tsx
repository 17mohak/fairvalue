import { Suspense } from "react";
import { Watchlists } from "@/components/terminal/Watchlists";
import { WorkspaceHead } from "@/components/terminal/WorkspaceHead";

export const metadata = { title: "Watchlists" };

export default function WatchlistsPage() {
  return (
    <>
      <WorkspaceHead id="watchlists" note="Named collections of players to follow and compare. They live in this browser's local storage: there are no accounts and nothing is synced." />
      <Suspense>
        <Watchlists />
      </Suspense>
    </>
  );
}
