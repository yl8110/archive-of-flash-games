/* ============================================================
   Shared framework for every Unwrapping archive page.
   Each page only supplies two things in its HTML:
     <template id="speech"> ... mascot's words ... </template>
     <template id="main">   ... right-side page content ... </template>
   and <body data-page="KEY"> to mark the active nav item.
   ============================================================ */

// nav items — edit here once to change the menu on ALL pages
const NAV = [
  { key: "flash-game-101",      label: "flash game 101",      href: "flash-game-101.html" },
  { key: "archive-of-archives", label: "archive of archives", href: "archive-of-archives.html" },
  { key: "collecting-memory",   label: "collecting memory",   href: "collecting-memory.html" },
  { key: "about",               label: "about",               href: "archive.html" },
];

const SPEED = 28;       // ms per character (typing speed)
const MASCOT_GAP = 26;  // vertical gap (px) from the speech bubble down to the mascot

document.addEventListener("DOMContentLoaded", () => {
  // grab the per-page bits BEFORE we rebuild the body
  const activeKey   = document.body.dataset.page || "";
  const speechTpl   = document.getElementById("speech");
  const mainTpl     = document.getElementById("main");
  const speechFrag  = speechTpl ? speechTpl.content.cloneNode(true) : document.createDocumentFragment();
  const mainHTML    = mainTpl ? mainTpl.innerHTML : "";

  // build the navigation list
  const navHTML = NAV.map(n => {
    const active = n.key === activeKey;
    return `<li class="${active ? "active" : ""}"><a href="${n.href}">${n.label}</a></li>`;
  }).join("");

  // build the whole frame
  document.body.innerHTML = `
    <div class="wrap">
      <header class="banner">
        <img class="banner-img" src="../image/banner.png" alt="UNWRAPPING — an archive of the digital traces around flash games" />
      </header>

      <div class="body-row">
        <div class="left-col">
          <nav class="sidebar">
            <h2>Category</h2>
            <ul class="category">${navHTML}</ul>
          </nav>

          <div class="bubble" id="bubble"><p class="bubble-text" id="bubbleText"></p></div>
          <img class="mascot" id="mascot" src="../image/box_default.png" alt="mascot" />
        </div>

        <main class="main-panel" id="mainPanel"></main>
      </div>
    </div>`;

  // fill the right-side content
  document.getElementById("mainPanel").innerHTML = mainHTML;

  // turn any <<replace "...">>...<<endreplace>> blocks into expandable text
  renderStretchTexts(document.getElementById("mainPanel"));

  // wire up any <div class="random-game"> placeholders
  setupRandomGames(document.getElementById("mainPanel"));

  // wire up any <div class="flash-player" data-swf="..."> placeholders
  setupFlashPlayers(document.getElementById("mainPanel"));

  // wire up any <div class="arena-archive"> placeholders
  setupArenaArchives(document.getElementById("mainPanel"));

  // wire up any <div class="memory-embed" data-src="..."> placeholders
  setupEmbeds(document.getElementById("mainPanel"));

  // reveal mascot + speech bubble, then type the words out
  const bubble = document.getElementById("bubble");
  const mascot = document.getElementById("mascot");
  const bubbleText = document.getElementById("bubbleText");
  const segs = fragToSegments(speechFrag);

  // anchor the mascot a fixed gap below the bubble's full height + tail, so
  // the spacing looks the same regardless of how long the speech is
  bubbleText.textContent = segs.map(s => s.text).join("");        // measure full height
  mascot.style.top = (bubble.offsetTop + bubble.offsetHeight + MASCOT_GAP) + "px";
  bubbleText.textContent = "";                                     // clear, ready to type

  setTimeout(() => {
    mascot.classList.add("show");
    bubble.classList.add("show");
    typeSegments(bubbleText, segs, SPEED);
  }, 300);
});

// turn a fragment of text + <em> nodes into [{text, italic}] segments
function fragToSegments(frag) {
  const segs = [];
  frag.childNodes.forEach(n => {
    if (n.nodeType === 3) segs.push({ text: n.textContent, italic: false });
    else if (n.tagName === "EM") segs.push({ text: n.textContent, italic: true });
    else segs.push({ text: n.textContent || "", italic: false });
  });
  return segs;
}

/* ============================================================
   StretchText: expandable nested text.
   Author writes, inside any page's content:
     <script type="text/plain" class="stretch-src">
       ... <<replace "short">>longer text, may nest <<replace "x">>...<<endreplace>><<endreplace>> ...
     </script>
   Clicking the short phrase expands it to the long version (which
   can hold more clickable phrases); a small ▴ collapses it again.
   ============================================================ */
function renderStretchTexts(root) {
  root.querySelectorAll("script.stretch-src").forEach(scr => {
    const src = scr.textContent.replace(/\s+/g, " ").trim();
    const div = document.createElement("div");
    div.className = "stretch-text";
    renderNodes(parseStretch(src), div);
    scr.parentNode.insertBefore(div, scr);
    scr.remove();
  });
}

// parse the custom syntax into a tree of {type:'html'} / {type:'replace'} nodes
function parseStretch(src) {
  const re = /<<replace\s+"([^"]*)"\s*>>|<<endreplace>>/g;
  const root = { children: [] };
  const stack = [root];
  let pos = 0, m;
  while ((m = re.exec(src)) !== null) {
    const text = src.slice(pos, m.index);
    if (text) stack[stack.length - 1].children.push({ type: "html", value: text });
    if (m[0].indexOf("<<replace") === 0) {
      const node = { type: "replace", cap: m[1], children: [] };
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (stack.length > 1) {
      stack.pop();
    }
    pos = re.lastIndex;
  }
  const tail = src.slice(pos);
  if (tail) stack[stack.length - 1].children.push({ type: "html", value: tail });
  return root.children;
}

function renderNodes(nodes, container) {
  nodes.forEach(n => {
    if (n.type === "html") {
      const tmp = document.createElement("span");
      tmp.innerHTML = n.value;                 // keeps inline <a> links
      while (tmp.firstChild) container.appendChild(tmp.firstChild);
    } else {
      container.appendChild(makeStretch(n));
    }
  });
}

function makeStretch(node) {
  const wrap = document.createElement("span");
  wrap.className = "stretch collapsed";

  const trigger = document.createElement("span");
  trigger.className = "trigger";
  trigger.textContent = node.cap;

  const body = document.createElement("span");
  body.className = "stretch-body";
  renderNodes(node.children, body);

  const collapse = document.createElement("span");
  collapse.className = "collapse-btn";
  collapse.textContent = "▴";
  collapse.title = "collapse";

  wrap.append(trigger, body, collapse);

  trigger.addEventListener("click", e => {
    e.stopPropagation();
    wrap.classList.replace("collapsed", "expanded");
  });
  collapse.addEventListener("click", e => {
    e.stopPropagation();
    wrap.classList.replace("expanded", "collapsed");
  });
  return wrap;
}

/* ============================================================
   Random Flash game player (Ruffle).
   Drop <div class="random-game"></div> into a page's content and
   it becomes a centred clickable line that loads a random .swf.
   Source: public Flash-game archives on GitHub, served via the
   jsDelivr CDN and emulated in-browser by Ruffle.
   ============================================================ */
const GAMES = [
  { name: "Mutilate-a-Doll",  url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/mutilateadoll.swf" },
  { name: "Reach the Core",   url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/reachthecore.swf" },
  { name: "Terrasavr",        url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/terrasavr.swf" },
  { name: "Papa's Bakeria",   url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/papasbakeria_101.swf" },
  { name: "Papa's Cheeseria", url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/papascheeseria_102.swf" },
  { name: "Papa's Donuteria", url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/papasdonuteria_102.swf" },
  { name: "Papa's Pastaria",  url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/papaspastaria_v2.swf" },
  { name: "Papa's Scooperia", url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/papasscooperia_v102.swf" },
  { name: "Papa's Sushiria",  url: "https://cdn.jsdelivr.net/gh/HamsterThatCommitsStuff/SWF-Archive@master/papassushiria_101.swf" },
  { name: "Rumble",           url: "https://cdn.jsdelivr.net/gh/Noagi6493/FlashGamesArchive@main/Rumble_Newgrounds.swf" },
];
const DEFAULT_GAME_LABEL = "Click here to play a random Flash game from the GitHub Flash Game Archive";

function setupRandomGames(root) {
  root.querySelectorAll(".random-game").forEach(el => {
    const label = el.dataset.label || DEFAULT_GAME_LABEL;
    el.innerHTML = `
      <p class="play-line"><span class="play-trigger" role="button" tabindex="0">${label}</span></p>
      <div class="player-frame" hidden>
        <div class="game-host"></div>
        <div class="player-status hidden"></div>
      </div>`;
    const trigger = el.querySelector(".play-trigger");
    const frame   = el.querySelector(".player-frame");
    const host    = el.querySelector(".game-host");
    const status  = el.querySelector(".player-status");
    const play = () => { frame.hidden = false; loadRandomGame(host, status); };
    trigger.addEventListener("click", play);
    trigger.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); play(); } });
  });
}

// load Ruffle from the CDN on demand (only the first time it's needed)
let rufflePromise = null;
const RUFFLE_BASE = "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@latest/";
function ensureRuffle() {
  if (window.RufflePlayer && window.RufflePlayer.newest) return Promise.resolve();
  if (rufflePromise) return rufflePromise;
  // tell Ruffle where to fetch its .wasm from (needed when loaded off a CDN)
  window.RufflePlayer = window.RufflePlayer || {};
  window.RufflePlayer.config = Object.assign({ publicPath: RUFFLE_BASE }, window.RufflePlayer.config || {});
  rufflePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = RUFFLE_BASE + "ruffle.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return rufflePromise;
}
function whenRuffleReady(cb) {
  if (window.RufflePlayer && window.RufflePlayer.newest) return cb();
  const t = setInterval(() => {
    if (window.RufflePlayer && window.RufflePlayer.newest) { clearInterval(t); cb(); }
  }, 50);
  setTimeout(() => clearInterval(t), 10000);
}

function loadRandomGame(host, status) {
  const game = GAMES[Math.floor(Math.random() * GAMES.length)];
  playSwf(host, status, game.url, game.name);
}

// load a specific .swf into a host element via Ruffle
function playSwf(host, status, url, name) {
  status.classList.remove("hidden");
  status.textContent = name ? "loading " + name + "…" : "loading…";
  ensureRuffle().then(() => whenRuffleReady(() => {
    const ruffle = window.RufflePlayer.newest();
    host.innerHTML = "";                       // fresh player each time
    const player = ruffle.createPlayer();
    host.appendChild(player);
    player.load({ url: url, autoplay: "on", unmuteOverlay: "visible", scale: "showAll" })
      .then(() => status.classList.add("hidden"))
      .catch(err => {
        console.error(err);
        status.classList.remove("hidden");
        status.textContent = (name ? "couldn't load " + name : "couldn't load this game") + " — try again";
      });
  })).catch(() => {
    status.classList.remove("hidden");
    status.textContent = "couldn't load the Flash player — check your connection";
  });
}

/* ============================================================
   Specific Flash game player.
   Drop <div class="flash-player" data-swf="URL_TO.swf"></div> into a
   page. Shows a frame; click it to load that one game with Ruffle.
   ============================================================ */
function setupFlashPlayers(root) {
  root.querySelectorAll(".flash-player").forEach(el => {
    const url = (el.dataset.swf || "").trim();
    el.innerHTML = `
      <div class="player-frame">
        <div class="game-host"></div>
        <div class="player-status"></div>
      </div>`;
    const frame  = el.querySelector(".player-frame");
    const host   = el.querySelector(".game-host");
    const status = el.querySelector(".player-status");
    if (!url) {
      status.textContent = "把 .swf 链接填进 data-swf 即可加载游戏";
      return;
    }
    status.textContent = "▶ click to play";
    frame.style.cursor = "pointer";
    const start = () => { frame.removeEventListener("click", start); playSwf(host, status, url); };
    frame.addEventListener("click", start);
  });
}

/* ============================================================
   Are.na archive grid with category filters.
   Drop <div class="arena-archive"></div> into a page's content.
   Pulls blocks from the sub-channels of are.na/.../game-archives
   and shows them as cards with an  all | archive | live | decay  filter.
   ============================================================ */
const ARENA_CATS = [
  { cat: "archive", slug: "ga-type-archive" },
  { cat: "live",    slug: "ga-type-live" },
  { cat: "decay",   slug: "ga-type-decay" },
];
const ARENA_FILTERS = ["all", "archive", "live", "decay"];
const ARENA_DESC = {
  archive: "websites preserving Flash games after official support ended",
  live: "old Flash game websites still running through alternative plugins",
  decay: "Flash game websites in various states of breakdown",
};

function setupArenaArchives(root) {
  root.querySelectorAll(".arena-archive").forEach(el => {
    // Single-channel mode: data-channel="slug" (+ optional data-links="a.html, b.html"
    // to make the cards link to internal pages by order). No filter bar.
    if (el.hasAttribute("data-channel")) {
      const slug  = (el.dataset.channel || "").trim();
      const links = (el.dataset.links || "").split(",").map(s => s.trim()).filter(Boolean);
      const grid  = document.createElement("div");
      grid.className = "arena-grid";
      el.appendChild(grid);
      if (!slug) { grid.textContent = "把 are.na 频道 slug 填进 data-channel"; return; }
      grid.textContent = "loading…";
      loadArenaChannel(grid, slug, links);
      return;
    }

    // Default mode: the game-archives sub-channels with an all|archive|live|decay filter.
    const bar = document.createElement("div");
    bar.className = "arena-filter";
    ARENA_FILTERS.forEach((f, i) => {
      if (i) bar.appendChild(Object.assign(document.createElement("span"), { textContent: "|" }));
      const b = document.createElement("button");
      b.className = "af-btn" + (f === "all" ? " active" : "");
      b.dataset.cat = f;
      b.textContent = f;
      bar.appendChild(b);
    });
    const desc = document.createElement("div");
    desc.className = "arena-desc";
    desc.textContent = ARENA_DESC.all || "";   // "all" has no description

    const grid = document.createElement("div");
    grid.className = "arena-grid";
    grid.textContent = "loading…";

    el.append(bar, desc, grid);

    bar.addEventListener("click", e => {
      const btn = e.target.closest(".af-btn");
      if (!btn) return;
      bar.querySelectorAll(".af-btn").forEach(x => x.classList.toggle("active", x === btn));
      const cat = btn.dataset.cat;
      desc.textContent = ARENA_DESC[cat] || "";
      grid.querySelectorAll(".arena-card").forEach(card => {
        card.hidden = !(cat === "all" || card.dataset.cat === cat);
      });
    });

    loadArena(grid);
  });
}

// fetch one channel and render its blocks; links[i] makes card i link internally
function loadArenaChannel(grid, slug, links) {
  fetch(`https://api.are.na/v2/channels/${slug}?per=100`)
    .then(r => r.json())
    .then(d => {
      grid.textContent = "";
      const items = d.contents || [];
      items.forEach((b, i) => grid.appendChild(makeArenaCard(b, null, links[i])));
      if (!items.length) grid.textContent = "Nothing here yet.";
    })
    .catch(() => { grid.textContent = "Couldn't load this channel."; });
}

function loadArena(grid) {
  Promise.all(ARENA_CATS.map(c =>
    fetch(`https://api.are.na/v2/channels/${c.slug}?per=100`)
      .then(r => r.json())
      .then(d => ({ cat: c.cat, items: d.contents || [] }))
      .catch(() => ({ cat: c.cat, items: [] }))
  )).then(results => {
    grid.textContent = "";
    let n = 0;
    results.forEach(({ cat, items }) => items.forEach(b => {
      grid.appendChild(makeArenaCard(b, cat));
      n++;
    }));
    if (!n) grid.textContent = "Nothing to show yet.";
  }).catch(() => { grid.textContent = "Couldn't load the archive."; });
}

function makeArenaCard(b, cat, internalHref) {
  const src = b.source || {};
  const img = b.image && ((b.image.display && b.image.display.url) || (b.image.thumb && b.image.thumb.url));

  const a = document.createElement("a");
  a.className = "arena-card";
  if (internalHref) {
    a.href = internalHref;                     // link to another page on this site
  } else {
    a.href = src.url || (b.id ? `https://www.are.na/block/${b.id}` : "#");
    a.target = "_blank"; a.rel = "noopener";
  }
  if (cat) a.dataset.cat = cat;

  const thumb = document.createElement("div");
  thumb.className = "ac-thumb";
  if (img) {
    const im = document.createElement("img");
    im.src = img; im.alt = ""; im.loading = "lazy";
    thumb.appendChild(im);
  } else {
    thumb.classList.add("ac-noimg");
  }
  a.appendChild(thumb);

  // internal-link cards show the image only; external cards add title + description
  if (!internalHref) {
    const title = decodeEntities(b.title || b.generated_title || src.title || "(untitled)");
    const desc = b.description ? decodeEntities(b.description) : "";
    const body = document.createElement("div");
    body.className = "ac-body";
    const t = document.createElement("div");
    t.className = "ac-title"; t.textContent = title;
    body.appendChild(t);
    if (desc) {
      const d = document.createElement("div");
      d.className = "ac-desc"; d.textContent = desc;
      body.appendChild(d);
    }
    a.appendChild(body);
  }
  return a;
}

/* ============================================================
   Embed a local HTML page (e.g. a styled comment feed) as an
   auto-resizing iframe. <div class="memory-embed" data-src="x.html">
   The iframe grows to its content height (no inner scrollbar).
   ============================================================ */
function setupEmbeds(root) {
  root.querySelectorAll(".memory-embed").forEach(el => {
    const src = (el.dataset.src || "").trim();
    if (!src) { el.textContent = "把评论区 HTML 文件名填进 data-src"; return; }
    const f = document.createElement("iframe");
    f.className = "embed-frame";
    f.src = src;
    f.addEventListener("load", () => {
      const fit = () => { try { f.style.height = f.contentDocument.documentElement.scrollHeight + "px"; } catch (e) {} };
      fit();
      try {
        const doc = f.contentDocument;
        if (window.ResizeObserver) new ResizeObserver(fit).observe(doc.body);
        doc.querySelectorAll("img").forEach(img => { if (!img.complete) img.addEventListener("load", fit); });
      } catch (e) { f.style.height = "600px"; }
    });
    el.appendChild(f);
  });
}

// decode HTML entities (e.g. &amp; -> &) safely, returning plain text
function decodeEntities(s) {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

// type segments into a container, character by character
function typeSegments(container, segments, speed, done) {
  let si = 0, ci = 0, cur = null;
  (function step() {
    if (si >= segments.length) { if (done) done(); return; }
    const seg = segments[si];
    const chars = [...seg.text];
    if (ci === 0) {
      cur = document.createElement(seg.italic ? "em" : "span");
      container.appendChild(cur);
    }
    if (ci < chars.length) {
      cur.textContent += chars[ci++];
      setTimeout(step, speed);
    } else {
      si++; ci = 0; setTimeout(step, speed);
    }
  })();
}
