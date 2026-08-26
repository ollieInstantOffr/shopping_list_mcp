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

/**
 * Apple HIG-inspired system: SF via the system font stack, iOS grouped-inset
 * lists with hairline separators, Reminders-style check circles, frosted bars,
 * system-orange tint, and the systemGroupedBackground palettes for both themes.
 */
const STYLE = `
*,*::before,*::after{box-sizing:border-box}
:root{
  --bg:#f2f2f7; --card:#ffffff; --label:#1d1d1f;
  --secondary:rgba(60,60,67,.6); --tertiary:rgba(60,60,67,.3);
  --sep:rgba(60,60,67,.29); --fill:rgba(120,120,128,.12);
  --tint:#ff9500; --on-tint:#fff;
  --blur-bg:rgba(242,242,247,.72);
  --card-shadow:0 1px 1px rgba(0,0,0,.03),0 8px 24px -8px rgba(0,0,0,.05);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#000000; --card:#1c1c1e; --label:#f5f5f7;
  --secondary:rgba(235,235,245,.6); --tertiary:rgba(235,235,245,.3);
  --sep:rgba(84,84,88,.6); --fill:rgba(120,120,128,.2);
  --tint:#ff9f0a; --on-tint:#1c1206;
  --blur-bg:rgba(10,10,10,.72);
  --card-shadow:none;
}}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--label);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;
  font-size:17px;line-height:1.47;letter-spacing:-.012em;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--tint);text-decoration:none}
a:hover{text-decoration:underline}

/* ---------- reveal ---------- */
@media (prefers-reduced-motion:no-preference){
  /* 'backwards' fill only: nothing is retained after the animation, so no
     lingering transform turns an ancestor into a containing block for the
     position:fixed action bar. */
  .rise{animation:rise .55s cubic-bezier(.32,.72,.35,1) backwards}
  .rise.d1{animation-delay:.05s}.rise.d2{animation-delay:.12s}
  .rise.d3{animation-delay:.19s}.rise.d4{animation-delay:.26s}
  @keyframes rise{from{opacity:0;transform:translateY(10px) scale(.995)}}
}

/* ---------- frosted nav ---------- */
.masthead{position:sticky;top:0;z-index:30;display:flex;justify-content:center;
  padding:.8rem 1.25rem;background:var(--blur-bg);
  backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);
  border-bottom:.5px solid var(--sep)}
.masthead a{font-size:1rem;font-weight:650;letter-spacing:-.01em;color:var(--label)}
.masthead a:hover{text-decoration:none;opacity:.7}

/* ---------- hero ---------- */
.wrap{max-width:1024px;margin:0 auto;padding:0 1.25rem}
.hero{padding:2.2rem 0 1.9rem;max-width:44rem}
h1{font-size:clamp(2rem,5vw,2.6rem);font-weight:750;letter-spacing:-.028em;
  line-height:1.08;margin:0 0 .55rem;text-wrap:balance}
.summary{font-size:1.06rem;color:var(--secondary);margin:0 0 1.1rem;max-width:36rem;text-wrap:pretty}
.meta{display:flex;flex-wrap:wrap;gap:.5rem;margin:0;padding:0;list-style:none}
.meta li{display:inline-flex;align-items:center;gap:.35rem;
  font-size:.82rem;font-weight:600;letter-spacing:0;
  padding:.32rem .75rem;border-radius:100px;background:var(--fill);color:var(--secondary)}
.meta li.time{background:var(--tint);color:var(--on-tint)}
.meta li.time svg{width:.9em;height:.9em}

/* ---------- spread ---------- */
.spread{display:grid;gap:2.2rem;padding-bottom:3rem}
@media (min-width:900px){
  .spread{grid-template-columns:minmax(330px,5fr) 7fr;gap:3rem;align-items:start}
  .col-list{position:sticky;top:4.4rem}
}

h2{display:flex;align-items:baseline;font-size:.8rem;font-weight:600;
  letter-spacing:.06em;text-transform:uppercase;color:var(--secondary);
  margin:0 0 .55rem;padding:0 1.05rem}
h2 small{font-size:inherit;font-weight:600;color:var(--tertiary);margin-left:auto;
  font-variant-numeric:tabular-nums}
* + h2{margin-top:2rem}

.card{background:var(--card);border-radius:18px;box-shadow:var(--card-shadow);overflow:hidden}
.pad{padding:1rem 1.05rem}

/* ---------- shopping list ---------- */
.aisle{font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;
  color:var(--secondary);padding:1.05rem 1.05rem .3rem}
ul.rows{margin:0;padding:0 0 .1rem;list-style:none}
.row{display:flex;align-items:center;gap:.75rem;position:relative;
  padding:.62rem 1.05rem;cursor:pointer;user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:transparent;transition:background .12s}
.row:active{background:var(--fill)}
.row+.row::before{content:"";position:absolute;top:0;left:3.05rem;right:0;
  height:.5px;background:var(--sep)}
.box{flex:0 0 23px;height:23px;border:1.5px solid var(--tertiary);border-radius:50%;
  display:grid;place-items:center;
  transition:background .18s,border-color .18s,transform .18s cubic-bezier(.3,1.4,.5,1)}
@media (hover:hover){.row:hover .box{border-color:var(--tint)}}
.box svg{width:12px;height:12px;opacity:0;transform:scale(.4);
  transition:opacity .15s,transform .18s cubic-bezier(.3,1.4,.5,1)}
.row[aria-checked=true] .box{background:var(--tint);border-color:var(--tint);transform:scale(1.04)}
.row[aria-checked=true] .box svg{opacity:1;transform:scale(1)}
.row[aria-checked=true] .item{color:var(--tertiary);text-decoration:line-through;
  text-decoration-color:var(--tertiary)}
.row[aria-checked=true] .qty{color:var(--tertiary)}
.item{flex-shrink:1}
.dots{flex:1;min-width:.75rem}
.qty{color:var(--secondary);font-size:.94rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.rm{flex:0 0 auto;width:24px;height:24px;border:0;border-radius:50%;
  background:none;color:var(--tertiary);font-size:.85rem;line-height:1;cursor:pointer;
  display:grid;place-items:center;padding:0;transition:color .12s,background .12s}
.rm:hover{color:var(--label);background:var(--fill)}
.addrow{display:flex;gap:.75rem;align-items:center;position:relative;
  padding:.55rem 1.05rem .7rem;margin:0}
.addrow::before{content:"";position:absolute;top:0;left:3.05rem;right:0;height:.5px;background:var(--sep)}
.addrow input{flex:1;min-width:0;font:inherit;color:var(--label);
  background:transparent;border:0;padding:.3rem 0;outline:none}
.addrow input::placeholder{color:var(--tertiary)}
.addrow button{flex:0 0 auto;width:26px;height:26px;border-radius:50%;border:0;
  background:var(--fill);color:var(--tint);font-size:1.15rem;font-weight:500;line-height:1;
  cursor:pointer;display:grid;place-items:center;padding:0 0 .1rem;
  transition:background .15s,color .15s,transform .12s}
.addrow button:hover{background:var(--tint);color:var(--on-tint)}
.addrow button:active{transform:scale(.92)}
.progress{display:flex;justify-content:flex-end;font-size:.85rem;margin:.55rem .3rem 0}
.progress button{font:inherit;font-weight:500;color:var(--tint);background:none;border:0;
  padding:.2rem .4rem;cursor:pointer;border-radius:8px}
.progress button:hover{background:var(--fill)}

.pantry{color:var(--secondary);font-size:.95rem}
.pantry ul{margin:0;padding:0;list-style:none;columns:2;column-gap:1.8rem}
.pantry li{margin:.22rem 0;break-inside:avoid;padding-left:1.05rem;position:relative}
.pantry li::before{content:"";position:absolute;left:.15rem;top:.62em;width:4px;height:4px;
  border-radius:50%;background:var(--tertiary)}
@media (max-width:479px){.pantry ul{columns:1}}

/* ---------- recipe ---------- */
ul.ing{margin:0;padding:.25rem 0;list-style:none}
ul.ing li{display:flex;align-items:baseline;gap:.75rem;position:relative;padding:.5rem 1.05rem}
ul.ing li+li::before{content:"";position:absolute;top:0;left:1.05rem;right:0;height:.5px;background:var(--sep)}
@media (min-width:640px){
  ul.ing{display:grid;grid-template-columns:1fr 1fr;column-gap:0;padding:.25rem 0}
  ul.ing li+li::before{left:1.05rem}
  ul.ing li:nth-child(2)::before{content:"";position:absolute;top:0;left:1.05rem;right:0;height:.5px;background:var(--sep)}
}
ol.steps{margin:0;padding:.25rem 0;list-style:none;counter-reset:s}
ol.steps li{counter-increment:s;position:relative;padding:.85rem 1.05rem .85rem 3.1rem;text-wrap:pretty}
ol.steps li+li::before{content:"";position:absolute;top:0;left:3.1rem;right:0;height:.5px;background:var(--sep)}
ol.steps li::after{content:counter(s);position:absolute;left:1.05rem;top:.95rem;
  width:1.45rem;height:1.45rem;border-radius:50%;background:var(--fill);color:var(--tint);
  font-size:.85rem;font-weight:650;display:grid;place-items:center;font-variant-numeric:tabular-nums}
.tips{font-size:.97rem}
.tips ul{margin:0;padding:0;list-style:none}
.tips li{position:relative;padding:.3rem 0 .3rem 1.35rem}
.tips li::before{content:"";position:absolute;left:.2rem;top:.72em;width:5px;height:5px;
  border-radius:50%;background:var(--tint)}

/* ---------- actions ---------- */
.bar{margin-top:1.3rem}
.bar-inner{display:flex;gap:.65rem}
button.act{flex:1;font:inherit;font-size:1rem;font-weight:600;letter-spacing:-.01em;
  padding:.85rem 1rem;border-radius:100px;border:0;cursor:pointer;
  background:var(--fill);color:var(--tint);
  transition:transform .12s,filter .15s;-webkit-tap-highlight-color:transparent}
button.act.primary{flex:1.7;background:var(--tint);color:var(--on-tint)}
button.act:hover{filter:brightness(1.05)}
button.act:active{transform:scale(.98)}
.hint{font-size:.82rem;color:var(--secondary);text-align:center;line-height:1.45;margin:.7rem .5rem 0}
.hint b{color:var(--label);font-weight:600}
@media (max-width:899px){
  body{padding-bottom:calc(112px + env(safe-area-inset-bottom))}
  .bar{position:fixed;left:0;right:0;bottom:0;z-index:30;margin:0;
    padding:.75rem 1.25rem calc(.75rem + env(safe-area-inset-bottom));
    background:var(--blur-bg);
    backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);
    border-top:.5px solid var(--sep)}
  .bar-inner{max-width:34rem;margin:0 auto}
  .hint{max-width:34rem;margin:.5rem auto 0}
}

footer{text-align:center;color:var(--tertiary);font-size:.8rem;padding:.5rem 1.25rem 2.6rem}
footer a{color:var(--secondary)}
footer .fleuron{display:none}

/* ---------- print ---------- */
@media print{
  body{background:#fff;color:#000;padding:0}
  .masthead,.bar,.progress,footer,.addrow{display:none!important}
  .card{box-shadow:none;border:1px solid #ddd}
  .spread{display:block}
  .box{border-color:#000}
  .rise{opacity:1!important;transform:none!important;animation:none!important}
}
`;

const CHECK_SVG =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.2 8.6l3 3L12.8 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--on-tint)"/></svg>';

const CLOCK_SVG =
  '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.4" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.8V8l2.3 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function shell({ title, body, lang = 'no' }) {
  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f2f2f7" media="(prefers-color-scheme:light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme:dark)">
<meta name="robots" content="noindex,nofollow">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/** item — flexible space — quantity, Settings-style. */
function leaderRow(ing) {
  return `<span class="item">${esc(ing.item)}</span><span class="dots" aria-hidden="true"></span>${
    ing.quantity ? `<span class="qty">${esc(ing.quantity)}</span>` : ''
  }`;
}

export function renderPlanPage({ id, plan, noteText, baseUrl }) {
  const t = strings(plan.language);
  const { groups, atHome } = groupShoppingList(plan.ingredients);

  const meta = [
    `<li class="time">${CLOCK_SVG}${esc(plan.total_time_minutes)} ${esc(t.minutes)}</li>`,
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

  const body = `<header class="masthead"><a href="${esc(baseUrl)}/">FoodGen</a></header>
<div class="wrap">
  <section class="hero rise d1">
    <h1>${esc(plan.title)}</h1>
    ${plan.summary ? `<p class="summary">${esc(plan.summary)}</p>` : ''}
    <ul class="meta">${meta}</ul>
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
    rm.textContent = '✕';
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
    body: `<header class="masthead"><a href="/">FoodGen</a></header>
<div class="wrap"><section class="hero rise"><h1>${esc(t.notFound)}</h1><p class="summary">${esc(t.notFoundBody)}</p></section></div>`,
  });
}

const LANDING_STYLE = `
.hero.landing{max-width:none;text-align:center;padding:3.2rem 0 2.4rem}
.hero.landing h1{font-size:clamp(2.4rem,6vw,3.5rem);margin-bottom:.7rem}
.lede{font-size:clamp(1.05rem,2.2vw,1.3rem);color:var(--secondary);
  max-width:34rem;margin:0 auto 2.2rem;text-wrap:pretty;line-height:1.45}
.sample{max-width:34rem;margin:0 auto}
.sample blockquote{margin:0;font-size:1.08rem;line-height:1.5;text-wrap:pretty}
.sample figcaption{font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:var(--secondary);margin-bottom:.5rem}
.landing-grid{display:grid;gap:1.2rem;padding:2.4rem 0 .6rem;text-align:left}
@media (min-width:640px){.landing-grid{grid-template-columns:1fr 1fr}}
.landing-grid .pad{padding:1.25rem 1.3rem}
.landing-grid h3{font-size:1.08rem;font-weight:650;letter-spacing:-.015em;margin:0 0 .5rem}
.landing-grid ol{margin:.3rem 0 0;padding-left:1.2rem;color:var(--secondary)}
.landing-grid li{margin:.3rem 0}
.landing-grid p{margin:.5rem 0 0;color:var(--secondary);font-size:.95rem}
.landing-grid b{color:var(--label);font-weight:600}
.landing-grid code{font-family:ui-monospace,"SF Mono",SFMono-Regular,Menlo,monospace;font-size:.82em;
  background:var(--fill);color:var(--label);padding:.14em .42em;border-radius:6px}
pre{background:var(--fill);border-radius:10px;
  padding:.75rem .9rem;overflow-x:auto;font-size:.78rem;margin:.7rem 0 0;
  font-family:ui-monospace,"SF Mono",SFMono-Regular,Menlo,monospace;line-height:1.55;color:var(--label)}
.url{display:flex;gap:.5rem;align-items:center;background:var(--card);
  border-radius:100px;padding:.4rem .45rem .4rem 1.15rem;box-shadow:var(--card-shadow);
  max-width:30rem;margin:2.2rem auto 0}
.url code{flex:1;overflow-x:auto;white-space:nowrap;text-align:left;
  font-family:ui-monospace,"SF Mono",SFMono-Regular,Menlo,monospace;font-size:.85rem;scrollbar-width:none}
.url code::-webkit-scrollbar{display:none}
.url button{font:inherit;font-size:.85rem;font-weight:600;padding:.55rem 1.15rem;
  border-radius:100px;border:0;background:var(--tint);color:var(--on-tint);cursor:pointer;flex:0 0 auto}
.url button:active{transform:scale(.97)}
.privacy{max-width:34rem;margin:2.2rem auto 0;text-align:center;font-size:.85rem;color:var(--secondary)}
`;

export function renderLanding(baseUrl) {
  const mcpUrl = `${baseUrl}/mcp`;
  const body = `<style>${LANDING_STYLE}</style>
<header class="masthead rise"><a href="${esc(baseUrl)}/">FoodGen</a></header>
<div class="wrap">
  <section class="hero landing rise d1">
    <h1>Middag, ferdig tenkt.</h1>
    <p class="lede">Be Claude eller ChatGPT om middag — få en lenke med handleliste du huker av i butikken, og oppskriften under. Ett trykk lagrer alt i Apple&nbsp;Notater.</p>
    <figure class="sample rise d2" style="margin:0 auto">
      <div class="card"><div class="pad" style="padding:1.25rem 1.3rem;text-align:left">
        <figcaption>Slik spør du</figcaption>
        <blockquote>«Middag til 3 personer, 2 voksne og 1 barn — rask, før fotballtrening, ikke fisk.»</blockquote>
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
      <h3>ChatGPT</h3>
      <ol>
        <li>Åpne <b>Settings → Connectors</b> (skru på <b>Developer mode</b> under Advanced for full funksjonalitet)</li>
        <li>Velg <b>Create</b> / legg til egendefinert connector</li>
        <li>Lim inn adressen over — MCP-server, ingen autentisering</li>
      </ol>
      <p>Som vanlig connector kan ChatGPT søke i og hente lagrede middager; i developer mode kan den også lage nye.</p>
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
<footer class="rise d4">foodgen</footer>
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
