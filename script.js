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

const PAGE_HEIGHT = 1122;       // Altezza fissa di una pagina (es. 29.7cm a 96dpi)

/**
 * Crea un nuovo blocco pagina vuoto e lo restituisce.
 */
function createPage() {
  const page = document.createElement("div");
  page.classList.add("page");
  page.style.marginBottom = "4rem"; // Spazio tra le pagine
  return page;
}

/**
 * Funzione helper per spezzare un nodo di testo in frasi (o segmenti più piccoli).
 */
function splitTextIntoSegments(text) {
  // Divido in frasi o segmenti più piccoli per miglior controllo
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

/**
 * Funzione ricorsiva che prova ad aggiungere un nodo dentro una pagina.
 * Se il nodo supera l'altezza massima, prova a spezzarlo in nodi più piccoli.
 * 
 * @param {Node} node Nodo da inserire
 * @param {HTMLElement} page Pagina corrente
 * @returns {boolean} True se il nodo è stato inserito completamente, False se serve nuova pagina
 */
function tryAppendNode(node, page) {
  page.appendChild(node);

  if (page.scrollHeight <= PAGE_HEIGHT) {
    // Tutto ok, nodo inserito senza problemi
    return true;
  } else {
    // Nodo troppo grande, rimuovo
    page.removeChild(node);

    if (node.nodeType === Node.TEXT_NODE) {
      // Nodo testo troppo lungo: spezza in segmenti e prova uno per uno
      const segments = splitTextIntoSegments(node.textContent);
      for (const segment of segments) {
        const textNode = document.createTextNode(segment);
        if (!tryAppendNode(textNode, page)) {
          // Nodo non inserito => serve nuova pagina
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
        if (!tryAppendNode(child.cloneNode(true), clone)) {
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
      // Se neanche nella pagina nuova va, lo spezzamento è stato fatto ricorsivamente in tryAppendNode
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
      return false;
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);

    paginateHTML(html);

    currentPage++;
    return true;

  } catch (e) {
    console.error(`Errore durante il caricamento della pagina ${currentPage}:`, e);
    hasMorePages = false;
    return false;

  } finally {
    loading = false;
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
  if (!loading && window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});
