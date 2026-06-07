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
