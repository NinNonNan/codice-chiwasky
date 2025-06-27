/**
 * Scroll infinito per un blocco di appunti generati da file Markdown.
 * 
 * Ogni file è nella cartella `notes/` ed è numerato: 1.md, 2.md, 3.md, ecc.
 * Il contenuto di ciascun file viene convertito in HTML (usando la libreria `marked`)
 * e inserito in un elemento <div class="page"> nel contenitore principale.
 * 
 * Quando l'utente scorre verso il fondo della pagina, viene automaticamente
 * caricato e visualizzato il file Markdown successivo.
 */

let currentPage = 1;             
const container = document.getElementById("container"); // Contenitore principale delle pagine
let loading = false;            
let hasMorePages = true;        

/**
 * Misura l'altezza effettiva di un elemento .page appena creato,
 * per farla coincidere con il CSS (height: calc(...)).
 */
function computePageHeight() {
  const temp = document.createElement('div');
  temp.className = 'page';
  temp.style.visibility = 'hidden';
  document.body.appendChild(temp);
  const h = temp.clientHeight;
  document.body.removeChild(temp);
  return h;
}

const PAGE_HEIGHT = computePageHeight(); // Altezza totale del foglio (CSS-driven)
const RESERVED_PERCENT = 0.02;           // 2% di spazio riservato in fondo
const MAX_RECURSION_DEPTH = 10;          // Profondità massima di ricorsione per evitare loop infiniti

/**
 * Calcola lo spazio riservato in px, in base all'altezza effettiva di ciascun foglio.
 */
function computeReservedSpace(pageHeight) {
  return Math.round(pageHeight * RESERVED_PERCENT);
}

/**
 * Crea un nuovo blocco pagina vuoto (MA non lo appende subito).
 */
function createPage() {
  const page = document.createElement("div");
  page.classList.add("page");
  return page;
}

/**
 * Spezza un testo in chunk di lunghezza massima fissa.
 */
function splitTextToChunks(text, maxLength = 100) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Utility che controlla se la pagina ha superato
 * la parte utilizzabile (escludendo lo spazio riservato).
 */
function isOverflowing(page) {
  const reserved = computeReservedSpace(page.clientHeight);
  return page.scrollHeight > (page.clientHeight - reserved);
}

/**
 * Funzione ricorsiva che prova ad aggiungere un nodo dentro una pagina.
 * Se il nodo supera l'altezza massima effettiva, prova a spezzarlo in nodi più piccoli.
 * Limita la profondità per evitare ricorsione infinita.
 *
 * Ritorna:
 * - true se il nodo (o i suoi pezzi) è stato inserito in questa pagina
 * - false se NON ci stava e deve andare in una pagina nuova
 */
function tryAppendNode(node, page, depth = 0) {
  if (depth > MAX_RECURSION_DEPTH) return false;
  page.appendChild(node);
  if (!isOverflowing(page)) return true;

  // Se trabocca, lo rimuovo e provo a spezzare
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    // Se troppo piccolo non spezzare
    if (node.textContent.length <= 20) return false;
    // Spezza in chunk
    const chunks = splitTextToChunks(node.textContent, 50);
    for (let i = 0; i < chunks.length; i++) {
      const txt = document.createTextNode(chunks[i]);
      if (!tryAppendNode(txt, page, depth + 1)) {
        return false; // resto va su pagina nuova
      }
    }
    return true;
  }

  if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'UL') {
    // Elementi generici: spezza figli
    const children = Array.from(node.childNodes);
    const clone = node.cloneNode(false);
    page.appendChild(clone);
    for (const child of children) {
      if (!tryAppendNode(child.cloneNode(true), clone, depth + 1)) {
        page.removeChild(clone);
        return false;
      }
    }
    return true;
  }

  // Gestione UL: un solo ciclo, senza duplicazioni
  if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'UL') {
    const items = Array.from(node.children);
    let list = document.createElement('ul');
    list.className = node.className;

    for (const li of items) {
      const liClone = li.cloneNode(true);

      // Provo ad aggiungere il <ul> se non l'ho già fatto
      if (!page.contains(list)) {
        page.appendChild(list);
      }
      list.appendChild(liClone);

      if (isOverflowing(page)) {
        // Rimuovo questo <li> dalla lista corrente
        list.removeChild(liClone);

        // Se la lista è vuota adesso, non appendere una pagina vuota
        if (list.childNodes.length === 0) {
          // non fare nulla
        } else {
          // appendi la pagina piena
          container.appendChild(page);
        }

        // Nuova pagina
        page = createPage();

        // Nuova lista
        list = document.createElement('ul');
        list.className = node.className;
        list.appendChild(liClone);
      }
    }

    // Alla fine, se la lista contiene elementi, appendi la pagina
    if (list.childNodes.length > 0) {
      page.appendChild(list);
    }
    return true;
  }

  return false;
}

/**
 * Suddivide l'HTML generato dal Markdown in più pagine
 * in base all'altezza fissa effettiva e appende solo pagine non vuote.
 */
function paginateHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  const pages = [];
  let current = createPage();

  for (const orig of Array.from(temp.childNodes)) {
    const node = orig.cloneNode(true);
    // Se non ci sta, salva la pagina attuale e crea una nuova
    if (!tryAppendNode(node, current)) {
      if (current.childNodes.length) {
        pages.push(current);
      }
      current = createPage();
      // Riprovo a inserire qui
      tryAppendNode(node, current);
    }
  }
  // Append ultima pagina se non vuota
  if (current.childNodes.length) {
    pages.push(current);
  }

  // Infine, append tutte le pagine
  for (const pg of pages) {
    container.appendChild(pg);
  }
}

/**
 * Carica il prossimo file Markdown e lo converte in HTML.
 * Aggiunge il contenuto al DOM, suddiviso in più blocchi di pagina se necessario.
 */
async function loadNextPage() {
  if (loading || !hasMorePages) return false;
  loading = true;

  try {
    const res = await fetch(`notes/${currentPage}.md`);
    if (!res.ok) {
      hasMorePages = false;
      return false;
    }
    const md = await res.text();
    const html = marked.parse(md);
    paginateHTML(html);
    currentPage++;
    return true;
  } catch (e) {
    console.error(`Errore caricamento pagina ${currentPage}:`, e);
    hasMorePages = false;
    return false;
  } finally {
    loading = false;
  }
}

/**
 * Precarica pagine finché la pagina non è abbastanza lunga da poter scorrere.
 */
async function preloadUntilScrollable() {
  while (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
    const ok = await loadNextPage();
    if (!ok) break;
  }
}

window.addEventListener("DOMContentLoaded", () => preloadUntilScrollable());
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});
