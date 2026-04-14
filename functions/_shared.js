// 共享工具：cookie 签名 / 校验 / 读数据

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64url(sig);
}

export async function createSession(secret, days = 7) {
  const payload = { exp: Date.now() + days * 86400 * 1000 };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(secret, body);
  return `${body}.${sig}`;
}

export async function verifySession(secret, token) {
  if (!token || !token.includes(".")) return false;
  const [body, sig] = token.split(".");
  const expected = await hmac(secret, body);
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(dec.decode(b64urlDecode(body)));
    if (typeof payload.exp !== "number") return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  const parts = h.split(/;\s*/);
  for (const p of parts) {
    const [k, ...v] = p.split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function cookieHeader(name, value, opts = {}) {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.secure !== false) parts.push("Secure");
  return parts.join("; ");
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

export const DATA_KEY = "site";

export const DEFAULT_DATA = {
  projects: [
    { id: "eureka", title: "Eureka", year: "2026", items: [] },
    { id: "troubled-waters", title: "Troubled Waters", year: "2025", items: [] },
    { id: "glass-eyes", title: "Glass Eyes", year: "2024", items: [] },
    { id: "everything", title: "Everything in Its Right Place", year: "2024", items: [] },
    { id: "sun-night", title: "Sun Night", year: "2023", items: [] },
  ],
  info: {
    en: "Sun Chun\nBorn in 2001 in Anhui, China,\ncurrently living in Tokyo.",
    jp: "孫 淳 ( ソン ジュン )\n2001年中国安徽省生まれ、\n現在は東京に在住。",
    email: "numah0116@gmail.com",
    ig: "numah_21",
  },
};

export async function readData(env) {
  if (!env.DATA) return DEFAULT_DATA;
  const raw = await env.DATA.get(DATA_KEY);
  if (!raw) return DEFAULT_DATA;
  try { return JSON.parse(raw); } catch { return DEFAULT_DATA; }
}

export async function writeData(env, data) {
  if (!env.DATA) throw new Error("KV binding DATA missing");
  await env.DATA.put(DATA_KEY, JSON.stringify(data));
}

export async function requireAuth(request, env) {
  const token = getCookie(request, "session");
  const ok = await verifySession(env.SESSION_SECRET || "dev-secret", token);
  return ok;
}
