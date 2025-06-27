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

const PAGE_HEIGHT = computePageHeight();
const MAX_RECURSION_DEPTH = 10; 

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
 * Funzione ricorsiva che prova ad aggiungere un nodo dentro una pagina.
 * Se supera l'altezza, prova a spezzarlo.
 */
function tryAppendNode(node, page, depth = 0) {
  if (depth > MAX_RECURSION_DEPTH) return false;
  page.appendChild(node);
  if (page.scrollHeight <= PAGE_HEIGHT) return true;
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent.length <= 20) return false;
    const chunks = splitTextToChunks(node.textContent, 50);
    for (let i = 0; i < chunks.length; i++) {
      const txt = document.createTextNode(chunks[i]);
      if (!tryAppendNode(txt, page, depth+1)) return false;
    }
    return true;
  } 
  else if (node.nodeType === Node.ELEMENT_NODE) {
    // Non UL: spezza figli
    if (node.tagName !== 'UL') {
      const children = Array.from(node.childNodes);
      const clone = node.cloneNode(false);
      page.appendChild(clone);
      for (const child of children) {
        if (!tryAppendNode(child.cloneNode(true), clone, depth+1)) {
          page.removeChild(clone);
          return false;
        }
      }
      return true;
    }
    // UL: prendo i <li> uno ad uno
    else {
      const items = Array.from(node.children);
      let wrapper = document.createElement('ul');
      wrapper.style.paddingLeft = getComputedStyle(node).paddingLeft || '1.5rem';
      page.appendChild(wrapper);

      for (const li of items) {
        const liClone = li.cloneNode(true);
        // se non entra, nuova pagina + nuovo wrapper
        if (!tryAppendNode(liClone, wrapper, depth+1)) {
          // sposto wrapper rimanente:
          page.removeChild(wrapper);
          page = createPage();
          container.appendChild(page);
          wrapper = document.createElement('ul');
          wrapper.style.paddingLeft = getComputedStyle(node).paddingLeft || '1.5rem';
          page.appendChild(wrapper);
          // riprovo il li su nuova pagina
          if (!tryAppendNode(liClone, wrapper, depth+1)) {
            console.warn("LI troppo grande anche da solo:", liClone);
            wrapper.appendChild(liClone);
          }
        }
      }
      return true;
    }
  }
  return false;
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
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'UL') {
      // gestito dentro tryAppendNode
      tryAppendNode(node.cloneNode(true), current);
      // se serve nuova pagina, tryAppendNode gestisce internamente
      if (pageOverflow(current)) {
        current = createPage();
        container.appendChild(current);
        tryAppendNode(node.cloneNode(true), current);
      }
    } else {
      if (!tryAppendNode(node.cloneNode(true), current)) {
        current = createPage();
        container.appendChild(current);
        tryAppendNode(node.cloneNode(true), current);
      }
    }
  }
}

/**  
 * Utility per verificare overflow  
 */
function pageOverflow(page) {
  return page.scrollHeight > PAGE_HEIGHT;
}

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
  }
  loading = false;
}

async function preloadUntilScrollable() {
  while (document.body.scrollHeight <= window.innerHeight && hasMorePages) {
    await loadNextPage();
  }
}

window.addEventListener("DOMContentLoaded", () => { preloadUntilScrollable(); });
window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});
