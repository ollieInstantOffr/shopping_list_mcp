import { groupShoppingList, formatIngredient } from './plan.js';
import { strings } from './render.js';

/**
 * JSON for embedding inside a <script> block. HTML entities are not decoded in
 * script content, so the value must be escaped as JS, not as HTML — and `<`
 * must never survive verbatim or a recipe containing "</script>" ends the block.
 */
export function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STYLE = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --paper:#fbf7f0; --card:#fffdf9; --ink:#241d16; --muted:#7d6f60;
  --line:#e8dfd1; --accent:#c2521f; --accent-soft:#f6e6dc; --done:#a99c8c;
  --shadow:0 1px 2px rgba(60,40,20,.06),0 8px 24px rgba(60,40,20,.05);
}
@media (prefers-color-scheme:dark){:root{
  --paper:#16130f; --card:#1e1a15; --ink:#f2ece3; --muted:#a2947f;
  --line:#31291f; --accent:#f08a4b; --accent-soft:#2e2117; --done:#6a5e4e;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.25);
}}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);
  font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  padding-bottom:calc(96px + env(safe-area-inset-bottom));
  -webkit-font-smoothing:antialiased}
.wrap{max-width:34rem;margin:0 auto;padding:2rem 1.15rem 0}
h1{font-family:"Iowan Old Style",Georgia,serif;font-weight:600;font-size:2rem;
  line-height:1.15;letter-spacing:-.015em;margin:0 0 .6rem;text-wrap:balance}
.summary{color:var(--muted);margin:.1rem 0 1rem}
.chips{display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 1.75rem;padding:0;list-style:none}
.chip{font-size:.8125rem;padding:.22rem .6rem;border-radius:100px;
  background:var(--accent-soft);color:var(--accent);font-weight:560;white-space:nowrap}
.chip.plain{background:transparent;color:var(--muted);border:1px solid var(--line)}
h2{font-size:.78rem;font-weight:680;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);margin:2.25rem 0 .75rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;
  box-shadow:var(--shadow);overflow:hidden}
.aisle{font-size:.75rem;font-weight:650;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);padding:.85rem 1rem .35rem}
.aisle:not(:first-child){border-top:1px solid var(--line);margin-top:.35rem;padding-top:.9rem}
.aisle+ul.rows>.row:first-child{border-top:0}
ul.rows{margin:0;padding:0;list-style:none}
.row{display:flex;align-items:flex-start;gap:.75rem;padding:.7rem 1rem;
  border-top:1px solid var(--line);cursor:pointer;user-select:none;
  -webkit-tap-highlight-color:transparent}
.row:first-child{border-top:0}
.box{flex:0 0 22px;height:22px;margin-top:1px;border:2px solid var(--line);border-radius:7px;
  display:grid;place-items:center;transition:background .15s,border-color .15s}
.box svg{width:13px;height:13px;opacity:0;transform:scale(.6);transition:opacity .15s,transform .15s}
.row[aria-checked=true] .box{background:var(--accent);border-color:var(--accent)}
.row[aria-checked=true] .box svg{opacity:1;transform:scale(1)}
.row[aria-checked=true] .label{color:var(--done);text-decoration:line-through}
.label{flex:1}
.qty{font-variant-numeric:tabular-nums;font-weight:600}
.progress{display:flex;justify-content:space-between;align-items:center;gap:1rem;
  font-size:.8125rem;color:var(--muted);margin:.7rem .25rem 0}
.progress button{font:inherit;color:var(--accent);background:none;border:0;padding:.25rem;cursor:pointer}
.pantry{padding:.9rem 1rem;color:var(--muted);font-size:.9rem}
.pantry ul{margin:.4rem 0 0;padding-left:1.1rem}
.pantry li{margin:.15rem 0}
.recipe{padding:1rem}
.recipe ul{margin:0;padding-left:1.15rem}
.recipe li{margin:.3rem 0}
ol.steps{margin:0;padding:0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:.75rem 1rem .75rem 3rem;
  border-top:1px solid var(--line)}
ol.steps li:first-child{border-top:0}
ol.steps li::before{content:counter(s);position:absolute;left:1rem;top:.8rem;
  width:1.4rem;height:1.4rem;border-radius:100px;background:var(--accent-soft);color:var(--accent);
  font-size:.8125rem;font-weight:680;display:grid;place-items:center;font-variant-numeric:tabular-nums}
.bar{position:fixed;left:0;right:0;bottom:0;z-index:10;
  padding:.75rem 1.15rem calc(.75rem + env(safe-area-inset-bottom));
  background:color-mix(in srgb,var(--paper) 88%,transparent);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  border-top:1px solid var(--line)}
.bar-inner{max-width:34rem;margin:0 auto;display:flex;gap:.6rem}
button.act{flex:1;font:inherit;font-weight:640;padding:.85rem 1rem;border-radius:12px;
  border:1px solid var(--line);background:var(--card);color:var(--ink);cursor:pointer;
  -webkit-tap-highlight-color:transparent}
button.act.primary{flex:2;background:var(--accent);border-color:var(--accent);color:#fff}
button.act:active{transform:translateY(1px)}
.hint{max-width:34rem;margin:.55rem auto 0;font-size:.8125rem;color:var(--muted);
  text-align:center;line-height:1.4}
.hint b{color:var(--ink)}
footer{text-align:center;color:var(--muted);font-size:.8125rem;margin:2.5rem 0 1rem}
footer a{color:var(--muted)}
`;

const CHECK_SVG =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function shell({ title, body, lang = 'no' }) {
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#fbf7f0" media="(prefers-color-scheme:light)">
<meta name="theme-color" content="#16130f" media="(prefers-color-scheme:dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderPlanPage({ id, plan, noteText, baseUrl }) {
  const t = strings(plan.language);
  const { groups, atHome } = groupShoppingList(plan.ingredients);
  const buyCount = groups.reduce((n, g) => n + g.items.length, 0);

  const chips = [
    `<li class="chip">${esc(plan.servings_note)}</li>`,
    `<li class="chip">${esc(plan.total_time_minutes)} ${esc(t.minutes)}</li>`,
    ...(plan.tags || []).map((tag) => `<li class="chip plain">${esc(tag)}</li>`),
  ].join('');

  const listHtml = groups
    .map(
      (g) =>
        `<div class="aisle">${esc(g.category)}</div><ul class="rows">` +
        g.items
          .map((item, i) => {
            const key = `${g.category}::${item.item}::${i}`;
            return `<li class="row" role="checkbox" aria-checked="false" tabindex="0" data-key="${esc(key)}">
  <span class="box">${CHECK_SVG}</span>
  <span class="label">${item.quantity ? `<span class="qty">${esc(item.quantity)}</span> ` : ''}${esc(item.item)}</span>
</li>`;
          })
          .join('') +
        `</ul>`,
    )
    .join('');

  const pantryHtml = atHome.length
    ? `<h2>${esc(t.atHome)}</h2><div class="card"><div class="pantry"><ul>${atHome
        .map((i) => `<li>${esc(formatIngredient(i))}</li>`)
        .join('')}</ul></div></div>`
    : '';

  const tipsHtml = plan.tips?.length
    ? `<h2>${esc(t.tips)}</h2><div class="card"><div class="recipe"><ul>${plan.tips
        .map((tip) => `<li>${esc(tip)}</li>`)
        .join('')}</ul></div></div>`
    : '';

  const body = `<main class="wrap">
  <h1>${esc(plan.title)}</h1>
  ${plan.summary ? `<p class="summary">${esc(plan.summary)}</p>` : ''}
  <ul class="chips">${chips}</ul>

  <h2>${esc(t.shoppingList)}</h2>
  <div class="card" id="list">${listHtml}</div>
  <p class="progress"><span id="count"></span><button type="button" id="reset">${esc(t.reset)}</button></p>

  ${pantryHtml}

  <h2>${esc(t.ingredients)}</h2>
  <div class="card"><div class="recipe"><ul>${plan.ingredients
    .map((i) => `<li>${esc(formatIngredient(i))}</li>`)
    .join('')}</ul></div></div>

  <h2>${esc(t.method)}</h2>
  <div class="card"><ol class="steps">${plan.steps
    .map((s) => `<li>${esc(s)}</li>`)
    .join('')}</ol></div>

  ${tipsHtml}

  <footer>
    <a href="${esc(baseUrl)}/n/${esc(id)}.txt">${esc(t.plainText)}</a>
  </footer>
</main>

<div class="bar">
  <div class="bar-inner">
    <button class="act primary" id="share" type="button">${esc(t.addToNotes)}</button>
    <button class="act" id="copy" type="button">${esc(t.copy)}</button>
  </div>
  <p class="hint" id="hint">${t.shareHint}</p>
</div>

<script>
(function () {
  var note = ${jsonForScript(noteText)};
  var title = ${jsonForScript(plan.title)};
  var S = ${jsonForScript({
    copied: t.copied,
    copiedHint: t.copiedHint,
    shareHint: t.shareHint,
    addToNotes: t.addToNotes,
    copy: t.copy,
    checkedOff: t.checkedOff,
    noShareHint: t.noShareHint,
  })};
  var total = ${buyCount};
  var storeKey = 'foodgen:' + ${jsonForScript(id)};

  // --- checkable shopping list, remembered on this device only ---
  var checked = {};
  try { checked = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch (e) {}
  var rows = [].slice.call(document.querySelectorAll('.row'));
  var countEl = document.getElementById('count');

  function persist() {
    try { localStorage.setItem(storeKey, JSON.stringify(checked)); } catch (e) {}
  }
  function paint() {
    var n = 0;
    rows.forEach(function (row) {
      var on = !!checked[row.dataset.key];
      row.setAttribute('aria-checked', on ? 'true' : 'false');
      if (on) n++;
    });
    countEl.textContent = n + ' / ' + total + ' ' + S.checkedOff;
  }
  function toggle(row) {
    var k = row.dataset.key;
    if (checked[k]) { delete checked[k]; } else { checked[k] = 1; }
    persist();
    paint();
  }
  rows.forEach(function (row) {
    row.addEventListener('click', function () { toggle(row); });
    row.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(row); }
    });
  });
  document.getElementById('reset').addEventListener('click', function () {
    checked = {}; persist(); paint();
  });
  paint();

  // --- getting the text into Apple Notes ---
  var hint = document.getElementById('hint');
  var copyBtn = document.getElementById('copy');
  var shareBtn = document.getElementById('share');

  function flash(btn, label, restore) {
    btn.textContent = label;
    setTimeout(function () { btn.textContent = restore; }, 1800);
  }
  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = note;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, note.length);
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  function doCopy() {
    var btn = copyBtn.hidden ? shareBtn : copyBtn;
    var done = function () {
      flash(btn, S.copied, S.copy);
      hint.innerHTML = S.copiedHint;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(note).then(done, function () { fallbackCopy(); done(); });
    } else {
      fallbackCopy();
      done();
    }
  }
  copyBtn.addEventListener('click', doCopy);

  if (!navigator.share) {
    // No share sheet (desktop Chrome, Firefox) — both buttons copy, so say that
    // rather than pointing at a share flow this browser cannot offer.
    shareBtn.textContent = S.copy;
    shareBtn.addEventListener('click', doCopy);
    copyBtn.hidden = true;
    hint.innerHTML = S.noShareHint;
  } else {
    shareBtn.addEventListener('click', function () {
      // Text-only payload: iOS then offers Notes, which saves it as a new note.
      navigator.share({ title: title, text: note }).catch(function () {});
    });
  }
})();
</script>`;

  return shell({ title: plan.title, body, lang: plan.language || 'no' });
}

export function renderNotFound(lang = 'no') {
  const t = strings(lang);
  return shell({
    title: t.notFound,
    lang,
    body: `<main class="wrap"><h1>${esc(t.notFound)}</h1><p class="summary">${esc(t.notFoundBody)}</p></main>`,
  });
}

const LANDING_STYLE = `
.lede{font-size:1.075rem;color:var(--muted);margin:0 0 2rem;text-wrap:pretty}
.url{display:flex;gap:.5rem;align-items:center;background:var(--card);border:1px solid var(--line);
  border-radius:12px;padding:.6rem .6rem .6rem .85rem;box-shadow:var(--shadow)}
.url code{flex:1;overflow-x:auto;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:.875rem;scrollbar-width:none}
.url code::-webkit-scrollbar{display:none}
.url button{font:inherit;font-size:.8125rem;font-weight:640;padding:.45rem .8rem;border-radius:8px;
  border:0;background:var(--accent);color:#fff;cursor:pointer;flex:0 0 auto}
.doc{padding:.35rem 1rem 1rem}
.doc p{margin:.7rem 0}
.doc ol{margin:.7rem 0;padding-left:1.25rem}
.doc li{margin:.35rem 0}
.doc code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;
  background:var(--accent-soft);color:var(--accent);padding:.1em .35em;border-radius:5px}
pre{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:.75rem .85rem;
  overflow-x:auto;font-size:.8125rem;margin:.6rem 0 0;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
blockquote{margin:0;padding:.9rem 1rem;border-left:3px solid var(--accent);
  background:var(--accent-soft);border-radius:0 10px 10px 0;font-style:italic}
`;

export function renderLanding(baseUrl) {
  const mcpUrl = `${baseUrl}/mcp`;
  const body = `<style>${LANDING_STYLE}</style>
<main class="wrap">
  <h1>FoodGen</h1>
  <p class="lede">Be Claude om middag. Få tilbake en lenke du åpner på mobilen — handleliste du kan huke av i butikken, og oppskriften under. Trykk «Legg i Notater» for å lagre alt i Notater.</p>

  <h2>Slik spør du</h2>
  <blockquote>Middag til 3 personer (2 voksne og 1 barn), rask før fotballtrening, ikke fisk.</blockquote>

  <h2>Koble til</h2>
  <div class="url"><code id="url">${esc(mcpUrl)}</code><button type="button" id="copy">Kopier</button></div>

  <h2>Claude-appen og claude.ai</h2>
  <div class="card"><div class="doc">
    <ol>
      <li>Åpne <b>Settings → Connectors</b>.</li>
      <li>Velg <b>Add custom connector</b>.</li>
      <li>Lim inn adressen over. La autentisering stå tom.</li>
    </ol>
    <p>Serveren dukker opp som <code>foodgen</code>, med kommandoen <code>/middag</code>.</p>
  </div></div>

  <h2>Claude Cowork</h2>
  <div class="card"><div class="doc">
    <p>Samme framgangsmåte — Cowork bruker koblingene fra kontoen din, så en tilkobling i Claude-appen gjelder begge steder.</p>
  </div></div>

  <h2>Claude Code</h2>
  <div class="card"><div class="doc">
    <p>Kjør én gang i terminalen:</p>
    <pre>claude mcp add --transport http foodgen ${esc(mcpUrl)}</pre>
    <p>Legg til <code>--scope user</code> hvis du vil ha den tilgjengelig i alle prosjekter.</p>
  </div></div>

  <h2>Personvern</h2>
  <div class="card"><div class="doc">
    <p>Hver middag får en tilfeldig adresse på 128 bit. Den er ikke søkbar og kan ikke gjettes, men alle som har lenken kan åpne den. Del den deretter.</p>
  </div></div>

  <footer>foodgen</footer>
</main>
<script>
document.getElementById('copy').addEventListener('click', function () {
  var btn = this;
  var text = document.getElementById('url').textContent;
  var done = function () { btn.textContent = 'Kopiert!'; setTimeout(function () { btn.textContent = 'Kopier'; }, 1800); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, done);
  } else { done(); }
});
</script>`;
  return shell({ title: 'FoodGen', body, lang: 'no' });
}
