/**
 * Scroll infinito per un blocco di appunti da Markdown.
 * Ogni file è in `notes/` numerati 1.md, 2.md, …
 * Usa ‘marked’ per convertire in HTML e poi spezza in pagine `.page`.
 */

let currentPage = 1;
const container = document.getElementById("container");
let loading = false;
let hasMorePages = true;

/**
 * Calcola l'altezza effettiva interna (clientHeight) di una .page,
 * inclusi padding, per usarla come soglia di overflow.
 * Viene creata una pagina temporanea invisibile nel DOM.
 */
function computePageHeight() {
  const tmp = document.createElement("div");
  tmp.className = "page";
  // Deve essere visibile per avere dimensioni corrette ma fuori flusso
  tmp.style.visibility = "hidden";
  tmp.style.position = "absolute";
  tmp.style.top = "-9999px";
  tmp.style.left = "-9999px";
  document.body.appendChild(tmp);
  const h = tmp.clientHeight;
  document.body.removeChild(tmp);
  return h;
}
const PAGE_HEIGHT = computePageHeight();
// Sicurezza: margine 5% per evitare overflow dovuti a rendering
const SAFE_HEIGHT = PAGE_HEIGHT * 0.95;

/**
 * Crea un nuovo div .page senza appenderlo immediatamente.
 * Imposta box-sizing e padding bottom piccolo per minore spazio vuoto.
 */
function createPage() {
  const page = document.createElement("div");
  page.classList.add("page");
  page.style.boxSizing = "border-box";
  page.style.paddingBottom = "0.1rem"; // riduce spazio in fondo
  return page;
}

/**
 * Funzioni di split per spezzare testo in pezzi più piccoli.
 * Usate per distribuire meglio il contenuto in pagina evitando troppo spazio vuoto.
 */
function splitSentences(text) {
  // Dividi in frasi con punteggiatura inclusa e spazi finali
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}
function splitWords(text) {
  // Dividi in parole con spazi
  return text.match(/\S+\s*/g) || [text];
}
function splitChars(text) {
  // Dividi in singoli caratteri (inclusi spazi)
  return text.split('');
}

/**
 * Funzione ricorsiva che tenta di aggiungere node a page rispettando SAFE_HEIGHT.
 * Se il nodo non ci sta intero, prova a spezzarlo (se testo o elemento).
 * Ritorna true se node è stato inserito parzialmente o totalmente,
 * false se non ci sta niente.
 */
function appendNode(node, page) {
  page.appendChild(node);
  if (page.scrollHeight <= SAFE_HEIGHT) {
    return true;
  }

  // Nodo troppo grande, rimuovo e provo a spezzare
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;

    // 1) Provo a spezzare per frasi
    const sentences = splitSentences(text);
    if (sentences.length > 1) {
      for (const sentence of sentences) {
        const txtNode = document.createTextNode(sentence);
        if (!appendNode(txtNode, page)) return false;
      }
      return true;
    }

    // 2) Provo a spezzare per parole
    const words = splitWords(text);
    if (words.length > 1) {
      for (const word of words) {
        const txtNode = document.createTextNode(word);
        if (!appendNode(txtNode, page)) return false;
      }
      return true;
    }

    // 3) Provo a spezzare per caratteri
    const chars = splitChars(text);
    for (const ch of chars) {
      const txtNode = document.createTextNode(ch);
      if (!appendNode(txtNode, page)) return false;
    }
    return true;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const children = Array.from(node.childNodes);
    if (children.length === 0) {
      // Elemento vuoto o non spezzabile
      return false;
    }

    // Clono il nodo senza figli per inserirlo provvisoriamente
    const clone = node.cloneNode(false);
    page.appendChild(clone);

    for (const child of children) {
      if (!appendNode(child.cloneNode(true), clone)) {
        // Se un figlio non ci sta, rimuovo clone e ritorno false
        page.removeChild(clone);
        return false;
      }
    }
    return true;
  }

  // Se tipo nodo non gestito, ritorna false
  return false;
}

/**
 * Funzione speciale per paginare liste UL.
 * Evita di duplicare li e spezza la lista solo a livello di LI.
 * Ritorna array di pagine generate.
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

  // Spingo anche l'ultima pagina (parziale)
  if (list.childNodes.length > 0 && !pages.includes(page)) {
    pages.push(page);
  }

  return pages;
}

/**
 * Converte l'HTML Markdown in pagine `.page`, appendendole al container.
 * Usa appendNode per tentare di spezzare elementi grandi,
 * e paginateList per UL.
 */
function paginateHTML(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  const pages = [];
  let page = createPage();

  for (const child of Array.from(wrapper.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE && child.tagName === "UL") {
      // paginateList ritorna array di pagine
      const listPages = paginateList(child);
      // Se pagina corrente ha contenuto, la salvo prima
      if (page.childNodes.length) pages.push(page);
      // Aggiungo tutte le pagine generate dalla lista
      pages.push(...listPages);
      // Riparto da pagina vuota
      page = createPage();
    } else {
      // Provo ad aggiungere nodo. Se non ci sta tutto, creo nuova pagina
      if (!appendNode(child.cloneNode(true), page)) {
        pages.push(page);
        page = createPage();
        appendNode(child.cloneNode(true), page);
      }
    }
  }

  if (page.childNodes.length) pages.push(page);

  // Infine appendo tutte le pagine generate al container
  for (const p of pages) {
    container.appendChild(p);
  }
}

/**
 * Carica e paginizza il file markdown successivo.
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
 * Precarica finché non compare scroll (contenuto sufficiente)
 */
async function preload() {
  while (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
    await loadNextPage();
  }
}

// Carico la prima volta a DOMContentLoaded
window.addEventListener("DOMContentLoaded", preload);

// Carico pagine successive quando sto vicino al fondo (300px)
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});
