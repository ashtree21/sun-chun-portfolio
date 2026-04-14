const app = document.getElementById("app");

const DEFAULT_DATA = {
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

let data = DEFAULT_DATA;

async function loadData() {
  try {
    const r = await fetch("/api/projects", { cache: "no-store" });
    if (r.ok) {
      const json = await r.json();
      if (json && json.projects) data = json;
    }
  } catch {}
  render();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function nl2br(s) {
  return esc(s).replace(/\n/g, "<br>");
}

function renderHome() {
  const links = data.projects
    .map(p => `<a href="#/project/${esc(p.id)}">${esc(p.title)}</a>`)
    .join("");
  app.innerHTML = `
    <section class="home">
      <h1 class="home__brand">SUN CHUN</h1>
      <nav class="home__nav">
        ${links}
      </nav>
      <div class="home__info">
        <a href="#/info">Info</a>
      </div>
    </section>
  `;
}

function renderProject(id) {
  const p = data.projects.find(x => x.id === id);
  if (!p) { location.hash = "#/"; return; }

  const itemsHtml = (p.items || []).map(it => {
    if (it.type === "image") {
      return `<img src="${esc(it.url)}" alt="" loading="lazy">`;
    }
    if (it.type === "text") {
      return `
        <div class="text-block">
          <div class="en">${nl2br(it.en || "")}</div>
          <div class="jp">${nl2br(it.jp || "")}</div>
        </div>`;
    }
    return "";
  }).join("");

  const empty = (!p.items || p.items.length === 0)
    ? `<div class="project__empty">（暂无内容，请在后台上传）</div>`
    : "";

  app.innerHTML = `
    <section class="project" id="project-scroll">
      <div class="project__meta">
        <div>${esc(p.title)}</div>
        <div>${esc(p.year)}</div>
        <div class="project__back" data-back>&lt;&lt;&lt;</div>
      </div>
      <div class="project__track">
        ${itemsHtml}
        ${empty}
        ${p.items && p.items.length > 0 ? `<div class="back-end" data-scroll-start>&lt;&lt;&lt;</div>` : ""}
      </div>
    </section>
  `;

  app.querySelector("[data-back]")?.addEventListener("click", () => {
    location.hash = "#/";
  });
  const scroller = document.getElementById("project-scroll");
  app.querySelector("[data-scroll-start]")?.addEventListener("click", () => {
    scroller.scrollTo({ left: 0, behavior: "smooth" });
  });
}

function renderInfo() {
  const i = data.info || {};
  app.innerHTML = `
    <section class="info">
      <div class="info__back" data-back>&lt;&lt;&lt;</div>
      <div class="info__block">
        <div class="en">${nl2br(i.en || "")}</div>
      </div>
      <div class="info__block">
        <div class="jp">${nl2br(i.jp || "")}</div>
      </div>
      <div class="info__contact">
        ${i.email ? `<div>Email: ${esc(i.email)}</div>` : ""}
        ${i.ig ? `<div>Ig: ${esc(i.ig)}</div>` : ""}
      </div>
    </section>
  `;
  app.querySelector("[data-back]")?.addEventListener("click", () => {
    location.hash = "#/";
  });
}

function render() {
  const hash = location.hash || "#/";
  const m = hash.match(/^#\/project\/([^/]+)$/);
  if (m) return renderProject(m[1]);
  if (hash === "#/info") return renderInfo();
  renderHome();
}

window.addEventListener("hashchange", render);
loadData();
