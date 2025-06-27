const SAFE_HEIGHT = 600; // altezza massima della pagina, esempio

// Funzioni di splitting già definite (da te)
// splitSentences(text): spezza in frasi
// splitWords(text): spezza in parole
// splitChars(text): spezza in caratteri

function splitSentences(text) {
  // esempio semplice
  return text.match(/[^.!?]+[.!?]*\s*/g) || [text];
}

function splitWords(text) {
  return text.match(/\S+\s*/g) || [text];
}

function splitChars(text) {
  return Array.from(text);
}

function createPage() {
  const page = document.createElement('div');
  page.style.height = SAFE_HEIGHT + 'px';
  page.style.overflow = 'hidden';
  page.style.border = '1px solid #ccc';
  page.style.marginBottom = '10px';
  return page;
}

/**
 * Prova a inserire parzialmente un nodo complesso in una pagina,
 * spezzando i figli se serve per adattarsi a SAFE_HEIGHT.
 * Ritorna:
 *  - [true, restNode]: true se inserito almeno in parte, restNode è la parte non inserita (o null se tutto inserito)
 *  - [false, node]: se non è stato inserito nulla, ritorna nodo originale come "rest"
 */
function appendNodePartial(node, page) {
  page.appendChild(node);
  if (page.scrollHeight <= SAFE_HEIGHT) {
    return [true, null]; // tutto inserito
  }
  page.removeChild(node);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;

    // Provo a spezzare per frasi
    const sentences = splitSentences(text);
    if (sentences.length > 1) {
      let insertedText = "";
      let restText = "";
      for (const sentence of sentences) {
        insertedText += sentence;
        const testNode = document.createTextNode(insertedText);
        page.appendChild(testNode);
        if (page.scrollHeight > SAFE_HEIGHT) {
          page.removeChild(testNode);
          insertedText = insertedText.slice(0, insertedText.length - sentence.length);
          restText = text.slice(insertedText.length);
          break;
        }
        page.removeChild(testNode);
      }
      if (insertedText.length === 0) {
        return [false, node];
      }
      page.appendChild(document.createTextNode(insertedText));
      return [true, document.createTextNode(restText)];
    }

    // Provo a spezzare per parole
    const words = splitWords(text);
    if (words.length > 1) {
      let insertedText = "";
      let restText = "";
      for (const word of words) {
        insertedText += word;
        const testNode = document.createTextNode(insertedText);
        page.appendChild(testNode);
        if (page.scrollHeight > SAFE_HEIGHT) {
          page.removeChild(testNode);
          insertedText = insertedText.slice(0, insertedText.length - word.length);
          restText = text.slice(insertedText.length);
          break;
        }
        page.removeChild(testNode);
      }
      if (insertedText.length === 0) {
        return [false, node];
      }
      page.appendChild(document.createTextNode(insertedText));
      return [true, document.createTextNode(restText)];
    }

    // Provo a spezzare per caratteri
    const chars = splitChars(text);
    let insertedText = "";
    let restText = "";
    for (const ch of chars) {
      insertedText += ch;
      const testNode = document.createTextNode(insertedText);
      page.appendChild(testNode);
      if (page.scrollHeight > SAFE_HEIGHT) {
        page.removeChild(testNode);
        insertedText = insertedText.slice(0, insertedText.length - ch.length);
        restText = text.slice(insertedText.length);
        break;
      }
      page.removeChild(testNode);
    }
    if (insertedText.length === 0) {
      return [false, node];
    }
    page.appendChild(document.createTextNode(insertedText));
    return [true, document.createTextNode(restText)];
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const children = Array.from(node.childNodes);
    if (children.length === 0) {
      // Non spezzabile, troppo grande
      return [false, node];
    }

    // Clono il nodo senza figli
    const clone = node.cloneNode(false);
    page.appendChild(clone);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      let [inserted, rest] = appendNodePartial(child.cloneNode(true), clone);
      if (!inserted) {
        // Non ci sta neanche un figlio, rimuovo e ritorno tutto il nodo originale come resto
        page.removeChild(clone);
        return [false, node];
      }
      if (rest) {
        // Resto di un figlio spezzato => creo nodo resto con rest + figli successivi
        const restNode = node.cloneNode(false);
        restNode.appendChild(rest);
        for (let j = i + 1; j < children.length; j++) {
          restNode.appendChild(children[j].cloneNode(true));
        }
        page.removeChild(clone);
        return [true, restNode];
      }
    }
    // Tutto inserito senza resto
    return [true, null];
  }

  // Nodo non gestito
  return [false, node];
}

/**
 * Divide una lista <ul> o <ol> in più pagine spezzando anche i <li> se necessario.
 */
function paginateList(ul) {
  const pages = [];
  let page = createPage();
  const listTag = ul.tagName;
  let listClone = document.createElement(listTag);

  for (const li of ul.children) {
    let liClone = li.cloneNode(true);

    if (!page.contains(listClone)) page.appendChild(listClone);

    let [inserted, rest] = appendNodePartial(liClone, listClone);

    if (!inserted) {
      // Non ci sta neanche un li per intero in pagina nuova
      if (listClone.childNodes.length > 0) {
        pages.push(page);
        page = createPage();
        listClone = document.createElement(listTag);
      }
      [inserted, rest] = appendNodePartial(liClone, listClone);
      if (!inserted) {
        // Ancora no? Forzo inserimento comunque (es. li troppo grande)
        listClone.appendChild(liClone);
        pages.push(page);
        page = createPage();
        listClone = document.createElement(listTag);
        continue;
      }
    }

    if (rest) {
      // li spezzato, salvo pagina attuale
      pages.push(page);
      // nuova pagina con resto li + li successivi
      page = createPage();
      listClone = document.createElement(listTag);
      listClone.appendChild(rest);
    }
  }

  if (listClone.childNodes.length > 0 && !pages.includes(page)) {
    page.appendChild(listClone);
    pages.push(page);
  }

  return pages;
}

/**
 * Funzione principale di inserimento nodi, usa paginateList per <ul> e <ol>
 */
function appendNode(node, container) {
  if (node.tagName === 'UL' || node.tagName === 'OL') {
    // Spezza lista
    const pages = paginateList(node);
    pages.forEach(page => container.appendChild(page));
  } else {
    // Inserimento semplice con controllo altezza e spezzamento testi
    // Puoi aggiungere qui logica per altri tag se vuoi
    const [inserted, rest] = appendNodePartial(node, container);
    if (rest) {
      // Se ci sono resto (es. testo spezzato), crea altra pagina e inserisci resto
      const newPage = createPage();
      container.appendChild(newPage);
      appendNode(rest, newPage);
    }
  }
}
