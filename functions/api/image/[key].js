// 代理 R2 对象读取，避开必须把 bucket 设成公开的问题
export async function onRequestGet({ params, env }) {
  if (!env.IMAGES) return new Response("no r2", { status: 500 });
  const obj = await env.IMAGES.get(params.key);
  if (!obj) return new Response("not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
}

export async function onRequestDelete({ params, env, request }) {
  const { requireAuth, json } = await import("../../_shared.js");
  if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, { status: 401 });
  if (!env.IMAGES) return json({ error: "no r2" }, { status: 500 });
  await env.IMAGES.delete(params.key);
  return json({ ok: true });
}
