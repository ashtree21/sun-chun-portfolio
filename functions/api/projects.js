import { json, readData, writeData, requireAuth } from "../_shared.js";

export async function onRequestGet({ env }) {
  const data = await readData(env);
  return json(data);
}

export async function onRequestPut({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, { status: 400 }); }
  if (!body || !Array.isArray(body.projects) || !body.info) {
    return json({ error: "invalid shape" }, { status: 400 });
  }
  await writeData(env, body);
  return json({ ok: true });
}
