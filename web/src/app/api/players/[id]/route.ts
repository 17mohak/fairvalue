import { NextResponse } from "next/server";
import { idFromParam } from "@/lib/players";
import { playerById } from "@/lib/players.server";

// One full player record, for the Terminal's inspector panel.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = idFromParam((await params).id);
  const p = id === null ? undefined : playerById(id);
  if (!p) return NextResponse.json({ detail: "No such player in this build" }, { status: 404 });
  return NextResponse.json(p, { headers: { "Cache-Control": "private, max-age=300" } });
}
