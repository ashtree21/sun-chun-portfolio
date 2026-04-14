import { json, requireAuth } from "../_shared.js";

// 接收一张或多张图片，写入 R2，返回公开 URL 列表
// 公开 URL 通过 /api/image/:key 代理（见 image.js），避免必须开启 R2 public bucket
export async function onRequestPost({ request, env }) {
  if (!(await requireAuth(request, env))) return json({ error: "unauthorized" }, { status: 401 });
  if (!env.IMAGES) return json({ error: "R2 binding missing" }, { status: 500 });

  const form = await request.formData();
  const files = form.getAll("files");
  if (!files.length) return json({ error: "no files" }, { status: 400 });

  const out = [];
  for (const f of files) {
    if (!(f instanceof File)) continue;
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await env.IMAGES.put(key, f.stream(), {
      httpMetadata: { contentType: f.type || "image/jpeg" },
    });
    out.push({ key, url: `/api/image/${key}`, name: f.name });
  }
  return json({ files: out });
}
