'use strict';

/* ================= Stałe ================= */

const CATEGORIES = [
  { id: 'veg', title: 'Warzywa', emoji: '🥕' },
  { id: 'fruit', title: 'Owoce', emoji: '🍎' },
  { id: 'dairy', title: 'Nabiał', emoji: '🧀' },
  { id: 'meat', title: 'Mięso', emoji: '🥩' },
  { id: 'fish', title: 'Ryby i owoce morza', emoji: '🐟' },
  { id: 'grains', title: 'Produkty zbożowe', emoji: '🌾' },
  { id: 'legumes', title: 'Rośliny strączkowe', emoji: '🫘' },
  { id: 'spices', title: 'Przyprawy i zioła', emoji: '🌶️' },
  { id: 'baking', title: 'Pieczenie', emoji: '🧁' },
  { id: 'sauces', title: 'Sosy i oleje', emoji: '🫒' },
  { id: 'sweets', title: 'Słodycze i przekąski', emoji: '🍫' },
  { id: 'drinks', title: 'Napoje', emoji: '🥤' },
  { id: 'frozen', title: 'Mrożonki', emoji: '🧊' },
  { id: 'other', title: 'Inne', emoji: '🛒' }
];
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));
function cat(id) { return CAT_MAP[id] || CAT_MAP.other; }

const TAG_KINDS = [
  { key: 'cuisine', title: 'Kuchnia', icon: '🌍', color: '#3b82f6' },
  { key: 'meal', title: 'Rodzaj posiłku', icon: '🍽️', color: '#f59e0b' },
  { key: 'diet', title: 'Właściwości / dieta', icon: '🌿', color: '#22c55e' },
  { key: 'equipment', title: 'Sprzęt i naczynia', icon: '🍳', color: '#a855f7' },
  { key: 'custom', title: 'Inne etykiety', icon: '🏷️', color: '#8a8a90' }
];
const KIND_MAP = Object.fromEntries(TAG_KINDS.map(k => [k.key, k]));

const DEFAULT_TAGS = {
  cuisine: ['Polska', 'Włoska', 'Azjatycka', 'Meksykańska', 'Śródziemnomorska', 'Francuska'],
  meal: ['Śniadanie', 'Przekąska', 'Obiad/Kolacja', 'Deser'],
  diet: ['Bogate w żelazo', 'Wysokobiałkowe', 'Wegetariańskie', 'Wegańskie', 'Bezglutenowe', 'Lekkie'],
  equipment: ['Patelnia duża', 'Patelnia mała', 'Piekarnik', 'Airfryer', 'Blender', 'Garnek', 'Mikser']
};

const UNITS = ['g', 'kg', 'ml', 'l', 'szt.', 'łyżka', 'łyżeczka', 'szklanka', 'ząbek', 'szczypta', 'opak.'];

/* ================= IndexedDB ================= */

let _db = null;
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('przepisy', 1);
    r.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('recipes')) db.createObjectStore('recipes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('pantry')) db.createObjectStore('pantry', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('shopping')) db.createObjectStore('shopping', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function store(name, mode) {
  if (!_db) _db = await openDB();
  return _db.transaction(name, mode).objectStore(name);
}
async function dbAll(name) {
  const s = await store(name, 'readonly');
  return new Promise((res, rej) => { const r = s.getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function dbPut(name, obj) {
  const s = await store(name, 'readwrite');
  return new Promise((res, rej) => { const r = s.put(obj); r.onsuccess = () => res(obj); r.onerror = () => rej(r.error); });
}
async function dbDel(name, id) {
  const s = await store(name, 'readwrite');
  return new Promise((res, rej) => { const r = s.delete(id); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}
async function dbClear(name) {
  const s = await store(name, 'readwrite');
  return new Promise((res, rej) => { const r = s.clear(); r.onsuccess = () => res(); r.onerror = () => rej(r.error); });
}

/* ================= Narzędzia ================= */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.round(Math.random() * 1e9)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const NF = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 });
function fmtQty(n) { return NF.format(n); }
function parseNum(s) { if (s == null) return null; const t = String(s).trim().replace(',', '.'); if (t === '') return null; const v = parseFloat(t); return isNaN(v) ? null : v; }
function parseInt2(s) { const v = parseNum(s); return v == null ? null : Math.round(v); }
function fmtDur(m) { m = Math.round(m || 0); if (m <= 0) return '–'; const h = Math.floor(m / 60), mm = m % 60; if (h === 0) return mm + ' min'; if (mm === 0) return h + ' godz'; return h + ' godz ' + mm + ' min'; }
function totalMin(r) { return (r.prepMinutes || 0) + (r.cookMinutes || 0); }
function byId(arr, id) { return arr.find((x) => x.id === id); }
function ingLine(ing, factor) {
  factor = factor || 1;
  const parts = [];
  if (ing.qty != null) parts.push(fmtQty(ing.qty * factor) + (ing.unit ? ' ' + ing.unit : ''));
  else if (ing.unit) parts.push(ing.unit);
  if (ing.name) parts.push(ing.name);
  let line = parts.join(' ');
  if (ing.note) line += ' (' + ing.note + ')';
  return line;
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 1800);
}
function readImage(file) {
  return new Promise((res) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280; let w = img.width, h = img.height;
        if (w > h && w > max) { h = h * max / w; w = max; } else if (h > max) { w = w * max / h; h = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => res(null);
      img.src = rd.result;
    };
    rd.onerror = () => res(null);
    rd.readAsDataURL(file);
  });
}

/* ================= Stan ================= */

const state = {
  tab: 'recipes', detailId: null, detailServings: 1,
  recipes: [], pantry: [], shopping: [],
  search: '', sort: 'name', filterTags: new Set(), favOnly: false
};

async function loadAll() {
  state.recipes = await dbAll('recipes');
  state.pantry = await dbAll('pantry');
  state.shopping = await dbAll('shopping');
}

/* ================= Dane startowe ================= */

async function seed() {
  const P = (name, cid, unit, emoji, n) => ({ id: uid(), name, category: cid, defaultUnit: unit, emoji, note: '', isFavorite: true, kcal: n && n[0], protein: n && n[1], carbs: n && n[2], fat: n && n[3] });
  const pantry = [
    P('Jajka', 'dairy', 'szt.', '🥚', [155, 13, 1.1, 11]),
    P('Mąka pszenna', 'baking', 'g', '🌾', [364, 10, 76, 1]),
    P('Masło', 'dairy', 'g', '🧈', [717, 0.9, 0.1, 81]),
    P('Oliwa z oliwek', 'sauces', 'łyżka', '🫒', [884, 0, 0, 100]),
    P('Czosnek', 'veg', 'ząbek', '🧄', [149, 6, 33, 0.5]),
    P('Cebula', 'veg', 'szt.', '🧅', [40, 1.1, 9, 0.1]),
    P('Pomidory', 'veg', 'g', '🍅', [18, 0.9, 3.9, 0.2]),
    P('Makaron spaghetti', 'grains', 'g', '🍝', [371, 13, 75, 1.5]),
    P('Kurczak (pierś)', 'meat', 'g', '🍗', [165, 31, 0, 3.6]),
    P('Soczewica czerwona', 'legumes', 'g', '🫘', [352, 24, 60, 1]),
    P('Szpinak', 'veg', 'g', '🥬', [23, 2.9, 3.6, 0.4]),
    P('Ser parmezan', 'dairy', 'g', '🧀', [431, 38, 4, 29]),
    P('Sól', 'spices', 'szczypta', '🧂', null),
    P('Pieprz czarny', 'spices', 'szczypta', '🌶️', null)
  ];
  for (const p of pantry) await dbPut('pantry', p);

  const T = (name, kind) => ({ name, kind });
  const ing = (qty, unit, name, note, category) => ({ qty, unit, name, note: note || '', category: category || null });
  const step = (text, timerMinutes) => ({ text, timerMinutes: timerMinutes || null });
  const now = new Date().toISOString();

  const recipes = [
    {
      id: uid(), name: 'Spaghetti aglio e olio',
      summary: 'Klasyczny włoski makaron na szybko – czosnek, oliwa i chilli.',
      servings: 2, prepMinutes: 5, cookMinutes: 15,
      sourceUrl: 'https://www.giallozafferano.it/', notes: 'Wodę z gotowania makaronu zostaw – emulguje sos.',
      isFavorite: true, rating: 5, createdAt: now, updatedAt: now, image: null,
      calories: 520, protein: 14, carbs: 78, fat: 18, fiber: null,
      ingredients: [
        ing(200, 'g', 'makaron spaghetti', '', 'grains'),
        ing(4, 'ząbek', 'czosnek', 'w plasterkach', 'veg'),
        ing(4, 'łyżka', 'oliwa z oliwek', '', 'sauces'),
        ing(null, 'szczypta', 'płatki chilli', 'do smaku', 'spices'),
        ing(20, 'g', 'natka pietruszki', 'posiekana', 'veg')
      ],
      steps: [
        step('Ugotuj makaron al dente w osolonej wodzie.', 9),
        step('Na oliwie podsmaż czosnek z chilli, aż się zezłoci.', 3),
        step('Dodaj makaron i trochę wody z gotowania, wymieszaj.', null),
        step('Posyp natką i podawaj.', null)
      ],
      tags: [T('Włoska', 'cuisine'), T('Obiad/Kolacja', 'meal'), T('Wegetariańskie', 'diet'), T('Garnek', 'equipment'), T('Patelnia duża', 'equipment')]
    },
    {
      id: uid(), name: 'Dahl z czerwonej soczewicy',
      summary: 'Aromatyczne, sycące curry bogate w białko i żelazo.',
      servings: 4, prepMinutes: 10, cookMinutes: 25,
      sourceUrl: '', notes: '', isFavorite: false, rating: 4, createdAt: now, updatedAt: now, image: null,
      calories: 310, protein: 18, carbs: 45, fat: 6, fiber: 9,
      ingredients: [
        ing(250, 'g', 'soczewica czerwona', 'opłukana', 'legumes'),
        ing(1, 'szt.', 'cebula', 'posiekana', 'veg'),
        ing(3, 'ząbek', 'czosnek', 'starty', 'veg'),
        ing(400, 'g', 'pomidory z puszki', '', 'veg'),
        ing(2, 'łyżeczka', 'curry', '', 'spices'),
        ing(600, 'ml', 'woda', '', 'other')
      ],
      steps: [
        step('Podsmaż cebulę i czosnek z przyprawami.', 4),
        step('Dodaj soczewicę, pomidory i wodę.', null),
        step('Gotuj na wolnym ogniu, aż soczewica zmięknie.', 25),
        step('Dopraw solą, podawaj z ryżem lub naanem.', null)
      ],
      tags: [T('Azjatycka', 'cuisine'), T('Obiad/Kolacja', 'meal'), T('Bogate w żelazo', 'diet'), T('Wegańskie', 'diet'), T('Wysokobiałkowe', 'diet'), T('Garnek', 'equipment')]
    },
    {
      id: uid(), name: 'Puszysta jajecznica na maśle',
      summary: 'Śniadaniowy klasyk gotowy w 10 minut.',
      servings: 1, prepMinutes: 2, cookMinutes: 6,
      sourceUrl: '', notes: '', isFavorite: true, rating: 5, createdAt: now, updatedAt: now, image: null,
      calories: 340, protein: 20, carbs: 2, fat: 28, fiber: null,
      ingredients: [
        ing(3, 'szt.', 'jajka', '', 'dairy'),
        ing(15, 'g', 'masło', '', 'dairy'),
        ing(null, 'szczypta', 'sól', '', 'spices'),
        ing(null, 'szczypta', 'szczypiorek', 'posiekany', 'veg')
      ],
      steps: [
        step('Rozgrzej masło na patelni na małym ogniu.', null),
        step('Wbij jajka i mieszaj delikatnie do ścięcia.', 5),
        step('Dopraw solą, posyp szczypiorkiem.', null)
      ],
      tags: [T('Śniadanie', 'meal'), T('Wysokobiałkowe', 'diet'), T('Wegetariańskie', 'diet'), T('Patelnia mała', 'equipment')]
    }
  ];
  for (const r of recipes) await dbPut('recipes', r);
}

/* ================= Router / render ================= */

function render() {
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.id === state.tab));
  const view = $('#view');
  if (state.tab === 'recipes') { state.detailId ? renderDetail(view) : renderRecipes(view); }
  else if (state.tab === 'pantry') renderPantry(view);
  else if (state.tab === 'shopping') renderShopping(view);
  else renderSettings(view);
  window.scrollTo(0, 0);
}

/* ---------- Widok: Przepisy ---------- */

function filteredRecipes() {
  let r = state.recipes.slice();
  const q = state.search.trim().toLowerCase();
  if (q) r = r.filter((x) => x.name.toLowerCase().includes(q) || (x.summary || '').toLowerCase().includes(q) || (x.ingredients || []).some((i) => (i.name || '').toLowerCase().includes(q)));
  if (state.favOnly) r = r.filter((x) => x.isFavorite);
  if (state.filterTags.size) {
    r = r.filter((x) => {
      const keys = new Set((x.tags || []).map((t) => t.kind + '|' + t.name.toLowerCase()));
      for (const k of state.filterTags) if (!keys.has(k)) return false;
      return true;
    });
  }
  const s = state.sort;
  r.sort((a, b) => s === 'name' ? a.name.localeCompare(b.name, 'pl')
    : s === 'recent' ? (b.createdAt || '').localeCompare(a.createdAt || '')
    : s === 'rating' ? (b.rating || 0) - (a.rating || 0)
    : totalMin(a) - totalMin(b));
  return r;
}

function recipeCard(r) {
  const firstTag = (r.tags || []).find((t) => t.kind === 'cuisine') || (r.tags || []).find((t) => t.kind === 'meal');
  const thumb = r.image
    ? `<img class="thumb" src="${esc(r.image)}" alt="">`
    : `<div class="thumb ph">🍽️</div>`;
  const meta = [];
  if (totalMin(r) > 0) meta.push(pill('⏱', fmtDur(totalMin(r))));
  meta.push(pill('👥', r.servings));
  if (r.rating > 0) meta.push(pill('⭐️', r.rating));
  return `<div class="card rcard" data-action="open" data-id="${r.id}">
    ${thumb}
    <div class="body">
      <div class="title">${esc(r.name || 'Bez nazwy')} ${r.isFavorite ? '<span class="fav-mark">♥</span>' : ''}</div>
      <div class="meta">${meta.join('')}</div>
      ${firstTag ? tagChip(firstTag) : ''}
    </div>
  </div>`;
}
function pill(ico, txt) { return `<span class="pill">${ico} ${esc(txt)}</span>`; }
function tagChip(t, removable) {
  const k = KIND_MAP[t.kind] || KIND_MAP.custom;
  return `<span class="chip" style="--k:${k.color}">${k.icon} ${esc(t.name)}${removable ? ' <b data-action="tag-del" data-id="' + esc(t.kind + '|' + t.name) + '" style="cursor:pointer">✕</b>' : ''}</span>`;
}

function renderRecipes(view) {
  const activeFilters = state.filterTags.size + (state.favOnly ? 1 : 0);
  view.innerHTML = `
    <div class="screen-head"><h1>Przepisy</h1><div class="spacer"></div></div>
    <div class="toolbar">
      <label class="search">🔎 <input id="search" placeholder="Szukaj nazwy lub składnika" value="${esc(state.search)}"></label>
      <button class="btn icon" data-action="filters">⚙︎ Filtry${activeFilters ? ' (' + activeFilters + ')' : ''}</button>
      <select class="btn" id="sort" style="padding-right:10px">
        <option value="name">Nazwa A–Z</option>
        <option value="recent">Ostatnio dodane</option>
        <option value="rating">Ocena</option>
        <option value="timeAsc">Najszybsze</option>
      </select>
    </div>
    <div id="rgrid" class="grid"></div>
    <button class="fab" data-action="add-recipe" title="Dodaj przepis">+</button>`;
  $('#sort').value = state.sort === 'timeAsc' ? 'timeAsc' : state.sort;
  renderGrid();

  $('#search').addEventListener('input', (e) => { state.search = e.target.value; renderGrid(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });
}
function renderGrid() {
  const grid = $('#rgrid'); if (!grid) return;
  const list = filteredRecipes();
  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="ico">📖</div>
      <h2>${state.recipes.length ? 'Brak wyników' : 'Brak przepisów'}</h2>
      <p>${state.recipes.length ? 'Zmień wyszukiwanie lub filtry.' : 'Dodaj pierwszy przepis przyciskiem +.'}</p></div>`;
    return;
  }
  grid.innerHTML = list.map(recipeCard).join('');
}

/* ---------- Widok: szczegóły ---------- */

function renderDetail(view) {
  const r = byId(state.recipes, state.detailId);
  if (!r) { state.detailId = null; return renderRecipes(view); }
  const factor = (r.servings > 0 && state.detailServings > 0) ? state.detailServings / r.servings : 1;

  const hero = r.image ? `<img src="${esc(r.image)}" alt="">` : `<div class="ph">🍽️</div>`;
  const tagsHtml = (r.tags || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'pl')).map((t) => tagChip(t)).join('');
  const ingHtml = (r.ingredients || []).map((i) => `<div class="ing-line"><span class="dot">•</span><span>${esc(ingLine(i, factor))}</span></div>`).join('');
  const stepsHtml = (r.steps || []).map((s, idx) => `<div class="step"><span class="num">${idx + 1}</span><div><div>${esc(s.text)}</div>${s.timerMinutes ? '<div class="muted" style="font-size:13px">⏱ ' + esc(fmtDur(s.timerMinutes)) + '</div>' : ''}</div></div>`).join('');

  const nutri = [];
  if (r.calories != null) nutri.push(nut('Kalorie', fmtQty(r.calories) + ' kcal'));
  if (r.protein != null) nutri.push(nut('Białko', fmtQty(r.protein) + ' g'));
  if (r.carbs != null) nutri.push(nut('Węglowodany', fmtQty(r.carbs) + ' g'));
  if (r.fat != null) nutri.push(nut('Tłuszcze', fmtQty(r.fat) + ' g'));
  if (r.fiber != null) nutri.push(nut('Błonnik', fmtQty(r.fiber) + ' g'));

  view.innerHTML = `
    <div class="screen-head">
      <button class="btn ghost" data-action="back">‹ Wstecz</button><div class="spacer"></div>
      <button class="btn icon" data-action="fav" title="Ulubiony">${r.isFavorite ? '♥' : '♡'}</button>
    </div>
    <div class="hero card">${hero}</div>
    <h1 style="font-size:26px;margin-bottom:6px">${esc(r.name || 'Przepis')}</h1>
    <div class="stars" data-role="stars">${[1,2,3,4,5].map((n) => `<span data-action="rate" data-id="${n}" class="${n <= (r.rating||0) ? '' : 'off'}">★</span>`).join('')}</div>
    ${r.summary ? `<p class="muted" style="margin-top:8px">${esc(r.summary)}</p>` : ''}

    <div class="stat-row" style="margin:14px 0">
      <div class="stat"><div class="v">${esc(fmtDur(r.prepMinutes))}</div><div class="l">Przygotowanie</div></div>
      <div class="stat"><div class="v">${esc(fmtDur(r.cookMinutes))}</div><div class="l">Gotowanie</div></div>
      <div class="stat"><div class="v">${r.servings}</div><div class="l">Porcje (bazowo)</div></div>
    </div>

    <div class="toolbar">
      <button class="btn primary" data-action="cook" ${(r.steps||[]).length ? '' : 'disabled'}>👨‍🍳 Gotuj</button>
      <button class="btn" data-action="to-shopping">🛒 Do zakupów</button>
      <button class="btn" data-action="share">↗ Udostępnij</button>
      <button class="btn" data-action="edit">✎ Edytuj</button>
      <button class="btn danger" data-action="delete">🗑 Usuń</button>
    </div>

    ${tagsHtml ? `<div class="section"><h3>🏷️ Kategorie i tagi</h3><div class="chips">${tagsHtml}</div></div>` : ''}

    <div class="section">
      <h3>✨ Przelicz porcje</h3>
      <div style="display:flex;align-items:center;gap:14px">
        <div class="stepper">
          <button data-action="serv-minus">−</button>
          <span class="val" id="servVal">${state.detailServings}</span>
          <button data-action="serv-plus">＋</button>
        </div>
        <span class="muted">porcji ${state.detailServings !== r.servings ? '(przeliczone z ' + r.servings + ')' : ''}</span>
      </div>
    </div>

    <div class="section"><h3>🧾 Składniki</h3>${ingHtml || '<p class="muted">Brak składników.</p>'}</div>
    ${stepsHtml ? `<div class="section"><h3>👩‍🍳 Przygotowanie</h3>${stepsHtml}</div>` : ''}
    ${nutri.length ? `<div class="section"><h3>📊 Wartości odżywcze (na porcję)</h3><div class="nutri">${nutri.join('')}</div></div>` : ''}
    ${r.sourceUrl ? `<div class="section"><h3>🔗 Źródło / inspiracja</h3><a class="linkish" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(r.sourceUrl)}</a></div>` : ''}
    ${r.notes ? `<div class="section"><h3>📝 Notatki</h3><div>${esc(r.notes)}</div></div>` : ''}
  `;

  view.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => handleDetailAction(el.dataset.action, el.dataset.id, r)));
}
function nut(l, v) { return `<div class="n"><div class="v">${esc(v)}</div><div class="l">${esc(l)}</div></div>`; }

async function handleDetailAction(action, id, r) {
  if (action === 'back') { state.detailId = null; render(); }
  else if (action === 'fav') { r.isFavorite = !r.isFavorite; await dbPut('recipes', r); await loadAll(); render(); }
  else if (action === 'rate') { const n = parseInt(id, 10); r.rating = (r.rating === n ? 0 : n); await dbPut('recipes', r); await loadAll(); render(); }
  else if (action === 'serv-minus') { state.detailServings = Math.max(1, state.detailServings - 1); render(); }
  else if (action === 'serv-plus') { state.detailServings = Math.min(100, state.detailServings + 1); render(); }
  else if (action === 'edit') { openRecipeEditor(r.id); }
  else if (action === 'cook') { openCooking(r, state.detailServings); }
  else if (action === 'share') { shareRecipe(r, state.detailServings); }
  else if (action === 'to-shopping') { await addRecipeToShopping(r, state.detailServings); toast('Dodano do listy zakupów'); }
  else if (action === 'delete') {
    if (confirm('Usunąć ten przepis?')) { await dbDel('recipes', r.id); state.detailId = null; await loadAll(); render(); }
  }
}

/* ---------- Filtry (arkusz) ---------- */

function openFiltersSheet() {
  const byKind = availableTagsByKind();
  const sections = TAG_KINDS.filter((k) => k.key !== 'custom' || byKind.custom.size).map((k) => {
    const items = Array.from(byKind[k.key].values());
    if (!items.length) return '';
    return `<div class="field"><label>${k.icon} ${k.title}</label><div class="chips">${items.map((name) => {
      const key = k.key + '|' + name.toLowerCase();
      return `<span class="chip select ${state.filterTags.has(key) ? 'on' : ''}" style="--k:${k.color}" data-fk="${esc(key)}">${esc(name)}</span>`;
    }).join('')}</div></div>`;
  }).join('');

  const body = `
    <div class="field"><label>Ulubione</label>
      <span class="chip select ${state.favOnly ? 'on' : ''}" data-fav="1">♥ Tylko ulubione</span></div>
    ${sections}`;
  openSheet('Filtry', body, [
    { label: 'Wyczyść', cls: 'ghost', act: () => { state.filterTags.clear(); state.favOnly = false; closeSheet(); render(); } },
    { label: 'Gotowe', cls: 'primary', act: () => { closeSheet(); render(); } }
  ], (root) => {
    root.querySelectorAll('[data-fk]').forEach((el) => el.addEventListener('click', () => {
      const k = el.dataset.fk; state.filterTags.has(k) ? state.filterTags.delete(k) : state.filterTags.add(k);
      el.classList.toggle('on');
    }));
    root.querySelector('[data-fav]').addEventListener('click', (e) => { state.favOnly = !state.favOnly; e.target.classList.toggle('on'); });
  });
}
function availableTagsByKind() {
  const map = {}; TAG_KINDS.forEach((k) => { map[k.key] = new Map(); });
  for (const kk in DEFAULT_TAGS) DEFAULT_TAGS[kk].forEach((n) => map[kk].set(n.toLowerCase(), n));
  state.recipes.forEach((r) => (r.tags || []).forEach((t) => { if (map[t.kind]) map[t.kind].set(t.name.toLowerCase(), t.name); }));
  return map;
}

/* ================= Edytor przepisu ================= */

let draft = null;

function openRecipeEditor(id) {
  const existing = id ? byId(state.recipes, id) : null;
  draft = existing ? JSON.parse(JSON.stringify(existing)) : {
    id: uid(), name: '', summary: '', servings: 2, prepMinutes: 0, cookMinutes: 0,
    sourceUrl: '', notes: '', isFavorite: false, rating: 0,
    createdAt: new Date().toISOString(), updatedAt: null, image: null,
    calories: null, protein: null, carbs: null, fat: null, fiber: null,
    ingredients: [], steps: [], tags: []
  };
  renderEditor(!existing);
}

function renderEditor(isNew) {
  const catOpts = (sel) => CATEGORIES.map((c) => `<option value="${c.id}" ${sel === c.id ? 'selected' : ''}>${c.emoji} ${c.title}</option>`).join('');
  const ingRows = draft.ingredients.map((i, idx) => `
    <div class="editrow" data-ing="${idx}">
      <input class="input mini" data-k="qty" inputmode="decimal" placeholder="ilość" value="${i.qty != null ? esc(fmtQty(i.qty)) : ''}">
      <input class="input" style="max-width:96px" data-k="unit" placeholder="jedn." value="${esc(i.unit || '')}">
      <div class="col">
        <input class="input" data-k="name" placeholder="Składnik" value="${esc(i.name || '')}">
        <input class="input" data-k="note" placeholder="np. posiekany" value="${esc(i.note || '')}" style="font-size:14px">
        <select class="input" data-k="category" style="font-size:14px">${catOpts(i.category)}</select>
      </div>
      <button class="btn ghost danger" data-act="del-ing" data-i="${idx}">✕</button>
    </div>`).join('');

  const stepRows = draft.steps.map((s, idx) => `
    <div class="editrow" data-step="${idx}">
      <span class="num" style="margin-top:8px">${idx + 1}</span>
      <div class="col">
        <textarea class="input" data-k="text" placeholder="Opis kroku" rows="2">${esc(s.text || '')}</textarea>
        <select class="input" data-k="timer" style="font-size:14px">
          <option value="">Bez minutnika</option>
          ${[1,2,3,5,10,15,20,30,45,60].map((m) => `<option value="${m}" ${s.timerMinutes === m ? 'selected' : ''}>Minutnik: ${fmtDur(m)}</option>`).join('')}
        </select>
      </div>
      <button class="btn ghost danger" data-act="del-step" data-i="${idx}">✕</button>
    </div>`).join('');

  const tagsHtml = draft.tags.map((t) => tagChip(t, true)).join('') || '<span class="muted">Brak tagów</span>';
  const pantryOpts = state.pantry.map((p) => `<option value="${p.id}">${p.emoji || ''} ${esc(p.name)}</option>`).join('');

  const body = `
    <div class="field"><label>Zdjęcie</label>
      <div class="hero card" style="max-height:200px" id="imgPrev">${draft.image ? `<img src="${esc(draft.image)}" style="max-height:200px">` : '<div class="ph" style="aspect-ratio:16/7">🍽️</div>'}</div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <label class="btn small">📷 ${draft.image ? 'Zmień' : 'Dodaj'} zdjęcie<input type="file" accept="image/*" id="imgInput" hidden></label>
        ${draft.image ? '<button class="btn small danger" data-act="img-del">Usuń</button>' : ''}
      </div>
    </div>

    <div class="field"><label>Nazwa</label><input class="input" data-f="name" value="${esc(draft.name)}" placeholder="Nazwa przepisu"></div>
    <div class="field"><label>Krótki opis</label><textarea class="input" data-f="summary" rows="2" placeholder="opcjonalnie">${esc(draft.summary)}</textarea></div>
    <div class="row-inline">
      <div class="field"><label>Porcje</label><input class="input" type="number" min="1" data-f="servings" value="${draft.servings}"></div>
      <div class="field"><label>Przygotowanie (min)</label><input class="input" type="number" min="0" data-f="prepMinutes" value="${draft.prepMinutes}"></div>
      <div class="field"><label>Gotowanie (min)</label><input class="input" type="number" min="0" data-f="cookMinutes" value="${draft.cookMinutes}"></div>
    </div>
    <div class="field"><label><input type="checkbox" data-f="isFavorite" ${draft.isFavorite ? 'checked' : ''}> Ulubiony</label></div>

    <div class="field"><label>Składniki</label>${ingRows}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
        <button class="btn small" data-act="add-ing">+ Składnik</button>
        ${state.pantry.length ? `<select class="btn small" data-act="add-from-pantry"><option value="">+ Z ulubionych…</option>${pantryOpts}</select>` : ''}
      </div>
    </div>

    <div class="field"><label>Sposób przygotowania</label>${stepRows}
      <button class="btn small" data-act="add-step" style="margin-top:6px">+ Krok</button>
    </div>

    <div class="field"><label>Tagi i kategorie</label>
      <div class="chips" style="margin-bottom:8px">${tagsHtml}</div>
      <div class="row-inline">
        <select class="input" id="tagKind">${TAG_KINDS.map((k) => `<option value="${k.key}">${k.icon} ${k.title}</option>`).join('')}</select>
        <input class="input" id="tagName" placeholder="Nazwa etykiety">
        <button class="btn" data-act="add-tag">Dodaj</button>
      </div>
    </div>

    <div class="field"><label>Wartości odżywcze na porcję (opcjonalne)</label>
      <div class="row-inline">
        <div class="field"><input class="input" data-f="calories" inputmode="decimal" placeholder="kcal" value="${draft.calories != null ? esc(fmtQty(draft.calories)) : ''}"></div>
        <div class="field"><input class="input" data-f="protein" inputmode="decimal" placeholder="białko g" value="${draft.protein != null ? esc(fmtQty(draft.protein)) : ''}"></div>
      </div>
      <div class="row-inline">
        <div class="field"><input class="input" data-f="carbs" inputmode="decimal" placeholder="węgl. g" value="${draft.carbs != null ? esc(fmtQty(draft.carbs)) : ''}"></div>
        <div class="field"><input class="input" data-f="fat" inputmode="decimal" placeholder="tłuszcz g" value="${draft.fat != null ? esc(fmtQty(draft.fat)) : ''}"></div>
        <div class="field"><input class="input" data-f="fiber" inputmode="decimal" placeholder="błonnik g" value="${draft.fiber != null ? esc(fmtQty(draft.fiber)) : ''}"></div>
      </div>
      <button class="btn small" data-act="estimate">✨ Oszacuj ze składników</button>
    </div>

    <div class="field"><label>Źródło / inspiracja (URL, FB, IG…)</label><input class="input" data-f="sourceUrl" value="${esc(draft.sourceUrl)}" placeholder="https://…"></div>
    <div class="field"><label>Notatki</label><textarea class="input" data-f="notes" rows="3">${esc(draft.notes)}</textarea></div>
  `;

  openSheet(isNew ? 'Nowy przepis' : 'Edycja przepisu', body, [
    { label: 'Anuluj', cls: 'ghost', act: () => closeSheet() },
    { label: isNew ? 'Dodaj' : 'Zapisz', cls: 'primary', act: () => saveRecipe(isNew) }
  ], attachEditorHandlers);
}

function attachEditorHandlers(root) {
  const img = root.querySelector('#imgInput');
  if (img) img.addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    syncEditorForm(root); draft.image = await readImage(f); renderEditor(false); reopenScroll();
  });
  root.querySelectorAll('[data-act]').forEach((el) => el.addEventListener('click', () => onEditorAct(el, root)));
  // dla <select> z akcją (dodaj z ulubionych) obsłuż change
  const pantrySel = root.querySelector('[data-act="add-from-pantry"]');
  if (pantrySel) pantrySel.addEventListener('change', () => onEditorAct(pantrySel, root));
}

function onEditorAct(el, root) {
  const act = el.dataset.act;
  syncEditorForm(root);
  if (act === 'add-ing') draft.ingredients.push({ qty: null, unit: '', name: '', note: '', category: 'other' });
  else if (act === 'del-ing') draft.ingredients.splice(+el.dataset.i, 1);
  else if (act === 'add-step') draft.steps.push({ text: '', timerMinutes: null });
  else if (act === 'del-step') draft.steps.splice(+el.dataset.i, 1);
  else if (act === 'img-del') draft.image = null;
  else if (act === 'add-tag') {
    const kind = root.querySelector('#tagKind').value;
    const name = root.querySelector('#tagName').value.trim();
    if (name && !draft.tags.some((t) => t.kind === kind && t.name.toLowerCase() === name.toLowerCase())) draft.tags.push({ name, kind });
  } else if (act === 'add-from-pantry') {
    const p = byId(state.pantry, el.value); el.value = '';
    if (p) draft.ingredients.push({ qty: null, unit: p.defaultUnit || '', name: p.name, note: '', category: p.category });
  } else if (act === 'estimate') {
    const est = estimateNutrition(draft);
    if (!est.matched) { alert('Nie dopasowano składników. Uzupełnij wartości odżywcze przy ulubionych składnikach i podawaj ilości w g/ml.'); return; }
    if (est.calories != null) draft.calories = est.calories;
    if (est.protein != null) draft.protein = est.protein;
    if (est.carbs != null) draft.carbs = est.carbs;
    if (est.fat != null) draft.fat = est.fat;
    toast('Oszacowano z ' + est.matched + ' skł.');
  }
  renderEditor(!draft.updatedAt && !state.recipes.some((r) => r.id === draft.id));
}

// odczytuje pola tekstowe z formularza do draft (żeby nie zgubić wpisanego tekstu przy przerysowaniu)
function syncEditorForm(root) {
  root = root || $('#modal-root');
  const g = (f) => { const e = root.querySelector(`[data-f="${f}"]`); return e ? e.value : undefined; };
  const setNum = (f) => { const v = g(f); if (v !== undefined) draft[f] = parseNum(v); };
  const setInt = (f) => { const v = g(f); if (v !== undefined) draft[f] = parseInt2(v) || 0; };
  if (g('name') !== undefined) draft.name = g('name');
  if (g('summary') !== undefined) draft.summary = g('summary');
  setInt('servings'); if (draft.servings < 1) draft.servings = 1;
  setInt('prepMinutes'); setInt('cookMinutes');
  const fav = root.querySelector('[data-f="isFavorite"]'); if (fav) draft.isFavorite = fav.checked;
  if (g('sourceUrl') !== undefined) draft.sourceUrl = g('sourceUrl');
  if (g('notes') !== undefined) draft.notes = g('notes');
  setNum('calories'); setNum('protein'); setNum('carbs'); setNum('fat'); setNum('fiber');

  root.querySelectorAll('[data-ing]').forEach((rowEl) => {
    const idx = +rowEl.dataset.ing; const it = draft.ingredients[idx]; if (!it) return;
    it.qty = parseNum(rowEl.querySelector('[data-k="qty"]').value);
    it.unit = rowEl.querySelector('[data-k="unit"]').value;
    it.name = rowEl.querySelector('[data-k="name"]').value;
    it.note = rowEl.querySelector('[data-k="note"]').value;
    it.category = rowEl.querySelector('[data-k="category"]').value || null;
  });
  root.querySelectorAll('[data-step]').forEach((rowEl) => {
    const idx = +rowEl.dataset.step; const st = draft.steps[idx]; if (!st) return;
    st.text = rowEl.querySelector('[data-k="text"]').value;
    const tv = rowEl.querySelector('[data-k="timer"]').value;
    st.timerMinutes = tv ? parseInt(tv, 10) : null;
  });
}

async function saveRecipe(isNew) {
  syncEditorForm($('#modal-root'));
  if (!draft.name.trim()) { alert('Podaj nazwę przepisu.'); return; }
  draft.updatedAt = new Date().toISOString();
  await dbPut('recipes', draft);
  await loadAll();
  closeSheet();
  if (!isNew) state.detailId = draft.id;
  render();
  toast(isNew ? 'Dodano przepis' : 'Zapisano zmiany');
}

function estimateNutrition(r) {
  let kcal = 0, p = 0, c = 0, f = 0, hk = false, hp = false, hc = false, hf = false, matched = 0;
  (r.ingredients || []).forEach((i) => {
    if (i.qty == null || i.qty <= 0) return;
    const u = (i.unit || '').toLowerCase();
    if (!['g', 'gram', 'gramy', 'ml'].includes(u)) return;
    const it = state.pantry.find((x) => x.name.toLowerCase() === (i.name || '').toLowerCase());
    if (!it) return;
    const ratio = i.qty / 100; matched++;
    if (it.kcal != null) { kcal += it.kcal * ratio; hk = true; }
    if (it.protein != null) { p += it.protein * ratio; hp = true; }
    if (it.carbs != null) { c += it.carbs * ratio; hc = true; }
    if (it.fat != null) { f += it.fat * ratio; hf = true; }
  });
  const s = Math.max(r.servings || 1, 1);
  const per = (v, h) => h ? Math.round(v / s * 10) / 10 : null;
  return { calories: per(kcal, hk), protein: per(p, hp), carbs: per(c, hc), fat: per(f, hf), matched };
}

/* ================= Spiżarnia ================= */

function renderPantry(view) {
  const q = ''; // spiżarnia ma własne wyszukiwanie w toolbarze
  view.innerHTML = `
    <div class="screen-head"><h1>Spiżarnia</h1><div class="spacer"></div></div>
    <div class="toolbar"><label class="search">🔎 <input id="psearch" placeholder="Szukaj składnika"></label></div>
    <div id="plist"></div>
    <button class="fab" data-action="add-pantry">+</button>`;
  renderPantryList('');
  $('#psearch').addEventListener('input', (e) => renderPantryList(e.target.value));
  view.querySelector('[data-action="add-pantry"]').addEventListener('click', () => openPantryEditor(null));
}
function renderPantryList(q) {
  q = (q || '').trim().toLowerCase();
  const items = state.pantry.filter((p) => !q || p.name.toLowerCase().includes(q));
  const list = $('#plist');
  if (!items.length) {
    list.innerHTML = `<div class="empty"><div class="ico">🥕</div><h2>${state.pantry.length ? 'Brak wyników' : 'Pusta spiżarnia'}</h2><p>Dodaj ulubione składniki przyciskiem +.</p></div>`;
    return;
  }
  const groups = {};
  items.forEach((p) => { (groups[p.category] = groups[p.category] || []).push(p); });
  const order = CATEGORIES.map((c) => c.id).filter((id) => groups[id]);
  list.innerHTML = '<div class="list">' + order.map((cid) => {
    const rows = groups[cid].sort((a, b) => a.name.localeCompare(b.name, 'pl')).map((p) => `
      <div class="row" data-action="edit-pantry" data-id="${p.id}">
        <span class="emoji">${p.emoji || cat(cid).emoji}</span>
        <div class="grow"><div class="name">${esc(p.name)}</div>
          <div class="sub">Jedn.: ${esc(p.defaultUnit || '–')}${p.kcal != null ? ' · ' + fmtQty(p.kcal) + ' kcal/100' : ''}</div></div>
        ${p.isFavorite ? '<span style="color:#f0b400">★</span>' : ''}
      </div>`).join('');
    return `<div class="group-h">${cat(cid).emoji} ${cat(cid).title}</div>${rows}`;
  }).join('') + '</div>';
  list.querySelectorAll('[data-action="edit-pantry"]').forEach((el) => el.addEventListener('click', () => openPantryEditor(el.dataset.id)));
}

function openPantryEditor(id) {
  const existing = id ? byId(state.pantry, id) : null;
  const d = existing ? Object.assign({}, existing) : { id: uid(), name: '', category: 'other', defaultUnit: 'g', emoji: '', note: '', isFavorite: true, kcal: null, protein: null, carbs: null, fat: null };
  const catOpts = CATEGORIES.map((c) => `<option value="${c.id}" ${d.category === c.id ? 'selected' : ''}>${c.emoji} ${c.title}</option>`).join('');
  const unitChips = UNITS.map((u) => `<span class="chip select ${d.defaultUnit === u ? 'on' : ''}" data-unit="${esc(u)}">${esc(u)}</span>`).join('');
  const body = `
    <div class="field"><label>Nazwa</label><input class="input" data-f="name" value="${esc(d.name)}" placeholder="Nazwa składnika"></div>
    <div class="row-inline">
      <div class="field"><label>Emoji</label><input class="input" data-f="emoji" value="${esc(d.emoji)}" placeholder="🥕"></div>
      <div class="field" style="flex:2"><label>Kategoria</label><select class="input" data-f="category">${catOpts}</select></div>
    </div>
    <div class="field"><label>Domyślna jednostka</label><input class="input" data-f="defaultUnit" value="${esc(d.defaultUnit)}">
      <div class="chips" style="margin-top:8px">${unitChips}</div></div>
    <div class="field"><label><input type="checkbox" data-f="isFavorite" ${d.isFavorite ? 'checked' : ''}> Ulubiony</label></div>
    <div class="field"><label>Wartości odżywcze na 100 g / 100 ml (opcjonalne)</label>
      <div class="row-inline">
        <div class="field"><input class="input" data-f="kcal" inputmode="decimal" placeholder="kcal" value="${d.kcal != null ? esc(fmtQty(d.kcal)) : ''}"></div>
        <div class="field"><input class="input" data-f="protein" inputmode="decimal" placeholder="białko" value="${d.protein != null ? esc(fmtQty(d.protein)) : ''}"></div>
      </div>
      <div class="row-inline">
        <div class="field"><input class="input" data-f="carbs" inputmode="decimal" placeholder="węgl." value="${d.carbs != null ? esc(fmtQty(d.carbs)) : ''}"></div>
        <div class="field"><input class="input" data-f="fat" inputmode="decimal" placeholder="tłuszcz" value="${d.fat != null ? esc(fmtQty(d.fat)) : ''}"></div>
      </div>
    </div>
    <div class="field"><label>Notatki</label><textarea class="input" data-f="note" rows="2">${esc(d.note)}</textarea></div>
    ${existing ? '<button class="btn danger block" data-act="del-pantry">🗑 Usuń składnik</button>' : ''}
  `;
  openSheet(existing ? 'Edycja składnika' : 'Nowy składnik', body, [
    { label: 'Anuluj', cls: 'ghost', act: () => closeSheet() },
    { label: existing ? 'Zapisz' : 'Dodaj', cls: 'primary', act: () => savePantry(d) }
  ], (root) => {
    root.querySelectorAll('[data-unit]').forEach((el) => el.addEventListener('click', () => {
      root.querySelector('[data-f="defaultUnit"]').value = el.dataset.unit;
      root.querySelectorAll('[data-unit]').forEach((x) => x.classList.remove('on')); el.classList.add('on');
    }));
    const del = root.querySelector('[data-act="del-pantry"]');
    if (del) del.addEventListener('click', async () => { if (confirm('Usunąć składnik?')) { await dbDel('pantry', d.id); await loadAll(); closeSheet(); render(); } });
  });
}
async function savePantry(d) {
  const root = $('#modal-root');
  const g = (f) => root.querySelector(`[data-f="${f}"]`);
  d.name = g('name').value.trim();
  d.emoji = g('emoji').value.trim();
  d.category = g('category').value;
  d.defaultUnit = g('defaultUnit').value.trim();
  d.isFavorite = g('isFavorite').checked;
  d.note = g('note').value;
  d.kcal = parseNum(g('kcal').value); d.protein = parseNum(g('protein').value);
  d.carbs = parseNum(g('carbs').value); d.fat = parseNum(g('fat').value);
  if (!d.name) { alert('Podaj nazwę składnika.'); return; }
  await dbPut('pantry', d); await loadAll(); closeSheet(); render(); toast('Zapisano');
}

/* ================= Lista zakupów ================= */

async function addRecipeToShopping(r, servings) {
  const factor = (r.servings > 0 && servings > 0) ? servings / r.servings : 1;
  const existing = state.shopping.slice();
  let base = (existing.reduce((m, x) => Math.max(m, x.sortIndex || 0), 0)) + 1;
  for (const i of (r.ingredients || [])) {
    const name = (i.name || '').trim(); if (!name) continue;
    const scaled = i.qty != null ? i.qty * factor : null;
    const match = existing.find((x) => x.name.toLowerCase() === name.toLowerCase() && x.unit === (i.unit || '') && !x.checked);
    if (match) { if (scaled != null) { match.qty = (match.qty || 0) + scaled; await dbPut('shopping', match); } }
    else {
      const item = { id: uid(), name, qty: scaled, unit: i.unit || '', category: i.category || 'other', checked: false, sortIndex: base++, createdAt: new Date().toISOString() };
      existing.push(item); await dbPut('shopping', item);
    }
  }
  await loadAll();
}

function renderShopping(view) {
  const items = state.shopping;
  const remaining = items.filter((x) => !x.checked).length;
  let listHtml;
  if (!items.length) {
    listHtml = `<div class="empty"><div class="ico">🛒</div><h2>Lista pusta</h2><p>Dodaj składniki z przepisu („Do zakupów”) albo pozycję ręcznie przyciskiem +.</p></div>`;
  } else {
    const groups = {};
    items.forEach((x) => { (groups[x.category] = groups[x.category] || []).push(x); });
    const order = CATEGORIES.map((c) => c.id).filter((id) => groups[id]);
    listHtml = '<div class="list">' + order.map((cid) => {
      const rows = groups[cid].sort((a, b) => (a.checked - b.checked) || (a.sortIndex - b.sortIndex)).map((x) => `
        <div class="row ${x.checked ? 'checked' : ''}" data-action="toggle" data-id="${x.id}">
          <span class="check ${x.checked ? 'on' : ''}">${x.checked ? '✓' : ''}</span>
          <div class="grow"><div class="name">${esc(x.name)}</div>${(x.qty != null || x.unit) ? `<div class="sub">${x.qty != null ? esc(fmtQty(x.qty)) : ''} ${esc(x.unit || '')}</div>` : ''}</div>
          <button class="btn ghost danger" data-action="del-shop" data-id="${x.id}">✕</button>
        </div>`).join('');
      return `<div class="group-h">${cat(cid).emoji} ${cat(cid).title}</div>${rows}`;
    }).join('') + '</div>';
  }
  view.innerHTML = `
    <div class="screen-head"><h1>Zakupy</h1><div class="spacer"></div>
      ${items.length ? '<button class="btn small" data-action="clear-checked">Usuń odhaczone</button><button class="btn small danger" data-action="clear-all">Wyczyść</button>' : ''}
    </div>
    ${items.length ? `<p class="muted" style="margin:-6px 0 12px">Do kupienia: ${remaining} z ${items.length}</p>` : ''}
    ${listHtml}
    <button class="fab" data-action="add-shop">+</button>`;

  view.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', (e) => onShopAction(el.dataset.action, el.dataset.id, e)));
}
async function onShopAction(action, id, e) {
  if (action === 'del-shop') { e.stopPropagation(); await dbDel('shopping', id); await loadAll(); render(); }
  else if (action === 'toggle') { const it = byId(state.shopping, id); it.checked = !it.checked; await dbPut('shopping', it); await loadAll(); render(); }
  else if (action === 'clear-checked') { for (const x of state.shopping.filter((s) => s.checked)) await dbDel('shopping', x.id); await loadAll(); render(); }
  else if (action === 'clear-all') { if (confirm('Wyczyścić całą listę?')) { await dbClear('shopping'); await loadAll(); render(); } }
  else if (action === 'add-shop') openShopAdd();
}
function openShopAdd() {
  const catOpts = CATEGORIES.map((c) => `<option value="${c.id}">${c.emoji} ${c.title}</option>`).join('');
  const body = `
    <div class="field"><label>Nazwa</label><input class="input" id="sname" placeholder="np. Mleko"></div>
    <div class="row-inline">
      <div class="field mini"><label>Ilość</label><input class="input" id="sqty" inputmode="decimal"></div>
      <div class="field"><label>Jednostka</label><input class="input" id="sunit"></div>
    </div>
    <div class="field"><label>Kategoria</label><select class="input" id="scat">${catOpts}</select></div>`;
  openSheet('Nowa pozycja', body, [
    { label: 'Anuluj', cls: 'ghost', act: () => closeSheet() },
    { label: 'Dodaj', cls: 'primary', act: async () => {
      const name = $('#sname').value.trim(); if (!name) { alert('Podaj nazwę.'); return; }
      const item = { id: uid(), name, qty: parseNum($('#sqty').value), unit: $('#sunit').value.trim(), category: $('#scat').value, checked: false, sortIndex: Date.now(), createdAt: new Date().toISOString() };
      await dbPut('shopping', item); await loadAll(); closeSheet(); render();
    } }
  ]);
}

/* ================= Ustawienia ================= */

function renderSettings(view) {
  view.innerHTML = `
    <div class="screen-head"><h1>Ustawienia</h1></div>
    ${isStandalone() ? '' : `<div class="section">
      <h3>📲 Aplikacja</h3>
      <p class="muted" style="margin-bottom:12px">Zainstaluj Przepisy, aby mieć ikonę na ekranie i pełne działanie offline.</p>
      <button class="btn primary block" data-action="install">📲 Zainstaluj aplikację</button>
    </div>`}
    <div class="section">
      <h3>💾 Kopia zapasowa</h3>
      <p class="muted" style="margin-bottom:12px">Kopia zawiera wszystkie przepisy i ulubione składniki (plik JSON). Import dodaje dane, nie kasuje istniejących.</p>
      <button class="btn block" data-action="export" style="margin-bottom:8px">↧ Eksportuj do pliku</button>
      <label class="btn block">↥ Importuj z pliku<input type="file" accept=".json,application/json" id="importFile" hidden></label>
    </div>
    <div class="section">
      <h3>📦 Twoje dane</h3>
      <div class="row" style="border:none;padding:6px 0"><div class="grow">Przepisy</div><b>${state.recipes.length}</b></div>
      <div class="row" style="border:none;padding:6px 0"><div class="grow">Ulubione składniki</div><b>${state.pantry.length}</b></div>
      <div class="row" style="border:none;padding:6px 0"><div class="grow">Pozycje na liście zakupów</div><b>${state.shopping.length}</b></div>
    </div>
    <div class="section">
      <h3>ℹ️ O aplikacji</h3>
      <p class="muted">Wszystkie dane są przechowywane wyłącznie lokalnie w tej przeglądarce — bez konta i bez chmury. Dodaj aplikację do ekranu początkowego, aby działała jak zwykła apka i offline.</p>
    </div>`;
  view.querySelector('[data-action="export"]').addEventListener('click', exportData);
  view.querySelector('#importFile').addEventListener('change', importData);
  const ib = view.querySelector('[data-action="install"]');
  if (ib) ib.addEventListener('click', doInstall);
}

function exportData() {
  const data = { version: 1, exportedAt: new Date().toISOString(), recipes: state.recipes, pantry: state.pantry };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'przepisy-kopia.json'; a.click();
  URL.revokeObjectURL(url); toast('Wyeksportowano');
}
async function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const existingNames = new Set(state.pantry.map((p) => p.name.toLowerCase()));
    for (const p of (data.pantry || [])) {
      if (existingNames.has((p.name || '').toLowerCase())) continue;
      p.id = p.id || uid(); await dbPut('pantry', p);
    }
    let count = 0;
    for (const r of (data.recipes || [])) { r.id = uid(); await dbPut('recipes', r); count++; }
    await loadAll(); render(); toast('Zaimportowano ' + count + ' przepis(ów)');
  } catch (err) { alert('Nie udało się wczytać pliku: ' + err.message); }
  e.target.value = '';
}

/* ================= Tryb gotowania ================= */

let cookState = null;
let wakeLock = null;

async function openCooking(r, servings) {
  const steps = (r.steps || []);
  if (!steps.length) return;
  cookState = { r, servings, i: 0, timer: null, remaining: 0, running: false, timerId: null };
  document.body.insertAdjacentHTML('beforeend', '<div class="cook" id="cook"></div>');
  requestWake();
  renderCooking();
}
async function requestWake() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {} }
function releaseWake() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }

function renderCooking() {
  const el = $('#cook'); if (!el || !cookState) return;
  const { r, i } = cookState;
  const steps = r.steps;
  const step = steps[i];
  const factor = (r.servings > 0 && cookState.servings > 0) ? cookState.servings / r.servings : 1;
  const pct = Math.round((i + 1) / steps.length * 100);
  el.innerHTML = `
    <div class="top">
      <button class="btn ghost" data-c="close">✕ Zamknij</button>
      <div class="spacer" style="flex:1"></div>
      <button class="btn ghost" data-c="ings">🧾 Składniki</button>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="muted" style="text-align:center;font-weight:600">Krok ${i + 1} z ${steps.length}</div>
    <div class="steptext">${esc(step.text || '…')}</div>
    ${step.timerMinutes ? `<div class="timer"><div class="t" id="tval">${fmtTimer(cookState.remaining || step.timerMinutes * 60)}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:8px">
        <button class="btn primary" data-c="tstart">${cookState.running ? '⏸ Pauza' : '▶ Start'}</button>
        <button class="btn" data-c="treset">↺ Reset</button>
      </div></div>` : ''}
    <div class="nav-btns">
      <button class="btn" data-c="prev" ${i === 0 ? 'disabled' : ''}>‹ Wstecz</button>
      ${i === steps.length - 1 ? '<button class="btn primary" data-c="close">✓ Zakończ</button>' : '<button class="btn primary" data-c="next">Dalej ›</button>'}
    </div>`;
  el.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => onCook(b.dataset.c)));
  el._factor = factor;
}
function fmtTimer(sec) { sec = Math.max(0, sec | 0); const m = Math.floor(sec / 60), s = sec % 60; return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }

function onCook(c) {
  const steps = cookState.r.steps;
  if (c === 'close') return closeCooking();
  if (c === 'prev') { stopTimer(); cookState.i = Math.max(0, cookState.i - 1); cookState.remaining = 0; cookState.running = false; renderCooking(); }
  else if (c === 'next') { stopTimer(); cookState.i = Math.min(steps.length - 1, cookState.i + 1); cookState.remaining = 0; cookState.running = false; renderCooking(); }
  else if (c === 'ings') showCookIngredients();
  else if (c === 'tstart') toggleTimer();
  else if (c === 'treset') { stopTimer(); cookState.remaining = steps[cookState.i].timerMinutes * 60; cookState.running = false; renderCooking(); }
}
function toggleTimer() {
  const step = cookState.r.steps[cookState.i];
  if (!cookState.remaining) cookState.remaining = step.timerMinutes * 60;
  cookState.running = !cookState.running;
  if (cookState.running) {
    cookState.timerId = setInterval(() => {
      cookState.remaining--;
      const t = $('#tval'); if (t) t.textContent = fmtTimer(cookState.remaining);
      if (cookState.remaining <= 0) { stopTimer(); const t2 = $('#tval'); if (t2) t2.classList.add('done'); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} }
    }, 1000);
  } else { clearInterval(cookState.timerId); }
  renderCooking();
}
function stopTimer() { if (cookState && cookState.timerId) { clearInterval(cookState.timerId); cookState.timerId = null; } if (cookState) cookState.running = false; }
function showCookIngredients() {
  const r = cookState.r; const factor = (r.servings > 0 && cookState.servings > 0) ? cookState.servings / r.servings : 1;
  const body = (r.ingredients || []).map((i) => `<div class="ing-line"><span class="dot">•</span><span>${esc(ingLine(i, factor))}</span></div>`).join('');
  openSheet('Składniki (' + cookState.servings + ' porcji)', body, [{ label: 'Zamknij', cls: 'primary', act: () => closeSheet() }]);
}
function closeCooking() { stopTimer(); releaseWake(); const el = $('#cook'); if (el) el.remove(); cookState = null; }

/* ================= Udostępnianie ================= */

async function shareRecipe(r, servings) {
  const factor = (r.servings > 0 && servings > 0) ? servings / r.servings : 1;
  let text = (r.name || 'Przepis') + '\n';
  const meta = ['Porcje: ' + servings];
  if (r.prepMinutes) meta.push('Przygotowanie: ' + fmtDur(r.prepMinutes));
  if (r.cookMinutes) meta.push('Gotowanie: ' + fmtDur(r.cookMinutes));
  text += meta.join(' · ') + '\n';
  if (r.summary) text += '\n' + r.summary + '\n';
  if ((r.ingredients || []).length) { text += '\nSkładniki:\n'; r.ingredients.forEach((i) => text += '• ' + ingLine(i, factor) + '\n'); }
  if ((r.steps || []).length) { text += '\nPrzygotowanie:\n'; r.steps.forEach((s, k) => text += (k + 1) + '. ' + s.text + '\n'); }
  if (r.sourceUrl) text += '\nŹródło: ' + r.sourceUrl + '\n';
  try {
    if (navigator.share) { await navigator.share({ title: r.name, text }); return; }
  } catch (e) { return; }
  try { await navigator.clipboard.writeText(text); toast('Skopiowano do schowka'); }
  catch (e) { alert(text); }
}

/* ================= Arkusze (modale) ================= */

function openSheet(title, bodyHtml, buttons, onMount) {
  const btns = (buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-btn="${i}">${esc(b.label)}</button>`).join('');
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay" data-overlay><div class="sheet">
      <div class="sheet-head">${btns.length ? '' : ''}<div style="width:70px">${buttons && buttons[0] ? `<button class="btn ghost" data-btn="0">${esc(buttons[0].label)}</button>` : ''}</div>
        <h2>${esc(title)}</h2>
        <div style="width:70px;text-align:right">${buttons && buttons[1] ? `<button class="btn ${buttons[1].cls || ''}" data-btn="1">${esc(buttons[1].label)}</button>` : ''}</div>
      </div>
      <div class="sheet-body">${bodyHtml}</div>
    </div></div>`;
  const sheet = root.querySelector('.sheet');
  root.querySelectorAll('[data-btn]').forEach((b) => b.addEventListener('click', () => { const idx = +b.dataset.btn; buttons[idx] && buttons[idx].act(); }));
  // klik w tło zamyka tylko gdy jest przycisk "Anuluj/Zamknij" (bezpieczeństwo)
  root.querySelector('[data-overlay]').addEventListener('click', (e) => { if (e.target.dataset.overlay !== undefined) closeSheet(); });
  if (onMount) onMount(sheet);
}
function closeSheet() { $('#modal-root').innerHTML = ''; }
function reopenScroll() {}

/* ================= Instalacja PWA ================= */

let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

async function doInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (choice && choice.outcome === 'accepted') hideInstallBanner();
    return;
  }
  showInstallHelp();
}

function showInstallHelp() {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ios = `<div class="section"><h3>📱 iPhone / iPad (Safari)</h3>
    <p>Naciśnij <b>Udostępnij</b> (kwadrat ze strzałką ↑) na dolnym pasku, przewiń i wybierz <b>„Dodaj do ekranu początkowego"</b>.</p></div>`;
  const other = `<div class="section"><h3>💻 Mac / komputer</h3>
    <p><b>Safari:</b> menu <b>Plik → Dodaj do Docka</b>.<br><b>Chrome / Edge:</b> ikona instalacji po prawej w pasku adresu (albo menu → „Zainstaluj Przepisy").</p></div>`;
  openSheet('Zainstaluj aplikację', (isIOS ? ios + other : other + ios) +
    `<p class="muted">Po instalacji apka dostaje własną ikonę i działa offline — bez internetu.</p>`,
    [{ label: 'Zamknij', cls: 'primary', act: () => closeSheet() }]);
}

function showInstallBanner() {
  if (isStandalone() || localStorage.getItem('installDismissed')) return;
  if (document.getElementById('install-banner')) return;
  const b = document.createElement('div');
  b.id = 'install-banner';
  b.className = 'install-banner';
  b.innerHTML = `<span class="grow">📲 Zainstaluj Przepisy, aby działały offline (np. w sklepie).</span>
    <button class="btn small" id="ib-install">Zainstaluj</button>
    <button class="btn small ghost" id="ib-close" style="color:#fff">✕</button>`;
  document.getElementById('app').prepend(b);
  b.querySelector('#ib-install').addEventListener('click', doInstall);
  b.querySelector('#ib-close').addEventListener('click', () => { localStorage.setItem('installDismissed', '1'); b.remove(); });
}
function hideInstallBanner() { const b = document.getElementById('install-banner'); if (b) b.remove(); }

/* ================= Start ================= */

async function init() {
  try {
    await loadAll();
    if (!localStorage.getItem('przepisy_seeded')) {
      if (state.recipes.length === 0) await seed();
      localStorage.setItem('przepisy_seeded', '1');
      await loadAll();
    }
  } catch (e) { console.error('Błąd inicjalizacji bazy', e); }

  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-action="tab"]'); if (!b) return;
    state.tab = b.dataset.id; state.detailId = null; render();
  });
  // delegacja dla FAB / kart itd. w widoku przepisów
  $('#view').addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]'); if (!el) return;
    const a = el.dataset.action, id = el.dataset.id;
    if (a === 'open') { state.detailId = id; const r = byId(state.recipes, id); state.detailServings = r ? r.servings : 1; render(); }
    else if (a === 'add-recipe') openRecipeEditor(null);
    else if (a === 'filters') openFiltersSheet();
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; hideInstallBanner(); });

  render();
  showInstallBanner();

  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (e) { /* offline niedostępny bez https */ }
  }
}
init();
