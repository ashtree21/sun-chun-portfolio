import { json, requireAuth } from "../_shared.js";

export async function onRequestGet({ request, env }) {
  const ok = await requireAuth(request, env);
  return json({ authed: ok });
}
