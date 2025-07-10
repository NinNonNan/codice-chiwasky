const SAFE_HEIGHT = 400 * 148 / 105;
const container = document.getElementById('container');

// Markdown di esempio ESTESO per test multipagina
const markdownContent = `
# Diario Investigativo

## Giorno 1
Questa mattina ho esplorato i dintorni del campo base. Il terreno è fangoso e coperto da foglie umide, segno che qualcuno o qualcosa è passato di recente. Ho trovato una serie di orme che sembrano appartenere a una creatura bipede, ma con un'andatura irregolare. Potrebbe trattarsi di un ferito, o forse di qualcosa di peggio. Ho deciso di seguirle, anche se il tempo non è dalla mia parte.

La nebbia si fa sempre più fitta, e ogni albero sembra osservarmi. Continuo a scrivere per mantenere la lucidità, ma sento un costante sussurro alle mie spalle. Mi volto spesso, ma non vedo nulla. Non so se sto perdendo la ragione o se qualcosa mi segue davvero.

## Giorno 2
La notte è stata lunga e senza riposo. Ho sentito dei suoni provenire dalla boscaglia. Alcuni sembravano passi, altri voci spezzate da un'eco lontana. Quando ho acceso la torcia, il fascio di luce ha colpito qualcosa tra gli alberi: due occhi, lucidi e fissi su di me, che sono spariti non appena mi sono mosso.

Stamattina ho trovato graffi profondi sul tronco di un faggio vicino alla mia tenda. Troppo profondi per un animale comune. Ho annotato ogni dettaglio nel caso dovessi andarmene in fretta e non tornare. Questo posto ha qualcosa di malato.

## Giorno 3
Il cielo è plumbeo e l'aria è satura di elettricità. I miei strumenti registrano picchi elettromagnetici ogni volta che mi avvicino alla radura al centro della foresta. Ho provato a entrare, ma ogni volta vengo sopraffatto da un senso di nausea. È come se qualcosa cercasse di respingermi. Ho piantato dei segnali per mappare l'area. Se dovessi sparire, forse qualcuno potrà seguire le mie tracce.

Ho anche scoperto un simbolo inciso su una pietra. Non appartiene a nessuna lingua conosciuta, ma mi dà i brividi. L'ho disegnato sul retro del taccuino. Continuerò a studiarlo.

## Giorno 4
Oggi ho trovato una baracca abbandonata, nascosta tra i rovi. All'interno, una vecchia lanterna, una coperta militare e alcune foto sbiadite. In una di queste, un uomo che assomiglia incredibilmente a me, ma più giovane. Sul retro: "Non tornare mai indietro".

Ho lasciato tutto com'era e ho preso solo la foto. L'ho nascosta tra le pagine. Se mi succede qualcosa, chiunque trovi questo diario potrà vedere che non sono pazzo. Forse.

## Giorno 5
La radura mi chiama. Ho sognato il simbolo. Era vivo, si muoveva, e mi parlava. Diceva che devo tornare. Che solo io posso fermare quello che è stato risvegliato. Forse è delirio. Forse ho respirato troppe spore. Ma oggi andrò nella radura, costi quel che costi.

Se questa è la mia ultima nota, allora che serva da avvertimento. Non seguite le orme che ho lasciato. Alcuni segreti devono rimanere sepolti.
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

      const tag = block.tagName.toLowerCase();
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
        pageCount++;
        currentPage = createPage(pageCount);
        currentPage.appendChild(block);
      }
    }
  }
}

requestAnimationFrame(populatePages);
