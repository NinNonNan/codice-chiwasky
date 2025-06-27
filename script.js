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

const PAGE_HEIGHT = computePageHeight();   // Altezza totale del foglio (CSS driven)
const RESERVED_PERCENT = 0.02;             // 2% di spazio riservato in fondo
const MAX_RECURSION_DEPTH = 10;            // Profondità massima per evitare loop infiniti

/**
 * Calcola lo spazio riservato in px, in base all'altezza effettiva di ciascun foglio.
 */
function computeReservedSpace(page) {
  return Math.round(page.offsetHeight * RESERVED_PERCENT);
}

/**
 * Crea un nuovo blocco pagina vuoto e lo restituisce.
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
  const reserved = computeReservedSpace(page);
  return page.scrollHeight > (page.offsetHeight - reserved);
}

/**
 * Funzione ricorsiva che prova ad aggiungere un nodo dentro una pagina.
 * Se il nodo supera l'altezza massima effettiva, prova a spezzarlo in nodi più piccoli.
 * Limita la profondità per evitare ricorsione infinita.
 */
function tryAppendNode(node, page, depth = 0) {
  if (depth > MAX_RECURSION_DEPTH) return false;
  page.appendChild(node);
  if (!isOverflowing(page)) return true;
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent.length <= 20) return false;
    const chunks = splitTextToChunks(node.textContent, 50);
    for (let i = 0; i < chunks.length; i++) {
      const txtNode = document.createTextNode(chunks[i]);
      if (!tryAppendNode(txtNode, page, depth + 1)) {
        return false; // il resto verrà gestito sulla pagina successiva
      }
    }
    return true;
  } 
  else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'UL') {
    // Elementi non-UL: spezza i figli
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

  // Se è UL, gestiamo i <li> uno a uno, evitando duplicazioni
  if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'UL') {
    const listItems = Array.from(node.children);
    let currentList = document.createElement('ul');
    currentList.className = node.className;
    page.appendChild(currentList);

    for (const li of listItems) {
      const liClone = li.cloneNode(true);
      currentList.appendChild(liClone);

      // Se trabocca, rimuovo liClone e sposto su nuova pagina
      if (isOverflowing(page)) {
        currentList.removeChild(liClone);

        // Nuova pagina
        page = createPage();
        container.appendChild(page);

        // Nuova lista
        currentList = document.createElement('ul');
        currentList.className = node.className;
        page.appendChild(currentList);

        // Inserisco liClone nella nuova lista
        currentList.appendChild(liClone);
      }
    }
    return true;
  }

  return false; // altri nodi non gestiti
}

/**
 * Suddivide l'HTML generato dal Markdown in più pagine
 * in base all'altezza fissa effettiva.
 */
function paginateHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  let current = createPage();
  container.appendChild(current);

  for (const origNode of Array.from(temp.childNodes)) {
    const node = origNode.cloneNode(true);
    if (!tryAppendNode(node, current)) {
      // Nodo non inserito => nuova pagina e reinserimento
      current = createPage();
      container.appendChild(current);
      tryAppendNode(node, current);
    }
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
      loading = false;
      return false;
    }

    const md = await res.text();
    const html = marked.parse(md);
    paginateHTML(html);

    currentPage++;
    loading = false;
    return true;

  } catch (e) {
    console.error(`Errore caricamento pagina ${currentPage}:`, e);
    hasMorePages = false;
    loading = false;
    return false;
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

window.addEventListener("DOMContentLoaded", () => {
  preloadUntilScrollable();
});

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});
