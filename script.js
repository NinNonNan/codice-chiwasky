/**
 * Scroll infinito per un blocco di appunti da Markdown.
 * Ogni file è in `notes/` numerati 1.md, 2.md, …
 * Usa ‘marked’ per convertire in HTML e poi spezza in pagine `.page`.
 */

let currentPage = 1;
const container = document.getElementById("container");
let loading = false;
let hasMorePages = true;

// Altezza effettiva interna (clientHeight) di una .page, inclusi padding
function computePageHeight() {
  const tmp = document.createElement("div");
  tmp.className = "page";
  tmp.style.visibility = "hidden";
  document.body.appendChild(tmp);
  const h = tmp.clientHeight;
  document.body.removeChild(tmp);
  return h;
}
const PAGE_HEIGHT = computePageHeight();
const MAX_TEXT_SEGMENT = 100;   // lunghezza massima segmenti di testo

// Crea una pagina ma NON la appende subito
function createPage() {
  return document.createElement("div");
}

// Spezza testo in segmenti più piccoli, per evitare overflow di un paragrafo lungo
function splitText(text) {
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

/**
 * Tenta di appendere node in page:
 * - Se ci sta, ritorna true.
 * - Se trabocca:
 *    - se è testo: spezza in frasi e le riprova una a una
 *    - altrimenti: ritorna false (deve andare su pagina nuova)
 */
function appendNode(node, page) {
  page.appendChild(node);
  if (page.scrollHeight <= PAGE_HEIGHT) return true;
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    const segments = splitText(node.textContent);
    for (const seg of segments) {
      const txt = document.createTextNode(seg);
      if (!appendNode(txt, page)) {
        return false; // il resto va su pagina nuova
      }
    }
    return true;
  }

  return false;
}

/**
 * Data una lista UL, aggiunge i LI uno a uno, spostando ciascuno se non ci sta.
 */
function paginateList(ul, page, pages) {
  let list = ul.cloneNode(false);
  for (const li of ul.children) {
    const item = li.cloneNode(true);
    if (!page.contains(list)) page.appendChild(list);
    list.appendChild(item);
    if (page.scrollHeight > PAGE_HEIGHT) {
      list.removeChild(item);
      // salva pagina corrente
      pages.push(page);
      // nuova pagina e nuova lista
      page = createPage();
      list = ul.cloneNode(false);
      list.appendChild(item);
    }
  }
  return { page, listAppended: !!list.childNodes.length };
}

/**
 * Converte l'HTML di un Markdown in pagine `.page`, appendendole.
 */
function paginateHTML(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const pages = [];
  let page = createPage();

  for (const child of Array.from(wrapper.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "UL") {
      const result = paginateList(child, page, pages);
      if (result.listAppended) pages.push(page);
      page = createPage();
    } else {
      if (!appendNode(child.cloneNode(true), page)) {
        pages.push(page);
        page = createPage();
        appendNode(child.cloneNode(true), page);
      }
    }
  }
  if (page.childNodes.length) pages.push(page);

  // append finali
  for (const p of pages) {
    p.classList.add("page");
    container.appendChild(p);
  }
}

/**
 * Carica e paginizza il prossimo file Markdown.
 */
async function loadNextPage() {
  if (loading || !hasMorePages) return;
  loading = true;
  try {
    const res = await fetch(`notes/${currentPage}.md`);
    if (!res.ok) { hasMorePages = false; return; }
    const md = await res.text();
    const html = marked.parse(md);
    paginateHTML(html);
    currentPage++;
  } catch (e) {
    console.error(e);
    hasMorePages = false;
  } finally {
    loading = false;
  }
}

/**
 * Precarica finché non compare lo scroll.
 */
async function preload() {
  while (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
    await loadNextPage();
  }
}

window.addEventListener("DOMContentLoaded", preload);
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});
