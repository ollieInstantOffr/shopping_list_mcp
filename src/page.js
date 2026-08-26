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

/** Faint paper grain laid over the whole page; reads in both themes. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.045 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

const STYLE = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --paper:#f5efe3; --card:#fdfaf2; --ink:#29221a; --muted:#877965;
  --line:#e2d7c2; --line-soft:#ebe2cf;
  --accent:#b23c17; --accent-ink:#fff6f1; --accent-soft:#f2e0d3;
  --herb:#5e6f41; --done:#b3a68f;
  --shadow:0 1px 2px rgba(74,52,28,.05),0 12px 40px -12px rgba(74,52,28,.12);
  --serif:"Fraunces","Iowan Old Style",Georgia,serif;
  --sans:"Instrument Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
@media (prefers-color-scheme:dark){:root{
  --paper:#171310; --card:#211b15; --ink:#efe7d8; --muted:#9d8f7a;
  --line:#352c21; --line-soft:#2b241b;
  --accent:#e5713d; --accent-ink:#1d120b; --accent-soft:#3a2417;
  --herb:#93a06c; --done:#6b5f4d;
  --shadow:0 1px 2px rgba(0,0,0,.5),0 14px 44px -12px rgba(0,0,0,.5);
}}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--sans);font-size:16.5px;line-height:1.6;
  -webkit-font-smoothing:antialiased;position:relative}
body::before{content:"";position:fixed;inset:0;background:${GRAIN};
  pointer-events:none;z-index:1000}
a{color:var(--accent)}

/* ---------- reveal ---------- */
@media (prefers-reduced-motion:no-preference){
  .rise{opacity:0;transform:translateY(14px);
    animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards}
  .rise.d1{animation-delay:.08s}.rise.d2{animation-delay:.16s}
  .rise.d3{animation-delay:.24s}.rise.d4{animation-delay:.32s}
  @keyframes rise{to{opacity:1;transform:none}}
}

/* ---------- masthead ---------- */
.masthead{display:flex;justify-content:center;align-items:center;gap:.9rem;
  padding:1.4rem 1.25rem .2rem;color:var(--muted)}
.masthead::before,.masthead::after{content:"";height:1px;flex:0 1 4.5rem;background:var(--line)}
.masthead a{font-size:.72rem;font-weight:650;letter-spacing:.32em;text-transform:uppercase;
  color:inherit;text-decoration:none;white-space:nowrap}

/* ---------- hero ---------- */
.wrap{max-width:1080px;margin:0 auto;padding:0 1.25rem}
.hero{position:relative;text-align:center;padding:1.6rem 0 2.4rem;max-width:44rem;margin:0 auto}
h1{font-family:var(--serif);font-weight:600;font-size:clamp(2.15rem,5.5vw,3.4rem);
  line-height:1.06;letter-spacing:-.02em;margin:.4rem 0 .9rem;text-wrap:balance}
.summary{font-family:var(--serif);font-style:italic;font-weight:400;
  font-size:clamp(1.02rem,2.2vw,1.2rem);color:var(--muted);
  margin:0 auto 1.2rem;max-width:34rem;text-wrap:pretty}
.meta{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;
  gap:.3rem .75rem;margin:0;padding:0;list-style:none;
  font-size:.8rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.meta li{display:flex;align-items:center;gap:.75rem;white-space:nowrap}
.meta li+li::before{content:"·";color:var(--accent);font-size:1.1rem;line-height:0}
.stamp{position:absolute;top:-1.1rem;right:-1.2rem;width:5.2rem;height:5.2rem;border-radius:50%;
  border:2px dashed var(--accent);color:var(--accent);transform:rotate(8deg);
  display:flex;flex-direction:column;align-items:center;justify-content:center}
.stamp b{font-family:var(--serif);font-size:1.7rem;font-weight:600;line-height:1}
.stamp span{font-size:.6rem;font-weight:700;letter-spacing:.28em;text-transform:uppercase;margin-top:.15rem}
@media (max-width:719px){
  .hero{text-align:left;padding-top:1.1rem}
  .summary{margin-left:0}
  .meta{justify-content:flex-start}
  .stamp{position:static;transform:rotate(-7deg);margin:1.1rem 0 -.4rem;
    width:4.6rem;height:4.6rem}
  .stamp b{font-size:1.5rem}
  .masthead{justify-content:flex-start}
  .masthead::before{display:none}
  .masthead::after{flex:1}
}

/* ---------- spread ---------- */
.spread{display:grid;gap:2.5rem;padding-bottom:3rem}
@media (min-width:900px){
  .spread{grid-template-columns:minmax(330px,5fr) 7fr;gap:3.5rem;align-items:start}
  .col-list{position:sticky;top:1.5rem}
}

h2{display:flex;align-items:center;gap:.7rem;
  font-size:.76rem;font-weight:700;letter-spacing:.26em;text-transform:uppercase;
  color:var(--ink);margin:0 0 .9rem}
h2::before{content:"";width:1.6rem;height:2px;background:var(--accent);flex:0 0 auto}
h2 small{font-size:inherit;font-weight:600;letter-spacing:.1em;color:var(--muted);margin-left:auto;
  font-variant-numeric:tabular-nums}
* + h2{margin-top:2.4rem}

.card{background:var(--card);border:1px solid var(--line);border-radius:4px;
  box-shadow:var(--shadow);position:relative}
.card::after{content:"";position:absolute;inset:5px;border:1px solid var(--line-soft);
  border-radius:2px;pointer-events:none}
.pad{padding:1.35rem 1.4rem;position:relative;z-index:1}

/* ---------- shopping list ---------- */
.aisle{font-size:.7rem;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
  color:var(--herb);padding:1.15rem 1.4rem .35rem}
.aisle:not(:first-child){margin-top:.4rem;border-top:1px solid var(--line-soft);padding-top:1.1rem}
ul.rows{margin:0;padding:0 1.4rem .4rem;list-style:none;position:relative;z-index:1}
.row{display:flex;align-items:baseline;gap:.7rem;padding:.5rem 0;cursor:pointer;
  user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
.box{flex:0 0 21px;height:21px;align-self:center;border:1.6px solid var(--muted);
  border-radius:50%;display:grid;place-items:center;
  transition:background .16s,border-color .16s,transform .16s}
.row:hover .box{border-color:var(--accent)}
.box svg{width:11px;height:11px;opacity:0;transform:scale(.5);transition:opacity .16s,transform .16s}
.row[aria-checked=true] .box{background:var(--accent);border-color:var(--accent);transform:scale(1.05)}
.row[aria-checked=true] .box svg{opacity:1;transform:scale(1)}
.row[aria-checked=true] .item,.row[aria-checked=true] .qty{color:var(--done)}
.row[aria-checked=true] .item{text-decoration:line-through;text-decoration-color:var(--accent)}
.item{flex-shrink:1}
.dots{flex:1;min-width:1.2rem;border-bottom:2px dotted var(--line);transform:translateY(-4px)}
.qty{color:var(--muted);font-size:.92rem;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.rm{flex:0 0 auto;align-self:center;width:22px;height:22px;border:0;border-radius:50%;
  background:none;color:var(--muted);font-size:1.05rem;line-height:1;cursor:pointer;
  display:grid;place-items:center;padding:0}
.rm:hover{color:var(--accent);background:var(--accent-soft)}
.addrow{display:flex;gap:.6rem;align-items:center;margin:.5rem 1.4rem 1.1rem;
  padding-top:.9rem;border-top:1px solid var(--line-soft);position:relative;z-index:1}
.addrow input{flex:1;min-width:0;font-family:var(--sans);font-size:.95rem;color:var(--ink);
  background:transparent;border:0;border-bottom:2px dotted var(--line);padding:.35rem 0;
  outline:none}
.addrow input:focus{border-bottom-color:var(--accent)}
.addrow input::placeholder{color:var(--muted);opacity:.8}
.addrow button{flex:0 0 auto;width:30px;height:30px;border-radius:50%;border:1.5px solid var(--accent);
  background:transparent;color:var(--accent);font-size:1.25rem;line-height:1;cursor:pointer;
  display:grid;place-items:center;padding:0;transition:background .15s,color .15s}
.addrow button:hover{background:var(--accent);color:var(--accent-ink)}
.progress{display:flex;justify-content:flex-end;align-items:baseline;
  font-size:.82rem;color:var(--muted);margin:.75rem .2rem 0;font-variant-numeric:tabular-nums}
.progress button{font:inherit;font-weight:650;color:var(--accent);background:none;border:0;
  padding:.2rem;cursor:pointer;letter-spacing:.02em}

.pantry{color:var(--muted);font-size:.95rem}
.pantry ul{margin:.1rem 0 0;padding:0;list-style:none;columns:2;column-gap:2rem}
.pantry li{margin:.2rem 0;break-inside:avoid;padding-left:1rem;position:relative}
.pantry li::before{content:"—";position:absolute;left:0;color:var(--herb)}
@media (max-width:479px){.pantry ul{columns:1}}

/* ---------- recipe ---------- */
ul.ing{margin:0;padding:1.35rem 1.4rem;list-style:none;position:relative;z-index:1}
ul.ing li{display:flex;align-items:baseline;gap:.7rem;padding:.42rem 0}
@media (min-width:640px){ul.ing{columns:2;column-gap:2.6rem}ul.ing li{break-inside:avoid}}
ol.steps{margin:0;padding:.5rem 1.4rem;list-style:none;counter-reset:s;position:relative;z-index:1}
ol.steps li{counter-increment:s;position:relative;padding:1.05rem 0 1.05rem 3rem;
  border-top:1px solid var(--line-soft);text-wrap:pretty}
ol.steps li:first-child{border-top:0}
ol.steps li::before{content:counter(s);position:absolute;left:.3rem;top:.78rem;
  font-family:var(--serif);font-size:1.75rem;font-weight:600;font-style:italic;
  color:var(--accent);font-variant-numeric:tabular-nums}
.tips{font-size:.97rem}
.tips ul{margin:0;padding:0;list-style:none}
.tips li{position:relative;padding:.35rem 0 .35rem 1.5rem}
.tips li::before{content:"※";position:absolute;left:0;top:.35rem;color:var(--herb)}

/* ---------- actions ---------- */
.bar{margin-top:1.4rem}
.bar-inner{display:flex;gap:.7rem}
button.act{flex:1;font-family:var(--sans);font-size:.95rem;font-weight:650;
  letter-spacing:.02em;padding:.9rem 1.1rem;border-radius:100px;cursor:pointer;
  border:1.5px solid var(--ink);background:transparent;color:var(--ink);
  transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}
button.act.primary{flex:1.6;background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
button.act:hover{transform:translateY(-1px);box-shadow:var(--shadow)}
button.act:active{transform:translateY(1px);box-shadow:none}
.hint{font-size:.82rem;color:var(--muted);text-align:center;line-height:1.5;margin:.7rem 0 0}
.hint b{color:var(--ink)}
@media (max-width:899px){
  body{padding-bottom:calc(110px + env(safe-area-inset-bottom))}
  .bar{position:fixed;left:0;right:0;bottom:0;z-index:20;margin:0;
    padding:.8rem 1.25rem calc(.8rem + env(safe-area-inset-bottom));
    background:color-mix(in srgb,var(--paper) 86%,transparent);
    backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
    border-top:1px solid var(--line)}
  .bar-inner{max-width:34rem;margin:0 auto}
  .hint{max-width:34rem;margin:.55rem auto 0}
}

footer{text-align:center;color:var(--muted);font-size:.8rem;letter-spacing:.06em;
  padding:0 1.25rem 2.5rem}
footer a{color:var(--muted)}
footer .fleuron{display:block;color:var(--accent);font-size:1rem;margin-bottom:.6rem}

/* ---------- print: take the list to the store on paper ---------- */
@media print{
  body{background:#fff;color:#000;padding:0}
  body::before,.masthead,.bar,.progress,footer,.stamp{display:none!important}
  .card{border:none;box-shadow:none}
  .card::after{display:none}
  .spread{display:block}
  .box{border-color:#000}
  .rise{opacity:1!important;transform:none!important;animation:none!important}
}
`;

const CHECK_SVG =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-ink)"/></svg>';

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400;1,9..144,600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`;

export function shell({ title, body, lang = 'no' }) {
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f5efe3" media="(prefers-color-scheme:light)">
<meta name="theme-color" content="#171310" media="(prefers-color-scheme:dark)">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
${FONTS}
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** item …dotted leader… quantity */
function leaderRow(ing) {
  return `<span class="item">${esc(ing.item)}</span><span class="dots" aria-hidden="true"></span>${
    ing.quantity ? `<span class="qty">${esc(ing.quantity)}</span>` : ''
  }`;
}

export function renderPlanPage({ id, plan, noteText, baseUrl }) {
  const t = strings(plan.language);
  const { groups, atHome } = groupShoppingList(plan.ingredients);
  const buyCount = groups.reduce((n, g) => n + g.items.length, 0);

  const meta = [
    `<li>${esc(plan.servings_note)}</li>`,
    ...(plan.tags || []).map((tag) => `<li>${esc(tag)}</li>`),
  ].join('');

  const listHtml = groups
    .map(
      (g) =>
        `<div class="aisle">${esc(g.category)}</div><ul class="rows">` +
        g.items
          .map((item, i) => {
            const key = `${g.category}::${item.item}::${i}`;
            return `<li class="row" role="checkbox" aria-checked="false" tabindex="0" data-key="${esc(key)}">
  <span class="box">${CHECK_SVG}</span>${leaderRow(item)}
</li>`;
          })
          .join('') +
        `</ul>`,
    )
    .join('');

  const extras = plan.extras || [];
  const extrasHtml = extras
    .map(
      (e) => `<li class="row" role="checkbox" aria-checked="false" tabindex="0" data-key="${esc(`extra::${e.id}`)}" data-extra="${esc(e.id)}">
  <span class="box">${CHECK_SVG}</span><span class="item">${esc(e.item)}</span><span class="dots" aria-hidden="true"></span><button type="button" class="rm" aria-label="&#10005;">&#10005;</button>
</li>`,
    )
    .join('');

  const pantryHtml = atHome.length
    ? `<h2>${esc(t.atHome)}</h2><div class="card"><div class="pad pantry"><ul>${atHome
        .map((i) => `<li>${esc(formatIngredient(i))}</li>`)
        .join('')}</ul></div></div>`
    : '';

  const tipsHtml = plan.tips?.length
    ? `<h2>${esc(t.tips)}</h2><div class="card"><div class="pad tips"><ul>${plan.tips
        .map((tip) => `<li>${esc(tip)}</li>`)
        .join('')}</ul></div></div>`
    : '';

  const body = `<header class="masthead rise"><a href="${esc(baseUrl)}/">Foodgen</a></header>
<div class="wrap">
  <section class="hero rise d1">
    <h1>${esc(plan.title)}</h1>
    ${plan.summary ? `<p class="summary">${esc(plan.summary)}</p>` : ''}
    <ul class="meta">${meta}</ul>
    <div class="stamp" aria-label="${esc(plan.total_time_minutes)} ${esc(t.minutes)}"><b>${esc(plan.total_time_minutes)}</b><span>${esc(t.minutes)}</span></div>
  </section>

  <div class="spread">
    <aside class="col-list rise d2">
      <h2>${esc(t.shoppingList)}<small id="count"></small></h2>
      <div class="card" id="list">${listHtml}
        <div class="aisle" id="extras-head"${extras.length ? '' : ' hidden'}>${esc(t.added)}</div>
        <ul class="rows" id="extras">${extrasHtml}</ul>
        <template id="boxtpl"><span class="box">${CHECK_SVG}</span></template>
        <form class="addrow" id="addform">
          <input id="additem" placeholder="${esc(t.addPlaceholder)}" maxlength="120" autocomplete="off" enterkeyhint="done">
          <button type="submit" aria-label="+">+</button>
        </form>
      </div>
      <p class="progress"><button type="button" id="reset">${esc(t.reset)}</button></p>
      ${pantryHtml}
      <div class="bar">
        <div class="bar-inner">
          <button class="act primary" id="share" type="button">${esc(t.addToNotes)}</button>
          <button class="act" id="copy" type="button">${esc(t.copy)}</button>
        </div>
        <p class="hint" id="hint">${t.shareHint}</p>
      </div>
    </aside>

    <article class="col-recipe rise d3">
      <h2>${esc(t.ingredients)}</h2>
      <div class="card"><ul class="ing">${plan.ingredients
        .map((ing) => `<li>${leaderRow(ing)}</li>`)
        .join('')}</ul></div>

      <h2>${esc(t.method)}</h2>
      <div class="card"><ol class="steps">${plan.steps
        .map((s) => `<li>${esc(s)}</li>`)
        .join('')}</ol></div>

      ${tipsHtml}
    </article>
  </div>
</div>

<footer class="rise d4">
  <span class="fleuron" aria-hidden="true">❦</span>
  <a href="${esc(baseUrl)}/n/${esc(id)}.txt">${esc(t.plainText)}</a>
</footer>

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
    addFailed: t.addFailed,
  })};
  var api = ${jsonForScript(`${baseUrl}/n/${id}`)};
  var storeKey = 'foodgen:' + ${jsonForScript(id)};

  // --- checkable shopping list; ticks are remembered on this device only ---
  var checked = {};
  try { checked = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch (e) {}
  var countEl = document.getElementById('count');

  function allRows() {
    return [].slice.call(document.querySelectorAll('.row'));
  }
  function persist() {
    try { localStorage.setItem(storeKey, JSON.stringify(checked)); } catch (e) {}
  }
  function paint() {
    var n = 0;
    var rows = allRows();
    rows.forEach(function (row) {
      var on = !!checked[row.dataset.key];
      row.setAttribute('aria-checked', on ? 'true' : 'false');
      if (on) n++;
    });
    countEl.textContent = n + ' / ' + rows.length;
  }
  function toggle(row) {
    var k = row.dataset.key;
    if (checked[k]) { delete checked[k]; } else { checked[k] = 1; }
    persist();
    paint();
  }
  function bindRow(row) {
    row.addEventListener('click', function () { toggle(row); });
    row.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(row); }
    });
  }
  allRows().forEach(bindRow);
  document.getElementById('reset').addEventListener('click', function () {
    checked = {}; persist(); paint();
  });
  paint();

  // --- extra items, shared with everyone who has the link ---
  var extrasUl = document.getElementById('extras');
  var extrasHead = document.getElementById('extras-head');
  var addForm = document.getElementById('addform');
  var addInput = document.getElementById('additem');

  // The note text is server-rendered; re-fetch it after every change so
  // share/copy always includes the current extras.
  function refreshNote() {
    fetch(api + '.txt').then(function (r) { return r.text(); }).then(function (txt) { note = txt; }).catch(function () {});
  }
  function removeExtra(row) {
    fetch(api + '/extras/' + row.dataset.extra, { method: 'DELETE' })
      .catch(function () {})
      .then(function () {
        delete checked[row.dataset.key];
        persist();
        row.remove();
        extrasHead.hidden = !extrasUl.children.length;
        paint();
        refreshNote();
      });
  }
  function buildExtraRow(extra) {
    var li = document.createElement('li');
    li.className = 'row';
    li.setAttribute('role', 'checkbox');
    li.setAttribute('aria-checked', 'false');
    li.tabIndex = 0;
    li.dataset.key = 'extra::' + extra.id;
    li.dataset.extra = extra.id;
    var box = document.getElementById('boxtpl').content.firstElementChild.cloneNode(true);
    var item = document.createElement('span');
    item.className = 'item';
    item.textContent = extra.item;
    var dots = document.createElement('span');
    dots.className = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    var rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'rm';
    rm.textContent = '\u2715';
    li.appendChild(box); li.appendChild(item); li.appendChild(dots); li.appendChild(rm);
    bindRow(li);
    return li;
  }
  extrasUl.addEventListener('click', function (e) {
    var rm = e.target.closest('.rm');
    if (!rm) return;
    e.stopPropagation();
    removeExtra(rm.closest('.row'));
  }, true);
  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var item = addInput.value.trim();
    if (!item) return;
    addInput.disabled = true;
    fetch(api + '/extras', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ item: item }),
    })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (res) {
        extrasUl.appendChild(buildExtraRow(res.extra));
        extrasHead.hidden = false;
        addInput.value = '';
        paint();
        refreshNote();
      })
      .catch(function () { alert(S.addFailed); })
      .then(function () { addInput.disabled = false; addInput.focus(); });
  });

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
    // No share sheet (desktop) — one button that copies, and a hint that says so.
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
    body: `<header class="masthead"><a href="/">Foodgen</a></header>
<div class="wrap"><section class="hero rise"><h1>${esc(t.notFound)}</h1><p class="summary">${esc(t.notFoundBody)}</p></section></div>`,
  });
}

const LANDING_STYLE = `
.lede{font-family:var(--serif);font-style:italic;font-size:clamp(1.05rem,2.4vw,1.3rem);
  color:var(--muted);max-width:32rem;margin:0 auto 2.2rem;text-wrap:pretty}
.sample{max-width:36rem;margin:0 auto}
.sample .card{transform:rotate(-1.2deg)}
.sample blockquote{margin:0;font-family:var(--serif);font-style:italic;
  font-size:clamp(1.05rem,2.4vw,1.25rem);line-height:1.5;text-wrap:pretty}
.sample blockquote::before{content:"«";color:var(--accent);font-size:1.6em;line-height:0;vertical-align:-.25em;margin-right:.08em}
.sample blockquote::after{content:"»";color:var(--accent);font-size:1.6em;line-height:0;vertical-align:-.35em;margin-left:.08em}
.sample figcaption{font-size:.72rem;font-weight:700;letter-spacing:.24em;text-transform:uppercase;
  color:var(--herb);margin-bottom:.6rem}
.landing-grid{display:grid;gap:1.4rem;padding:2.8rem 0 1rem;text-align:left}
@media (min-width:860px){.landing-grid{grid-template-columns:1fr 1fr 1fr}}
.landing-grid h3{font-family:var(--serif);font-weight:600;font-size:1.2rem;margin:0 0 .6rem}
.landing-grid ol{margin:.4rem 0 0;padding-left:1.2rem}
.landing-grid li{margin:.35rem 0}
.landing-grid p{margin:.5rem 0 0}
.landing-grid code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82em;
  background:var(--accent-soft);color:var(--accent);padding:.12em .4em;border-radius:4px}
pre{background:transparent;border:1px solid var(--line);border-radius:4px;
  padding:.7rem .85rem;overflow-x:auto;font-size:.78rem;margin:.7rem 0 0;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.5}
.url{display:flex;gap:.55rem;align-items:center;background:var(--card);border:1px solid var(--line);
  border-radius:100px;padding:.45rem .5rem .45rem 1.1rem;box-shadow:var(--shadow);
  max-width:30rem;margin:2.2rem auto 0}
.url code{flex:1;overflow-x:auto;white-space:nowrap;text-align:left;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85rem;scrollbar-width:none}
.url code::-webkit-scrollbar{display:none}
.url button{font-family:var(--sans);font-size:.82rem;font-weight:650;padding:.55rem 1.1rem;
  border-radius:100px;border:0;background:var(--accent);color:var(--accent-ink);cursor:pointer;flex:0 0 auto}
.privacy{max-width:34rem;margin:2.4rem auto 0;font-size:.88rem;color:var(--muted)}
`;

export function renderLanding(baseUrl) {
  const mcpUrl = `${baseUrl}/mcp`;
  const body = `<style>${LANDING_STYLE}</style>
<header class="masthead rise"><a href="${esc(baseUrl)}/">Foodgen</a></header>
<div class="wrap" style="text-align:center">
  <section class="hero rise d1" style="text-align:center;max-width:none">
    <h1>Middag, ferdig tenkt.</h1>
    <p class="lede">Be Claude om middag — få en lenke med handleliste du huker av i butikken, og oppskriften under. Ett trykk lagrer alt i Apple&nbsp;Notater.</p>
    <figure class="sample rise d2" style="margin:0 auto">
      <div class="card"><div class="pad">
        <figcaption>Slik spør du</figcaption>
        <blockquote>Middag til 3 personer, 2 voksne og 1 barn — rask, før fotballtrening, ikke fisk.</blockquote>
      </div></div>
    </figure>
    <div class="url rise d3"><code id="url">${esc(mcpUrl)}</code><button type="button" id="copy">Kopier</button></div>
  </section>

  <div class="landing-grid">
    <div class="card rise d2"><div class="pad">
      <h3>Claude-appen &amp; claude.ai</h3>
      <ol>
        <li>Åpne <b>Settings → Connectors</b></li>
        <li>Velg <b>Add custom connector</b></li>
        <li>Lim inn adressen over — la autentisering stå tom</li>
      </ol>
      <p>Serveren dukker opp som <code>foodgen</code>, med kommandoen <code>/middag</code>.</p>
    </div></div>
    <div class="card rise d3"><div class="pad">
      <h3>Claude Cowork</h3>
      <p>Samme framgangsmåte — Cowork bruker koblingene fra kontoen din, så én tilkobling gjelder begge steder.</p>
    </div></div>
    <div class="card rise d4"><div class="pad">
      <h3>Claude Code</h3>
      <p>Kjør én gang i terminalen:</p>
      <pre>claude mcp add --transport http \\
  foodgen ${esc(mcpUrl)}</pre>
      <p>Legg til <code>--scope user</code> for alle prosjekter.</p>
    </div></div>
  </div>

  <p class="privacy rise d4">Hver middag får en tilfeldig adresse på 128 bit — ikke søkbar, ikke gjettbar. Men alle med lenken kan åpne den, så del den deretter.</p>
</div>
<footer class="rise d4"><span class="fleuron" aria-hidden="true">❦</span>foodgen</footer>
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
