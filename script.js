let data = [];
let sortColumn = "title";
let sortDirection = "asc";
let currentFontSize = 16;
let eventListenersInitialized = false;

const sheetId = "1p08YqPtheg66-0BuI5MvefcZJ7xMRqqXsJ4998naSUA";
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

async function fetchData() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const json = JSON.parse(text.slice(47, -2));
  return json.table.rows.map(r => ({
    title: r.c[0]?.v ?? "",
    author: r.c[1]?.v ?? "",
    arranger: r.c[2]?.v ?? "",
    genre: r.c[3]?.v ?? "",
    event: r.c[4]?.v ?? "",
    status: Number(r.c[5]?.v) || 0,
    sheetUrl: r.c[6]?.v ?? "", // G
    audioUrls: {
      soprano:   r.c[7]?.v ?? "",
      soprano2:  r.c[8]?.v ?? "",
      alto:      r.c[9]?.v ?? "",
      alto2:     r.c[10]?.v ?? "",
      tenor:     r.c[11]?.v ?? "",
      baryton:   r.c[12]?.v ?? "",
      bass:      r.c[13]?.v ?? "",
      demo:      r.c[14]?.v ?? ""
    },
    hasSheetMusic: !!r.c[6]?.v,
    hasSoprano: !!r.c[7]?.v,
    hasSoprano2: !!r.c[8]?.v,
    hasAlto: !!r.c[9]?.v,
    hasAlto2: !!r.c[10]?.v,
    hasTenor: !!r.c[11]?.v,
    hasBaryton: !!r.c[12]?.v,
    hasBass: !!r.c[13]?.v,
    hasDemo: !!r.c[14]?.v,
    id: `${r.c[0]?.v ?? ""}|${r.c[1]?.v ?? ""}|${r.c[2]?.v ?? ""}|${r.c[3]?.v ?? ""}|${r.c[4]?.v ?? ""}`
  }));
}

document.addEventListener("DOMContentLoaded", async () => {
  // Motyw
  const savedTheme = localStorage.getItem("choir-theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    document.querySelector('.controls__icon').textContent = "☀️";
  } else {
    document.querySelector('.controls__icon').textContent = "🌙";
  }

  // Czcionka
  const savedFont = localStorage.getItem("choir-font-size");
  if (savedFont) {
    currentFontSize = parseInt(savedFont);
    document.documentElement.style.fontSize = currentFontSize + "px";
  }

  // Pobierz dane z arkusza i uruchom UI
  data = await fetchData();
  renderFilters();
  renderTable();

  if (!eventListenersInitialized) {
    setupAllEventListeners();
    eventListenersInitialized = true;
  }
});

function setupAllEventListeners() {
  // Motyw
  document.querySelector('.controls__button--theme-toggle').onclick = () => {
    document.documentElement.classList.toggle("dark");
    const newTheme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("choir-theme", newTheme);
    document.querySelector('.controls__icon').textContent = newTheme === "dark" ? "☀️" : "🌙";
  };
  // Czcionka
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

  // Filtry i wyszukiwanie
  [
    '.search__input', '.filters__checkbox--active', '.filters__select--author',
    '.filters__select--arranger', '.filters__select--genre', '.filters__select--event'
  ].forEach(sel => {
    document.querySelector(sel).addEventListener('input', renderTable);
  });

  // Sortowanie po nagłówkach
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

  // Akcje wierszy tabeli (modale)
  document.querySelector('.results__body').addEventListener('click', e => {
    const btn = e.target.closest('button.action-btn');
    if (!btn) return;
    openModal(btn.dataset.type, btn.dataset.id);
  });

  // Zamknięcie modali
  document.querySelectorAll('.modal__btn--close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Obsługa „pobierz” i „otwórz” (dołączamy jednorazowo)
  document.querySelectorAll('.modal__btn--download, .modal__btn--open').forEach(btn => {
    btn.addEventListener('click', () => {
      const isSheet = btn.dataset.type === "sheet";
      const openInNew = btn.classList.contains('modal__btn--open');
      const piece = data.find(p => p.id === currentPieceId);

      let rawUrl = "";
      if (isSheet) {
        rawUrl = piece.sheetUrl;
      } else {
        const voice = document.getElementById('voice-select').value;
        rawUrl = piece.audioUrls[voice];
      }

      if (!rawUrl) {
        alert("Brak linku do pliku!");
        return;
      }

      // Przetwarzanie linku do pobrania
      function driveToDirect(link) {
        const match = link.match(/\/d\/([^/]+)\//);
        if (!match) return "";
        return `https://drive.usercontent.google.com/u/0/uc?id=${match[1]}&export=download`;
      }

      if (openInNew) {
        // Otwórz w nowej karcie oryginalny link
        window.open(rawUrl, "_blank");
      } else {
        // Pobierz przez drive.usercontent.google.com
        const downloadUrl = driveToDirect(rawUrl);
        if (!downloadUrl) {
          alert("Nieprawidłowy link Google Drive!");
          return;
        }
        window.location.href = downloadUrl;
      }
      closeAllModals();
    });
  });
}

// ---- Filtry, renderowanie, wyszukiwanie ----

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, "l")
    .replace(/\s+/g, " ")
    .trim();
}
function fuzzyMatch(searchTerm, ...fields) {
  if (!searchTerm) return true;
  const normalizedSearch = normalizeText(searchTerm);
  return fields.some(field => {
    const normalizedTarget = normalizeText(field);
    if (normalizedTarget.includes(normalizedSearch)) return true;
    const searchWords = normalizedSearch.split(" ").filter(Boolean);
    return searchWords.every(word => normalizedTarget.includes(word));
  });
}

function renderFilters() {
  const authorSet = new Set(data.map(x => x.author).filter(Boolean));
  const arrangerSet = new Set(data.map(x => x.arranger).filter(Boolean));
  const genreSet = new Set(data.map(x => x.genre).filter(Boolean));
  const eventSet = new Set(data.map(x => x.event).filter(Boolean));
  fillSelect('.filters__select--author', ["Wszyscy autorzy", ...[...authorSet]], ["all", ...[...authorSet]]);
  fillSelect('.filters__select--arranger', ["Wszyscy aranżerzy", ...[...arrangerSet]], ["all", ...[...arrangerSet]]);
  fillSelect('.filters__select--genre', ["Wszystkie gatunki", ...[...genreSet]], ["all", ...[...genreSet]]);
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

function getFilters() {
  return {
    search: document.querySelector('.search__input').value,
    onlyActive: document.querySelector('.filters__checkbox--active').checked,
    author: document.querySelector('.filters__select--author').value,
    arranger: document.querySelector('.filters__select--arranger').value,
    genre: document.querySelector('.filters__select--genre').value,
    event: document.querySelector('.filters__select--event').value,
  }
}
function filterAndSort() {
  const f = getFilters();
  let result = data.filter(piece => {
    if (f.search && !fuzzyMatch(
      f.search,
      piece.title, piece.author, piece.arranger, piece.genre, piece.event
    )) return false;
    if (f.onlyActive && piece.status !== 1) return false;
    if (f.author !== "all" && piece.author !== f.author) return false;
    if (f.arranger !== "all" && piece.arranger !== f.arranger) return false;
    if (f.genre !== "all" && piece.genre !== f.genre) return false;
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

function renderTable() {
  const tbody = document.querySelector('.results__body');
  tbody.innerHTML = "";
  const rows = filterAndSort();
  rows.forEach(piece => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="results__cell--actions">
        ${piece.hasSheetMusic ? `<button class="action-btn" data-type="sheet" data-id="${piece.id}">🎼</button>` : ""}
        ${
          (piece.hasSoprano || piece.hasSoprano2 || piece.hasAlto || piece.hasAlto2 ||
           piece.hasTenor || piece.hasBaryton || piece.hasBass || piece.hasDemo)
            ? `<button class="action-btn" data-type="audio" data-id="${piece.id}">🔊</button>`
            : ""
        }
      </td>  
      <td>${piece.title}</td>
      <td>${piece.author}</td>
      <td>${piece.arranger}</td>
      <td>${piece.genre}</td>
      <td>${piece.event}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------- Modale -----------
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
    const piece = data.find(p => p.id === id);

    // Mapa wszystkich obsługiwanych głosów
    const voiceMap = [
      { key: "soprano",   label: "Sopran" },
      { key: "soprano2",  label: "Sopran 2" },
      { key: "alto",      label: "Alt" },
      { key: "alto2",     label: "Alt 2" },
      { key: "tenor",     label: "Tenor" },
      { key: "baryton",   label: "Baryton" },
      { key: "bass",      label: "Bas" },
      { key: "demo",      label: "Demo" }
    ];

    const select = document.getElementById('voice-select');
    select.innerHTML = ""; // wyczyść stare opcje
    let firstAvailable = null;
    voiceMap.forEach(({key, label}) => {
      if (piece.audioUrls[key]) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = label;
        select.appendChild(opt);
        if (!firstAvailable) firstAvailable = key;
      }
    });
    // Ustaw domyślnie pierwszy dostępny głos
    if (firstAvailable) select.value = firstAvailable;
  }
  else {
    document.getElementById('sheet-modal').setAttribute("aria-hidden", "false");
  }
  document.body.style.overflow = "hidden";
}
