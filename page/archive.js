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

const SPEED = 28; // ms per character (typing speed)

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

  // wire up any <div class="arena-archive"> placeholders
  setupArenaArchives(document.getElementById("mainPanel"));

  // reveal mascot + speech bubble, then type the words out
  const bubble = document.getElementById("bubble");
  const mascot = document.getElementById("mascot");
  const bubbleText = document.getElementById("bubbleText");

  setTimeout(() => {
    mascot.classList.add("show");
    bubble.classList.add("show");
    typeSegments(bubbleText, fragToSegments(speechFrag), SPEED);
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
function ensureRuffle() {
  if (window.RufflePlayer && window.RufflePlayer.newest) return Promise.resolve();
  if (rufflePromise) return rufflePromise;
  rufflePromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@latest/ruffle.js";
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
  status.classList.remove("hidden");
  status.textContent = "loading…";
  ensureRuffle().then(() => whenRuffleReady(() => {
    const game = GAMES[Math.floor(Math.random() * GAMES.length)];
    status.textContent = "loading " + game.name + "…";
    const ruffle = window.RufflePlayer.newest();
    host.innerHTML = "";                       // fresh player each time
    const player = ruffle.createPlayer();
    host.appendChild(player);
    player.load({ url: game.url, autoplay: "on", unmuteOverlay: "visible", scale: "showAll" })
      .then(() => status.classList.add("hidden"))
      .catch(err => {
        console.error(err);
        status.classList.remove("hidden");
        status.textContent = "couldn't load " + game.name + " — click the link to try another";
      });
  })).catch(() => {
    status.classList.remove("hidden");
    status.textContent = "couldn't load the Flash player — check your connection";
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

function setupArenaArchives(root) {
  root.querySelectorAll(".arena-archive").forEach(el => {
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
    const grid = document.createElement("div");
    grid.className = "arena-grid";
    grid.textContent = "loading…";

    el.append(bar, grid);

    bar.addEventListener("click", e => {
      const btn = e.target.closest(".af-btn");
      if (!btn) return;
      bar.querySelectorAll(".af-btn").forEach(x => x.classList.toggle("active", x === btn));
      const cat = btn.dataset.cat;
      grid.querySelectorAll(".arena-card").forEach(card => {
        card.hidden = !(cat === "all" || card.dataset.cat === cat);
      });
    });

    loadArena(grid);
  });
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

function makeArenaCard(b, cat) {
  const src = b.source || {};
  const href = src.url || (b.id ? `https://www.are.na/block/${b.id}` : "#");
  const img = b.image && ((b.image.display && b.image.display.url) || (b.image.thumb && b.image.thumb.url));
  const title = decodeEntities(b.title || b.generated_title || src.title || "(untitled)");
  const desc = b.description ? decodeEntities(b.description) : "";

  const a = document.createElement("a");
  a.className = "arena-card";
  a.href = href; a.target = "_blank"; a.rel = "noopener";
  a.dataset.cat = cat;

  const thumb = document.createElement("div");
  thumb.className = "ac-thumb";
  if (img) {
    const im = document.createElement("img");
    im.src = img; im.alt = ""; im.loading = "lazy";
    thumb.appendChild(im);
  } else {
    thumb.classList.add("ac-noimg");
  }

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

  a.append(thumb, body);
  return a;
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
