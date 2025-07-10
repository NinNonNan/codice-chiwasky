const SAFE_HEIGHT = 400 * 148 / 105;
const container = document.getElementById('container');

// Markdown di esempio
const markdownContent = `
# Diario Investigativo

## Giorno 1
Ho trovato tracce nella neve. Forse non sono solo. Ho trovato tracce nella neve. Forse non sono solo. Ho trovato tracce nella neve. Forse non sono solo. Ho trovato tracce nella neve. Forse non sono solo. Ho trovato tracce nella neve. Forse non sono solo.

## Giorno 2
- Tracce recenti
- Porta socchiusa
- Odore acre nell’aria

## Giorno 3
Non riesco a dormire. Non riesco a dormire. Non riesco a dormire. Non riesco a dormire. Non riesco a dormire. Non riesco a dormire.
`;

const htmlContent = marked.parse(markdownContent);
const tempWrapper = document.createElement('div');
tempWrapper.innerHTML = htmlContent;
const blocks = Array.from(tempWrapper.children);

function createPage(pageNumber) {
  const page = document.createElement('div');
  page.className = 'page';
  page.setAttribute('data-page', `Pag. ${pageNumber}`);
  container.appendChild(page);
  return page;
}

function getPageHeight(page) {
  return page.getBoundingClientRect().height;
}

// Spezza testo in sottoblocchi, parola per parola
function splitTextBlock(tagName, original) {
  const words = original.textContent.split(/\s+/);
  const fragments = [];
  let current = document.createElement(tagName);
  current.textContent = '';
  fragments.push(current);

  for (const word of words) {
    const test = current.cloneNode(true);
    test.textContent += (test.textContent ? ' ' : '') + word;
    container.appendChild(test);

    if (getPageHeight(container) > SAFE_HEIGHT) {
      container.removeChild(test);
      current = document.createElement(tagName);
      current.textContent = word;
      fragments.push(current);
    } else {
      current.textContent = test.textContent;
      container.removeChild(test);
    }
  }

  return fragments;
}

function populatePages() {
  let pageCount = 1;
  let currentPage = createPage(pageCount);

  for (const block of blocks) {
    currentPage.appendChild(block);

    if (getPageHeight(currentPage) > SAFE_HEIGHT) {
      currentPage.removeChild(block);

      // Se il blocco è troppo grande, spezzalo
      const tag = block.tagName.toLowerCase();

      // Se è un blocco testuale (p, li, ecc.)
      if (['p', 'li', 'h1', 'h2', 'h3'].includes(tag)) {
        const parts = splitTextBlock(tag, block);
        for (const part of parts) {
          currentPage.appendChild(part);
          if (getPageHeight(currentPage) > SAFE_HEIGHT) {
            currentPage.removeChild(part);
            pageCount++;
            currentPage = createPage(pageCount);
            currentPage.appendChild(part);
          }
        }
      } else {
        // Per blocchi non gestibili (es. immagini, liste intere)
        pageCount++;
        currentPage = createPage(pageCount);
        currentPage.appendChild(block);
      }
    }
  }
}

requestAnimationFrame(populatePages);
