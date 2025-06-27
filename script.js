/**
 * Scroll infinito per un blocco di appunti da Markdown.
 * Ogni file è in `notes/` numerati 1.md, 2.md, …
 * Usa ‘marked’ per convertire in HTML e poi spezza in pagine `.page`.
 */

let currentPage = 1;
const container = document.getElementById("container");
let loading = false;
let hasMorePages = true;

// Calcola altezza effettiva interna (clientHeight) di una .page, inclusi padding
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
const SAFE_HEIGHT = PAGE_HEIGHT * 0.95; // margine 5% in basso

// Crea una pagina ma NON la appende subito
function createPage() {
  const page = document.createElement("div");
  page.classList.add("page");
  page.style.boxSizing = "border-box";
  page.style.paddingBottom = "1.5rem"; // margine inferiore
  return page;
}

// Spezza testo in segmenti più piccoli (frasi)
function splitText(text) {
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

/**
 * Tenta di aggiungere node in page:
 * - se ci sta, ritorna true
 * - se non ci sta:
 *    - se è testo, spezza e prova segmento per segmento
 *    - altrimenti ritorna false
 */
function appendNode(node, page) {
  page.appendChild(node);
  if (page.scrollHeight <= SAFE_HEIGHT) return true;
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    const segments = splitText(node.textContent);
    for (const seg of segments) {
      const txt = document.createTextNode(seg);
      if (!appendNode(txt, page)) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Paginazione per liste UL:
 * Aggiunge LI uno per uno, spostando quelli che non ci stanno in pagine successive.
 * Ritorna array di pagine generate, nessuna duplicazione di LI.
 */
function paginateList(ul) {
  const pages = [];
  let page = createPage();
  let list = ul.cloneNode(false);

  for (const li of ul.children) {
    const liClone = li.cloneNode(true);

    if (!page.contains(list)) page.appendChild(list);
    list.appendChild(liClone);

    if (page.scrollHeight > SAFE_HEIGHT) {
      // Rimuovo li che fa traboccare
      list.removeChild(liClone);

      // Salvo pagina piena
      pages.push(page);

      // Nuova pagina e nuova lista
      page = createPage();
      list = ul.cloneNode(false);
      list.appendChild(liClone);
      page.appendChild(list);
    }
  }

  // Spingo anche l'ultima pagina (che può essere parziale)
  if (list.childNodes.length > 0 && !pages.includes(page)) {
    pages.push(page);
  }

  return pages;
}

/**
 * Converte l'HTML Markdown in pagine `.page`, appendendole.
 */
function paginateHTML(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const pages = [];
  let page = createPage();

  for (const child of Array.from(wrapper.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "UL") {
      // paginateList ritorna array di pagine, le aggiungiamo tutte
      const listPages = paginateList(child);
      // prima aggiungiamo pagina corrente se ha contenuto
      if (page.childNodes.length) pages.push(page);
      // aggiungiamo tutte le pagine generate dalla lista
      pages.push(...listPages);
      // ripartiamo da pagina vuota
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

  for (const p of pages) {
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
    if (!res.ok) {
      hasMorePages = false;
      return;
    }
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
