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

let currentPage = 1;             // Numero della prossima pagina Markdown da caricare
const container = document.getElementById("container"); // Contenitore principale delle pagine
let loading = false;            // Flag per evitare richieste multiple simultanee
let hasMorePages = true;        // Indica se ci sono ancora pagine disponibili da caricare

/**
 * Misura l'altezza effettiva di un elemento .page appena creato,
 * per farla coincidere con il CSS (height: calc(...)).
 */
function computePageHeight() {
  const temp = document.createElement('div');
  temp.className = 'page';
  temp.style.visibility = 'hidden';
  document.body.appendChild(temp);
  const h = temp.clientHeight;  // altezza effettiva in px
  document.body.removeChild(temp);
  return h;
}

const PAGE_HEIGHT = computePageHeight(); // Altezza fissa della pagina A6-like
const MAX_RECURSION_DEPTH = 10;          // Profondità massima di ricorsione per evitare loop infiniti

/**
 * Crea un nuovo blocco pagina vuoto e lo restituisce.
 */
function createPage() {
  const page = document.createElement("div");
  page.classList.add("page");
  // non serve più marginBottom qui, è gestito dal CSS
  return page;
}

/**
 * Funzione helper per spezzare un testo in chunk di lunghezza massima fissa.
 * Evita di spezzare in troppi segmenti troppo piccoli per prevenire ricorsione infinita.
 * 
 * @param {string} text Testo da spezzare
 * @param {number} maxLength Lunghezza massima per chunk
 * @returns {string[]} Array di chunk di testo
 */
function splitTextToChunks(text, maxLength = 100) {
  if (text.length <= maxLength) {
    // Troppo piccolo per spezzare, ritorno il testo intero
    return [text];
  }
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    if (end > text.length) end = text.length;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Funzione ricorsiva che prova ad aggiungere un nodo dentro una pagina.
 * Se il nodo supera l'altezza massima, prova a spezzarlo in nodi più piccoli.
 * Limita la profondità per evitare ricorsione infinita.
 * 
 * @param {Node} node Nodo da inserire
 * @param {HTMLElement} page Pagina corrente
 * @param {number} depth Profondità corrente di ricorsione
 * @returns {boolean} True se il nodo è stato inserito completamente, False se serve nuova pagina
 */
function tryAppendNode(node, page, depth = 0) {
  if (depth > MAX_RECURSION_DEPTH) {
    console.warn("Profondità ricorsione massima raggiunta, nodo non inserito:", node);
    return false;
  }

  page.appendChild(node);

  if (page.scrollHeight <= PAGE_HEIGHT) {
    // Tutto ok, nodo inserito senza problemi
    return true;
  } else {
    // Nodo troppo grande, rimuovo
    page.removeChild(node);

    if (node.nodeType === Node.TEXT_NODE) {
      // Controlla se testo è troppo piccolo per spezzare
      if (node.textContent.length <= 20) {
        // Troppo piccolo per spezzare, non entra: serve nuova pagina
        return false;
      }

      // Spezza in chunk più piccoli
      const chunks = splitTextToChunks(node.textContent, 50);
      for (let i = 0; i < chunks.length; i++) {
        const chunkNode = document.createTextNode(chunks[i]);
        if (!tryAppendNode(chunkNode, page, depth + 1)) {
          // Se non entra, metto il resto del testo in una nuova pagina
          return false;
        }
      }
      return true;

    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Nodo elemento con figli: prova a spezzare figli
      const children = Array.from(node.childNodes);
      const clone = node.cloneNode(false); // clone senza figli
      page.appendChild(clone);

      for (const child of children) {
        if (!tryAppendNode(child.cloneNode(true), clone, depth + 1)) {
          // Figlio non inserito => serve nuova pagina
          page.removeChild(clone);
          return false;
        }
      }
      // Tutti i figli inseriti bene
      return true;

    } else {
      // Nodo di altro tipo non gestito, non inseribile
      return false;
    }
  }
}

/**
 * Suddivide l'HTML generato dal Markdown in più pagine
 * in base all'altezza fissa predefinita.
 */
function paginateHTML(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  let current = createPage();
  container.appendChild(current);

  for (const node of Array.from(temp.childNodes)) {
    if (!tryAppendNode(node.cloneNode(true), current)) {
      // Nodo non inserito => creo nuova pagina e riprovo
      current = createPage();
      container.appendChild(current);
      const success = tryAppendNode(node.cloneNode(true), current);
      if (!success) {
        console.warn("Non è stato possibile inserire il nodo, anche spezzandolo", node);
      }
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
    const response = await fetch(`notes/${currentPage}.md`);

    if (!response.ok) {
      hasMorePages = false;
      loading = false;
      return false;
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);

    paginateHTML(html);

    currentPage++;
    loading = false;
    return true;

  } catch (e) {
    console.error(`Errore durante il caricamento della pagina ${currentPage}:`, e);
    hasMorePages = false;
    loading = false;
    return false;
  }
}

/**
 * Precarica pagine finché la pagina non è abbastanza lunga da poter scorrere.
 * Utile al primo caricamento, se il contenuto iniziale è troppo corto.
 */
async function preloadUntilScrollable() {
  while (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
    const success = await loadNextPage();
    if (!success) break;
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
