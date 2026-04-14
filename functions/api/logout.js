import { json, cookieHeader } from "../_shared.js";

export async function onRequestPost() {
  const cookie = cookieHeader("session", "", { maxAge: 0 });
  return json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}
