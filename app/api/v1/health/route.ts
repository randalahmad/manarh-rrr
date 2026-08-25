/**
 * Liveness/readiness check for the Phase 5 backend layer. Deliberately does
 * NOT require authentication (health checks must be reachable by infra
 * tooling without a session) — proxy.ts explicitly carves this exact path
 * out of its auth gate, since its matcher otherwise covers the whole
 * /api/v1/:path* prefix. See proxy.ts for the auth boundary.
 *
 * Confirms the app can reach the database (SELECT 1) without performing
 * any write and without depending on Neon Auth being configured.
 */
import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";

export async function GET() {
  try {
    await query(`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "reachable" });
  } catch (err) {
    console.error("[manarah] health check failed:", err);
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
