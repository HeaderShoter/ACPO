let data = [];
let sortColumn = "title";
let sortDirection = "asc";
let currentFontSize = 16;

const sheetId = "1p08YqPtheg66-0BuI5MvefcZJ7xMRqqXsJ4998naSUA";
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

// ------------- Google Sheets loader -------------
async function fetchData() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const json = JSON.parse(text.slice(47, -2));
  // Kolumny: 0=id, 1=title, 2=author, 3=event, 4=status, 5=hasSheet, 6-9=s,a,t,b
  return json.table.rows.map(r => ({
    id: r.c[0]?.v ?? "",
    title: r.c[1]?.v ?? "",
    author: r.c[2]?.v ?? "",
    event: r.c[3]?.v ?? "",
    status: Number(r.c[4]?.v) || 0,
    hasSheetMusic: !!r.c[5]?.v,
    hasSoprano: !!r.c[6]?.v,
    hasAlto: !!r.c[7]?.v,
    hasTenor: !!r.c[8]?.v,
    hasBass: !!r.c[9]?.v
  }));
}

// Preferencje z localStorage
document.addEventListener("DOMContentLoaded", async () => {
  const savedTheme = localStorage.getItem("choir-theme");
  if (savedTheme === "dark") document.documentElement.classList.add("dark");

  const savedFont = localStorage.getItem("choir-font-size");
  if (savedFont) {
    currentFontSize = parseInt(savedFont);
    document.documentElement.style.fontSize = currentFontSize + "px";
  }

  // Poczekaj na dane z Google Sheets
  data = await fetchData();
  renderFilters();
  renderTable();
});

// ----------- Sterowanie motywem i czcionką ---------
document.querySelector('.controls__button--theme-toggle').onclick = () => {
  document.documentElement.classList.toggle("dark");
  const newTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("choir-theme", newTheme);
  document.querySelector('.controls__icon').textContent = newTheme === "dark" ? "☀️" : "🌙";
};

document.querySelector('.controls__button--font-increase').onclick = () => {
  currentFontSize = Math.min(currentFontSize + 2, 24);
  document.documentElement.style.fontSize = currentFontSize + "px";
  localStorage.setItem("choir-font-size", currentFontSize);
};
document.querySelector('.controls__button--font-decrease').onclick = () => {
  currentFontSize = Math.max(currentFontSize - 2, 12);
  document.documentElement.style.fontSize = currentFontSize + "px";
  localStorage.setItem("choir-font-size", currentFontSize);
};

// ----------- Normalizacja tekstu dla wyszukiwarki ---------
function normalizeText(str) {
  return (str||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, "l")
    .replace(/\s+/g, " ")
    .trim();
}
function fuzzyMatch(searchTerm, targetText) {
  if (!searchTerm) return true;
  const normalizedSearch = normalizeText(searchTerm);
  const normalizedTarget = normalizeText(targetText);
  if (normalizedTarget.includes(normalizedSearch)) return true;
  const searchWords = normalizedSearch.split(" ").filter(Boolean);
  return searchWords.every(word => normalizedTarget.includes(word));
}

// ----------- Wypełnianie selectów filtrujących ---------
function renderFilters() {
  const authorSet = new Set(data.map(x => x.author).filter(Boolean));
  const titleSet = new Set(data.map(x => x.title).filter(Boolean));
  const eventSet = new Set(data.map(x => x.event).filter(Boolean));
  fillSelect('.filters__select--author', ["Wszyscy autorzy", ...[...authorSet]], ["all", ...[...authorSet]]);
  fillSelect('.filters__select--title', ["Wszystkie tytuły", ...[...titleSet]], ["all", ...[...titleSet]]);
  fillSelect('.filters__select--event', ["Wszystkie wydarzenia", ...[...eventSet]], ["all", ...[...eventSet]]);
}

function fillSelect(selector, names, values) {
  const select = document.querySelector(selector);
  select.innerHTML = "";
  names.forEach((n, i) => {
    const opt = document.createElement("option");
    opt.value = values[i];
    opt.textContent = n;
    select.appendChild(opt);
  });
}

// ----------- Wyszukiwanie, filtrowanie i sortowanie ----------
function getFilters() {
  return {
    search: document.querySelector('.search__input').value,
    onlyActive: document.querySelector('.filters__checkbox--active').checked,
    author: document.querySelector('.filters__select--author').value,
    title: document.querySelector('.filters__select--title').value,
    event: document.querySelector('.filters__select--event').value,
  }
}
function filterAndSort() {
  const f = getFilters();
  let result = data.filter(piece => {
    if (f.search && !(
      fuzzyMatch(f.search, piece.title) ||
      fuzzyMatch(f.search, piece.author) ||
      fuzzyMatch(f.search, piece.event)
    )) return false;
    if (f.onlyActive && piece.status !== 1) return false;
    if (f.author !== "all" && piece.author !== f.author) return false;
    if (f.title !== "all" && piece.title !== f.title) return false;
    if (f.event !== "all" && piece.event !== f.event) return false;
    return true;
  });
  result.sort((a, b) => {
    let va = a[sortColumn] || "";
    let vb = b[sortColumn] || "";
    if (sortDirection === "asc") return va.localeCompare(vb, "pl");
    else return vb.localeCompare(va, "pl");
  });
  return result;
}

// ----------- Renderowanie tabeli -----------
function renderTable() {
  const tbody = document.querySelector('.results__body');
  tbody.innerHTML = "";
  const rows = filterAndSort();
  rows.forEach(piece => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${piece.title}</td>
      <td>${piece.author}</td>
      <td>${piece.event}</td>
      <td class="results__cell--actions">
        ${piece.hasSheetMusic ? `<button class="action-btn" data-type="sheet" data-id="${piece.id}">🎼</button>` : ""}
        ${(piece.hasSoprano || piece.hasAlto || piece.hasTenor || piece.hasBass) ? `<button class="action-btn" data-type="audio" data-id="${piece.id}">🔊</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Obsługa sortowania kliknięciem w nagłówki
document.querySelectorAll('.results__header[data-key]').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.key;
    if (sortColumn === col) sortDirection = sortDirection === "asc" ? "desc" : "asc";
    else {
      sortColumn = col;
      sortDirection = "asc";
    }
    renderTable();
  });
});

// Obsługa filtrów i wyszukiwania
['.search__input', '.filters__checkbox--active', '.filters__select--author', '.filters__select--title', '.filters__select--event']
  .forEach(sel => {
    document.querySelector(sel).addEventListener('input', renderTable);
  });

// ----------- Modal -----------
let currentPieceId = null;
let currentModalType = null;
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.setAttribute("aria-hidden", "true"));
  document.body.style.overflow = "";
}
function openModal(type, id) {
  closeAllModals();
  currentPieceId = id;
  currentModalType = type;
  if (type === "audio") {
    document.getElementById('audio-modal').setAttribute("aria-hidden", "false");
    // domyślna opcja - soprano jeśli istnieje, inaczej alt itd.
    const piece = data.find(p => p.id === id);
    let firstVoice = "soprano";
    if (!piece.hasSoprano && piece.hasAlto) firstVoice = "alto";
    if (!piece.hasSoprano && !piece.hasAlto && piece.hasTenor) firstVoice = "tenor";
    if (!piece.hasSoprano && !piece.hasAlto && !piece.hasTenor && piece.hasBass) firstVoice = "bass";
    document.getElementById('voice-select').value = firstVoice;
  }
  else {
    document.getElementById('sheet-modal').setAttribute("aria-hidden", "false");
  }
  document.body.style.overflow = "hidden";
}

// Akcje w tabeli
document.querySelector('.results__body').addEventListener('click', e => {
  const btn = e.target.closest('button.action-btn');
  if (!btn) return;
  openModal(btn.dataset.type, btn.dataset.id);
});

// Zamknij modale
document.querySelectorAll('.modal__btn--close').forEach(btn => {
  btn.addEventListener('click', () => {
    closeAllModals();
  });
});

// Pobierz / Otwórz nuty/audio
function voiceToLetter(v) {
  return {soprano: "s", alto: "a", tenor: "t", bass: "b"}[v];
}
document.querySelectorAll('.modal__btn--download, .modal__btn--open').forEach(btn => {
  btn.addEventListener('click', () => {
    const isSheet = btn.dataset.type === "sheet";
    const openInNew = btn.classList.contains('modal__btn--open');
    let url = isSheet
      ? `https://www.drive.pl/${openInNew ? "play" : "download"}/nuty/${currentPieceId}`
      : `https://www.drive.pl/${openInNew ? "play" : "download"}/audio/${voiceToLetter(document.getElementById('voice-select').value)}/${currentPieceId}`;
    if (openInNew) window.open(url, "_blank");
    else window.location.href = url;
    closeAllModals();
  });
});
