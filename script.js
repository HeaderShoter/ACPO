// script.js
// Inicjalizacja i logika aplikacji z poprawionym pobieraniem pierwszej pozycji

// Globalne zmienne
let allData = [];
let filteredData = [];
let pageIndex = 0;
const pageSize = 20;
let sortKey = 'title';
let sortAsc = true;

// Elementy DOM
const searchInput = document.querySelector('.search__input');
const singingCheckbox = document.querySelector('.filters__checkbox--singing');
const authorSelect = document.querySelector('.filters__select--author');
const titleSelect = document.querySelector('.filters__select--title');
const eventSelect = document.querySelector('.filters__select--event');
const tableBody = document.querySelector('.results__body');
const tableContainer = document.querySelector('.results__table-container');
const themeToggle = document.querySelector('.controls__button--theme-toggle');
const fontIncrease = document.querySelector('.controls__button--font-increase');
const fontDecrease = document.querySelector('.controls__button--font-decrease');
const headerCells = document.querySelectorAll('.results__cell--header');

// Fetch arkusz Google jako JSON
async function fetchSheet() {
  const sheetId = '1p08YqPtheg66-0BuI5MvefcZJ7xMRqqXsJ4998naSUA';
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Sheet1`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.slice(47, -2));
  return json.table.rows.map(r => ({
    id: r.c[0]?.v,
    title: r.c[1]?.v || '',
    author: r.c[2]?.v || '',
    event: r.c[3]?.v || '',
    status: r.c[4]?.v,
    sheetUrl: r.c[5]?.v || '',
    audioS: r.c[6]?.v || '',
    audioA: r.c[7]?.v || '',
    audioT: r.c[8]?.v || '',
    audioB: r.c[9]?.v || ''
  }));
}

// Normalizacja tekstu (usuwanie diakrytyków, spacji i lowercase)
function normalize(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// Filtracja i sortowanie, potem reset i render
function filterAndRender() {
  const q = normalize(searchInput.value);
  filteredData = allData.filter(item => {
    if (singingCheckbox.checked && item.status === 0) return false;
    if (authorSelect.value && item.author !== authorSelect.value) return false;
    if (titleSelect.value && item.title !== titleSelect.value) return false;
    if (eventSelect.value && item.event !== eventSelect.value) return false;
    const hay = normalize(item.title + item.author + item.event);
    return hay.includes(q);
  });
  sortData();
  pageIndex = 0;
  tableBody.innerHTML = '';
  loadMore();
}

// Sortowanie według klucza
function sortData() {
  filteredData.sort((a, b) => {
    const va = a[sortKey] || '';
    const vb = b[sortKey] || '';
    const cmp = va.localeCompare(vb, 'pl');
    return sortAsc ? cmp : -cmp;
  });
}

// Render kolejnego batcha
function loadMore() {
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const batch = filteredData.slice(start, end);
  batch.forEach(addRow);
  pageIndex++;
}

// Dodaje pojedynczy wiersz do tabeli
function addRow(item) {
  const tr = document.createElement('tr');
  tr.className = 'results__row';
  tr.innerHTML = `
    <td class="results__cell">${item.title}</td>
    <td class="results__cell">${item.author}</td>
    <td class="results__cell">${item.event}</td>
    <td class="results__cell results__cell--actions"></td>
  `;
  const actionsTd = tr.querySelector('.results__cell--actions');

  // Nuty
  if (item.sheetUrl) {
    const btn = document.createElement('button');
    btn.className = 'results__button--sheet';
    btn.textContent = '🎼';
    btn.addEventListener('click', () => openSheetModal(item.id));
    actionsTd.appendChild(btn);
  }

  // Audio
  if (item.audioS || item.audioA || item.audioT || item.audioB) {
    const btn = document.createElement('button');
    btn.className = 'results__button--audio';
    btn.textContent = '🔊';
    btn.addEventListener('click', () => openAudioModal(item.id));
    actionsTd.appendChild(btn);
  }

  tableBody.appendChild(tr);
}

// Modal do nut
function openSheetModal(id) {
  const modal = createModal(`
    <button id="download">Pobierz</button>
    <button id="open">Otwórz</button>
    <button id="back">Wróć</button>
  `);
  modal.querySelector('#download').addEventListener('click', () => {
    window.location.href = `https://www.drive.pl/download/nuty/${id}`;
  });
  modal.querySelector('#open').addEventListener('click', () => {
    window.open(`https://www.drive.pl/play/nuty/${id}`, '_blank');
  });
}

// Modal do audio
function openAudioModal(id) {
  const modal = createModal(`
    <select id="voice">
      <option value="s">Sopran</option>
      <option value="a">Alt</option>
      <option value="t">Tenor</option>
      <option value="b">Bas</option>
    </select>
    <button id="download">Pobierz</button>
    <button id="open">Otwórz</button>
    <button id="back">Wróć</button>
  `);
  const select = modal.querySelector('#voice');
  modal.querySelector('#download').addEventListener('click', () => {
    const v = select.value;
    window.location.href = `https://www.drive.pl/download/audio/${v}/${id}`;
  });
  modal.querySelector('#open').addEventListener('click', () => {
    const v = select.value;
    window.open(`https://www.drive.pl/play/audio/${v}/${id}`, '_blank');
  });
}

// Tworzy i wyświetla modal
function createModal(innerHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const box = document.createElement('div');
  box.className = 'modal-box';
  box.innerHTML = innerHtml;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target.id === 'back') {
      document.body.removeChild(overlay);
    }
  });
  return box;
}

// Inicjalizacja motywu i czcionki
function initPreferences() {
  const theme = localStorage.getItem('theme') || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';

  const fs = localStorage.getItem('fontSize');
  if (fs) document.documentElement.style.fontSize = fs + 'px';
}

// Listener scroll do infinite scroll
tableContainer.addEventListener('scroll', () => {
  if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 50) {
    loadMore();
  }
});

// Eventy
searchInput.addEventListener('input', filterAndRender);
singingCheckbox.addEventListener('change', filterAndRender);
authorSelect.addEventListener('change', filterAndRender);
titleSelect.addEventListener('change', filterAndRender);
eventSelect.addEventListener('change', filterAndRender);
fontIncrease.addEventListener('click', () => {
  const root = document.documentElement;
  const size = parseInt(getComputedStyle(root).fontSize) + 1;
  root.style.fontSize = size + 'px';
  localStorage.setItem('fontSize', size);
});
fontDecrease.addEventListener('click', () => {
  const root = document.documentElement;
  const size = parseInt(getComputedStyle(root).fontSize) - 1;
  root.style.fontSize = size + 'px';
  localStorage.setItem('fontSize', size);
});
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
});

headerCells.forEach(th => {
  th.addEventListener('click', () => {
    let key;
    if (th.classList.contains('results__cell--title')) key = 'title';
    else if (th.classList.contains('results__cell--author')) key = 'author';
    else if (th.classList.contains('results__cell--event')) key = 'event';
    if (!key) return;
    if (sortKey === key) sortAsc = !sortAsc;
    else { sortKey = key; sortAsc = true; }
    filterAndRender();
  });
});

// Start
window.addEventListener('DOMContentLoaded', async () => {
  initPreferences();

  allData = await fetchSheet();

  // Wypełnij pola select unikalnymi wartościami
  const authors = [...new Set(allData.map(i => i.author).filter(v => v))];
  authors.forEach(a => authorSelect.append(new Option(a, a)));
  const titles = [...new Set(allData.map(i => i.title).filter(v => v))];
  titles.forEach(t => titleSelect.append(new Option(t, t)));
  const events = [...new Set(allData.map(i => i.event).filter(v => v))];
  events.forEach(e => eventSelect.append(new Option(e, e)));

  // Pierwotne filtrowanie i render
  filterAndRender();
});
