/**
 * Frontend-only prototype build: no Neon Auth is mounted. Sign-in/out now
 * goes through signInAction/signOutAction (lib/mock-server/actions/auth.ts),
 * a mock role cookie — nothing calls this route anymore.
 */
import { NextResponse } from "next/server";

function notFound() {
  return NextResponse.json({ error: "Not available in the frontend-only prototype build." }, { status: 404 });
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const DELETE = notFound;
export const PATCH = notFound;
