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
  tmp.style.position = "absolute";
  tmp.style.top = "0";
  tmp.style.left = "0";
  tmp.style.width = "100%";
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
  page.style.paddingBottom = "0.1rem"; // ridotto padding-bottom per meno spazio
  return page;
}

// Split helper: frasi
function splitSentences(text) {
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

// Split helper: parole
function splitWords(text) {
  return text.match(/\S+\s*/g) || [text];
}

// Split helper: caratteri
function splitChars(text) {
  return text.split('');
}

/**
 * Tenta di aggiungere node in page:
 * - se ci sta, ritorna true
 * - se non ci sta:
 *    - se è testo, spezza in frasi, poi parole, poi caratteri
 *    - altrimenti ritorna false
 */
function appendNode(node, page) {
  page.appendChild(node);
  if (page.scrollHeight <= SAFE_HEIGHT) return true;
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;

    // 1) Prova frasi
    const sentences = splitSentences(text);
    if (sentences.length > 1) {
      for (const sentence of sentences) {
        const txtNode = document.createTextNode(sentence);
        if (!appendNode(txtNode, page)) return false;
      }
      return true;
    }

    // 2) Prova parole
    const words = splitWords(text);
    if (words.length > 1) {
      for (const word of words) {
        const txtNode = document.createTextNode(word);
        if (!appendNode(txtNode, page)) return false;
      }
      return true;
    }

    // 3) Prova caratteri
    const chars = splitChars(text);
    for (const ch of chars) {
      const txtNode = document.createTextNode(ch);
      if (!appendNode(txtNode, page)) return false;
    }
    return true;
  }

  // Se non è testo e non ci sta, ritorna false
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
