"use server";
import { ok } from "@/lib/mock-server/result";
import { getCurrentActor } from "@/lib/mock-server/auth/session";
import { resolveHomeRoute, type HomeRoute } from "@/lib/mock-server/routing/home-route";

export async function resolveMyHomeRouteAction() {
  const actor = await getCurrentActor();
  return ok<HomeRoute>(resolveHomeRoute(actor));
}
