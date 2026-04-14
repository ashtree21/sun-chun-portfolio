import { json, createSession, cookieHeader } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, { status: 400 }); }
  const pw = (body && body.password) || "";
  const expected = env.ADMIN_PASSWORD || "sunchun";
  if (pw !== expected) return json({ error: "wrong password" }, { status: 401 });

  const token = await createSession(env.SESSION_SECRET || "dev-secret", 7);
  const cookie = cookieHeader("session", token, { maxAge: 7 * 86400 });
  return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}
