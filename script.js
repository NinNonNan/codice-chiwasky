const PAGE_HEIGHT = 1122;  // Altezza pagina in px (esempio A4 a 96dpi)
const container = document.getElementById("container");
let currentPage = 1;
let loading = false;
let hasMorePages = true;

function createPage() {
  const page = document.createElement("div");
  page.classList.add("page");
  page.style.minHeight = PAGE_HEIGHT + "px";
  page.style.marginBottom = "4rem";
  page.style.boxSizing = "border-box";
  page.style.position = "relative"; // per controllo dimensioni più preciso
  return page;
}

function splitTextToChunks(text, maxLength=100) {
  // Spezza il testo in chunk più piccoli per evitare tagli bruschi
  const chunks = [];
  let start = 0;
  while(start < text.length) {
    let end = start + maxLength;
    if (end > text.length) end = text.length;
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

/**
 * Inserisce progressivamente nodi o frammenti nella pagina finché non si supera l'altezza.
 * Ritorna il nodo o frammento non inserito (da mettere nella pagina successiva), oppure null se tutto inserito.
 */
function appendWithPageBreak(node, page) {
  page.appendChild(node);
  if (page.scrollHeight <= PAGE_HEIGHT) {
    // Tutto ok
    return null;
  }
  // Nodo troppo grande => togli e prova a spezzare
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    // Spezza testo in pezzi più piccoli
    const chunks = splitTextToChunks(node.textContent, 50); // 50 caratteri per chunk
    for(let i = 0; i < chunks.length; i++) {
      const chunkNode = document.createTextNode(chunks[i]);
      page.appendChild(chunkNode);
      if (page.scrollHeight > PAGE_HEIGHT) {
        page.removeChild(chunkNode);
        // Ritorno il resto del testo non inserito
        return document.createTextNode(chunks.slice(i).join(''));
      }
    }
    return null; // tutto inserito
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Provo a spezzare figli uno a uno
    const clone = node.cloneNode(false);
    page.appendChild(clone);
    for(const child of node.childNodes) {
      const leftover = appendWithPageBreak(child.cloneNode(true), clone);
      if(leftover) {
        page.removeChild(clone);
        return clone; // Torno il nodo incompleto da mettere nella pagina dopo
      }
    }
    return null; // tutto inserito
  }
  return node; // Non gestito, ritorno nodo intero
}

async function paginateContent(html) {
  let fragment = document.createElement("div");
  fragment.innerHTML = html;
  let page = createPage();
  container.appendChild(page);

  let nodes = Array.from(fragment.childNodes);
  let i = 0;
  while (i < nodes.length) {
    let node = nodes[i].cloneNode(true);
    let leftover = appendWithPageBreak(node, page);
    if (leftover) {
      // Non tutto inserito, creo pagina nuova per leftovers
      page = createPage();
      container.appendChild(page);
      // Sostituisco nodo corrente con leftover per inserirlo nella pagina nuova
      nodes[i] = leftover;
    } else {
      i++;
    }
  }
}

async function loadNextPage() {
  if (loading || !hasMorePages) return;
  loading = true;

  try {
    const res = await fetch(`notes/${currentPage}.md`);
    if (!res.ok) {
      hasMorePages = false;
      loading = false;
      return;
    }
    const md = await res.text();
    const html = marked.parse(md);
    await paginateContent(html);
    currentPage++;
  } catch (e) {
    console.error(e);
    hasMorePages = false;
  }
  loading = false;
}

// Carica pagine fino a rendere scrollabile la pagina
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
