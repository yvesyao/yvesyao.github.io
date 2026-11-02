export function clampPage(value, count) {
  const number = Number(value);
  return Math.max(0, Math.min(count - 1, Number.isFinite(number) ? Math.trunc(number) : 0));
}

export function stateFromSearch(search, editions, defaultVersion) {
  const params = new URLSearchParams(search);
  const edition = editions.find(item => item.id === params.get('v'))
    ?? editions.find(item => item.id === defaultVersion)
    ?? editions[0];
  return { version: edition.id, page: clampPage(params.get('p'), edition.pages.length) };
}

async function startReader() {
  const byId = id => document.getElementById(id);
  const response = await fetch('./books.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Book catalog unavailable');
  const catalog = await response.json();
  let state = stateFromSearch(location.search, catalog.editions, catalog.defaultVersion);
  const editionButtons = new Map();
  const pageButtons = [];
  const image = byId('page-image');
  const message = byId('message');

  function render(updateUrl = true) {
    const edition = catalog.editions.find(item => item.id === state.version);
    state.page = clampPage(state.page, edition.pages.length);
    const page = edition.pages[state.page];
    image.src = page.image;
    image.alt = page.alt;
    image.width = page.width;
    image.height = page.height;
    byId('page-link').href = page.image;
    byId('page-link').setAttribute('aria-label', `打开${page.label}大图`);
    byId('book-title').textContent = edition.title;
    byId('english-title').textContent = edition.englishTitle;
    byId('english-title').hidden = !edition.englishTitle;
    byId('edition-description').textContent = edition.description;
    byId('book-meta').textContent = `${edition.language} · ${edition.pages.length} 页 · ${(edition.pdfBytes / 1024 / 1024).toFixed(1)} MB`;
    byId('download').href = edition.pdf;
    byId('download').download = `${edition.title}-${edition.name}.pdf`;
    byId('page-status').textContent = `${page.label} · ${state.page + 1} / ${edition.pages.length}`;
    byId('previous').disabled = state.page === 0;
    byId('next').disabled = state.page === edition.pages.length - 1;
    for (const [id, button] of editionButtons) button.setAttribute('aria-pressed', String(id === edition.id));
    pageButtons.forEach((button, index) => {
      if (index === state.page) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    document.title = `${edition.title} · ${edition.name} | Ozzy & Teddy`;
    message.hidden = true;
    if (updateUrl) history.replaceState(null, '', `${location.pathname}?v=${edition.id}&p=${state.page}`);
    const upcoming = edition.pages[state.page + 1];
    if (upcoming) { const preload = new Image(); preload.src = upcoming.image; }
  }

  catalog.editions.forEach(edition => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'edition-button';
    button.setAttribute('aria-label', edition.name);
    const number = document.createElement('span');
    number.className = 'edition-number';
    number.setAttribute('aria-hidden', 'true');
    number.textContent = edition.id.slice(1).padStart(2, '0');
    const label = document.createElement('span');
    label.textContent = edition.name;
    button.append(number, label);
    button.addEventListener('click', () => { state.version = edition.id; render(); });
    byId('versions').append(button);
    editionButtons.set(edition.id, button);
  });

  const currentEdition = catalog.editions.find(item => item.id === state.version);
  currentEdition.pages.forEach((page, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = index === 0 ? '封面' : String(index);
    button.setAttribute('aria-label', `跳到${page.label}`);
    button.addEventListener('click', () => { state.page = index; render(); });
    byId('page-jumps').append(button);
    pageButtons.push(button);
  });

  function move(delta) { state.page += delta; render(); }
  byId('previous').addEventListener('click', () => move(-1));
  byId('next').addEventListener('click', () => move(1));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  window.addEventListener('popstate', () => {
    state = stateFromSearch(location.search, catalog.editions, catalog.defaultVersion);
    render(false);
  });
  image.addEventListener('error', () => {
    message.textContent = '这一页暂时没有加载出来。请重试，或下载完整 PDF 阅读。';
    message.hidden = false;
  });
  render(false);
}

if (typeof document !== 'undefined') {
  startReader().catch(() => {
    const message = document.getElementById('message');
    message.textContent = '暂时无法加载版本列表，你仍可下载上方的完整绘本。';
    message.hidden = false;
  });
}
