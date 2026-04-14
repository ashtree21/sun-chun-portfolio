const root = document.getElementById("admin-root");

let data = null;
let dirty = false;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function toast(msg, isErr) {
  let el = document.querySelector(".status");
  if (!el) {
    el = document.createElement("div");
    el.className = "status";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle("err", !!isErr);
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2000);
}

function setDirty(v = true) {
  dirty = v;
  const save = document.querySelector("[data-save]");
  if (save) save.textContent = v ? "保存修改 •" : "已保存";
}

async function api(path, opts = {}) {
  const r = await fetch(path, {
    credentials: "same-origin",
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
}

// ---------- Login ----------

async function checkAuth() {
  try {
    const r = await fetch("/api/me", { credentials: "same-origin" });
    const j = await r.json();
    return !!j.authed;
  } catch { return false; }
}

function renderLogin(errMsg = "") {
  root.innerHTML = `
    <div class="login">
      <form class="login__box" id="login-form">
        <h1>后台登录</h1>
        <input type="password" name="password" placeholder="密码" autofocus required />
        <button type="submit">登录</button>
        <div class="login__err">${esc(errMsg)}</div>
      </form>
    </div>`;
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const pw = e.target.password.value;
    try {
      await api("/api/login", { method: "POST", body: JSON.stringify({ password: pw }) });
      boot();
    } catch (err) {
      renderLogin("密码错误");
    }
  });
}

// ---------- Main ----------

async function boot() {
  if (!(await checkAuth())) return renderLogin();
  const j = await fetch("/api/projects", { cache: "no-store" }).then(r => r.json());
  data = j;
  if (!Array.isArray(data.projects)) data.projects = [];
  if (!data.info) data.info = {};
  renderAdmin();
}

function renderAdmin() {
  root.innerHTML = `
    <div class="topbar">
      <h1>Sun Chun · 后台管理</h1>
      <div class="topbar__actions">
        <a href="/" target="_blank" class="btn">查看网站 ↗</a>
        <button class="btn btn--primary" data-save>已保存</button>
        <button class="btn" data-logout>退出</button>
      </div>
    </div>
    <div class="main">
      <section class="section">
        <div class="section__head"><strong>Info 页</strong></div>
        <div class="section__body">
          <div class="info-edit">
            <div>
              <label>English</label>
              <textarea data-info="en">${esc(data.info.en || "")}</textarea>
            </div>
            <div>
              <label>日本語</label>
              <textarea data-info="jp">${esc(data.info.jp || "")}</textarea>
            </div>
            <div>
              <label>Email</label>
              <input data-info="email" value="${esc(data.info.email || "")}" />
            </div>
            <div>
              <label>Instagram</label>
              <input data-info="ig" value="${esc(data.info.ig || "")}" />
            </div>
          </div>
        </div>
      </section>

      <h2 style="font-size:14px;margin:28px 0 12px;color:#666;">项目列表（拖动标题栏可调整顺序）</h2>
      <div id="projects-list"></div>
      <div class="add-project">
        <button class="btn" data-add-project>+ 新增项目</button>
      </div>
    </div>`;

  root.querySelector("[data-save]").addEventListener("click", save);
  root.querySelector("[data-logout]").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    renderLogin();
  });
  root.querySelector("[data-add-project]").addEventListener("click", () => {
    const id = "new-" + Math.random().toString(36).slice(2, 7);
    data.projects.push({ id, title: "新项目", year: "2026", items: [] });
    setDirty();
    renderProjects();
  });

  root.querySelectorAll("[data-info]").forEach(el => {
    el.addEventListener("input", e => {
      data.info[e.target.dataset.info] = e.target.value;
      setDirty();
    });
  });

  renderProjects();
  setDirty(false);
}

function renderProjects() {
  const list = document.getElementById("projects-list");
  list.innerHTML = "";
  data.projects.forEach((p, pi) => {
    const section = document.createElement("div");
    section.className = "section";
    section.draggable = true;
    section.dataset.pi = pi;
    section.innerHTML = `
      <div class="section__head">
        <span class="handle">⋮⋮</span>
        <input class="f-title" value="${esc(p.title)}" placeholder="项目名" />
        <input class="f-year" value="${esc(p.year)}" placeholder="年份" />
        <input class="f-id" value="${esc(p.id)}" placeholder="id" />
        <button class="btn btn--sm btn--danger" data-del-project>删除</button>
      </div>
      <div class="section__body">
        <div class="uploader">
          <input type="file" multiple accept="image/*" />
          <button class="btn btn--sm btn--primary" data-upload>批量上传</button>
          <button class="btn btn--sm" data-add-text>+ 文字块</button>
        </div>
        <div class="items"></div>
      </div>`;

    section.querySelector(".f-title").addEventListener("input", e => { p.title = e.target.value; setDirty(); });
    section.querySelector(".f-year").addEventListener("input", e => { p.year = e.target.value; setDirty(); });
    section.querySelector(".f-id").addEventListener("input", e => { p.id = e.target.value; setDirty(); });
    section.querySelector("[data-del-project]").addEventListener("click", () => {
      if (!confirm(`删除项目「${p.title}」？`)) return;
      data.projects.splice(pi, 1);
      setDirty();
      renderProjects();
    });

    const uploader = section.querySelector(".uploader");
    const fileInput = uploader.querySelector("input[type=file]");
    uploader.querySelector("[data-upload]").addEventListener("click", async () => {
      const files = fileInput.files;
      if (!files || !files.length) return toast("先选图片", true);
      uploader.classList.add("loading");
      try {
        const fd = new FormData();
        for (const f of files) fd.append("files", f);
        const r = await fetch("/api/upload", { method: "POST", body: fd, credentials: "same-origin" });
        if (!r.ok) throw new Error("upload failed");
        const j = await r.json();
        for (const f of j.files) {
          p.items.push({ type: "image", url: f.url, key: f.key, name: f.name });
        }
        setDirty();
        renderProjects();
        toast(`已上传 ${j.files.length} 张`);
      } catch (err) {
        toast("上传失败: " + err.message, true);
      } finally {
        uploader.classList.remove("loading");
      }
    });

    section.querySelector("[data-add-text]").addEventListener("click", () => {
      p.items.push({ type: "text", en: "", jp: "" });
      setDirty();
      renderProjects();
    });

    const itemsEl = section.querySelector(".items");
    (p.items || []).forEach((it, ii) => {
      const el = document.createElement("div");
      el.className = "item";
      el.draggable = true;
      el.dataset.ii = ii;
      if (it.type === "image") {
        el.innerHTML = `
          <img src="${esc(it.url)}" alt="">
          <button class="item__del" title="删除">×</button>
          <span class="item__tag">#${ii + 1}</span>`;
      } else {
        el.innerHTML = `
          <div class="text-preview">
            <b>文字块 #${ii + 1}</b>
            ${esc((it.en || "").slice(0, 40))}<br>
            ${esc((it.jp || "").slice(0, 40))}
          </div>
          <button class="item__del" title="删除">×</button>`;
      }
      el.querySelector(".item__del").addEventListener("click", e => {
        e.stopPropagation();
        p.items.splice(ii, 1);
        setDirty();
        renderProjects();
      });
      if (it.type === "text") {
        el.addEventListener("click", () => openTextEditor(p, ii));
      }
      itemsEl.appendChild(el);
    });

    wireItemDnd(itemsEl, p);
    list.appendChild(section);
  });

  wireProjectDnd(list);
}

function openTextEditor(p, ii) {
  const it = p.items[ii];
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:100;";
  modal.innerHTML = `
    <div style="background:#fff;padding:24px;border-radius:6px;width:min(720px,90vw);">
      <h3 style="margin:0 0 14px;font-size:14px;">编辑文字块</h3>
      <div class="text-editor">
        <div>
          <label style="font-size:12px;color:#666;">English</label>
          <textarea id="te-en" style="height:180px;">${esc(it.en || "")}</textarea>
        </div>
        <div>
          <label style="font-size:12px;color:#666;">日本語</label>
          <textarea id="te-jp" style="height:180px;">${esc(it.jp || "")}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
        <button class="btn" id="te-cancel">取消</button>
        <button class="btn btn--primary" id="te-ok">确定</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector("#te-cancel").addEventListener("click", () => modal.remove());
  modal.querySelector("#te-ok").addEventListener("click", () => {
    it.en = modal.querySelector("#te-en").value;
    it.jp = modal.querySelector("#te-jp").value;
    setDirty();
    modal.remove();
    renderProjects();
  });
}

// ---------- Drag & drop ----------

function wireProjectDnd(list) {
  let dragIdx = null;
  list.querySelectorAll(".section").forEach(sec => {
    sec.addEventListener("dragstart", e => {
      dragIdx = Number(sec.dataset.pi);
      sec.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    sec.addEventListener("dragend", () => {
      sec.classList.remove("dragging");
      list.querySelectorAll(".section").forEach(s => s.classList.remove("drop-above", "drop-below"));
    });
    sec.addEventListener("dragover", e => {
      e.preventDefault();
      const rect = sec.getBoundingClientRect();
      const below = e.clientY > rect.top + rect.height / 2;
      sec.classList.toggle("drop-below", below);
      sec.classList.toggle("drop-above", !below);
    });
    sec.addEventListener("dragleave", () => {
      sec.classList.remove("drop-above", "drop-below");
    });
    sec.addEventListener("drop", e => {
      e.preventDefault();
      const target = Number(sec.dataset.pi);
      if (dragIdx == null || dragIdx === target) return;
      const rect = sec.getBoundingClientRect();
      const below = e.clientY > rect.top + rect.height / 2;
      const item = data.projects.splice(dragIdx, 1)[0];
      let insertAt = target + (below ? 1 : 0);
      if (dragIdx < target) insertAt--;
      data.projects.splice(insertAt, 0, item);
      dragIdx = null;
      setDirty();
      renderProjects();
    });
  });
}

function wireItemDnd(grid, p) {
  let dragIdx = null;
  grid.querySelectorAll(".item").forEach(el => {
    el.addEventListener("dragstart", e => {
      dragIdx = Number(el.dataset.ii);
      el.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.stopPropagation();
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      grid.querySelectorAll(".item").forEach(i => i.classList.remove("drop-before"));
    });
    el.addEventListener("dragover", e => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add("drop-before");
    });
    el.addEventListener("dragleave", () => el.classList.remove("drop-before"));
    el.addEventListener("drop", e => {
      e.preventDefault();
      e.stopPropagation();
      const target = Number(el.dataset.ii);
      if (dragIdx == null || dragIdx === target) return;
      const item = p.items.splice(dragIdx, 1)[0];
      let insertAt = target;
      if (dragIdx < target) insertAt--;
      p.items.splice(insertAt, 0, item);
      dragIdx = null;
      setDirty();
      renderProjects();
    });
  });
}

// ---------- Save ----------

async function save() {
  try {
    await api("/api/projects", { method: "PUT", body: JSON.stringify(data) });
    setDirty(false);
    toast("已保存");
  } catch (err) {
    toast("保存失败: " + err.message, true);
  }
}

window.addEventListener("beforeunload", e => {
  if (dirty) { e.preventDefault(); e.returnValue = ""; }
});

boot();
