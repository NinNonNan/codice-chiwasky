<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Diario Investigativo - Pagination Fine</title>
<style>
  body {
    font-family: Arial, sans-serif;
    margin: 20px;
    background: #f0f0f0;
  }
  #container {
    width: 500px;
    margin: auto;
  }
  .page {
    box-sizing: border-box;
    width: 100%;
    min-height: 400px;
    max-height: 400px;
    overflow: hidden;
    background: white;
    margin-bottom: 20px;
    padding: 20px;
    border: 1px solid #ccc;
    page-break-after: always;
  }
  .page[data-page]::before {
    content: attr(data-page);
    display: block;
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 1.1em;
    color: #444;
  }
</style>
</head>
<body>

<div id="container"></div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script>
  // --- Parametri ---
  const SAFE_HEIGHT = 400; // Altezza massima pagina in px (uguale a CSS .page min/max height)
  const container = document.getElementById('container');

  // --- Contenuto (puoi sostituirlo col tuo testo markdown) ---
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

  // --- Funzioni utili ---

  // Funzione per dividere un testo lungo in frasi più piccole
  // Usa regex per trovare punti interrogativi, esclamativi, punti e virgola, punti.
  function splitIntoSentences(text) {
    // Rimuove eventuali spazi iniziali/finali
    text = text.trim();
    // Divide in base a . ? ! ; seguiti da spazio o fine stringa, mantenendo il segno
    // Conserva i segni di punteggiatura alla fine di ogni frase
    const regex = /[^.!?;]+[.!?;]?/g;
    const matches = text.match(regex);
    if (!matches) return [text];
    // Filtro eventuali stringhe vuote
    return matches.map(s => s.trim()).filter(s => s.length > 0);
  }

  // Converte markdown in HTML con marked (caricato da CDN)
  const htmlContent = marked.parse(markdownContent);

  // Wrapper temporaneo per manipolare elementi HTML
  const tempWrapper = document.createElement('div');
  tempWrapper.innerHTML = htmlContent;

  // Estraggo i blocchi di primo livello (h1, h2, p, etc)
  const blocks = Array.from(tempWrapper.children);

  // Funzione per creare una pagina vuota nel container
  function createPage(pageNumber) {
    const page = document.createElement('div');
    page.className = 'page';
    page.setAttribute('data-page', `Pag. ${pageNumber}`);
    container.appendChild(page);
    return page;
  }

  // Funzione che controlla se un elemento entra in una pagina
  // Inserisce temporaneamente, misura, rimuove
  function canFit(element, container) {
    container.appendChild(element);
    const fits = container.scrollHeight <= SAFE_HEIGHT;
    container.removeChild(element);
    return fits;
  }

  // Funzione per aggiungere un testo (frasi) spezzato per pagine
  function addTextWithSplit(text, currentPage, pageNumber) {
    const sentences = splitIntoSentences(text);
    let tempParagraph = document.createElement('p');
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      // Aggiungo la frase al paragrafo temporaneo
      tempParagraph.textContent += (tempParagraph.textContent ? ' ' : '') + sentence;

      if (!canFit(tempParagraph, currentPage)) {
        // Se non entra, togliamo l'ultima frase
        tempParagraph.textContent = tempParagraph.textContent.slice(0, -sentence.length).trim();
        // Se c'è testo nel paragrafo, lo aggiungiamo alla pagina
        if (tempParagraph.textContent.length > 0) {
          currentPage.appendChild(tempParagraph);
        }
        // Creo nuova pagina
        currentPage = createPage(++pageNumber);
        // Creo un nuovo paragrafo e aggiungo la frase che non è entrata
        tempParagraph = document.createElement('p');
        tempParagraph.textContent = sentence;
      }

      // Se siamo all'ultima frase, aggiungiamo il paragrafo
      if (i === sentences.length - 1 && tempParagraph.textContent.length > 0) {
        currentPage.appendChild(tempParagraph);
      }
    }
    return { currentPage, pageNumber };
  }

  // Funzione principale che popola le pagine con i blocchi
  function populatePages() {
    let pageNumber = 1;
    let currentPage = createPage(pageNumber);

    for (let block of blocks) {
      // Gestione differenziata per tag:
      if (block.tagName === 'P') {
        // Per paragrafi lunghi, spezzare in frasi più piccole
        const { currentPage: newPage, pageNumber: newPageNumber } = addTextWithSplit(block.textContent, currentPage, pageNumber);
        currentPage = newPage;
        pageNumber = newPageNumber;

      } else {
        // Per titoli (h1, h2, h3...) e altri blocchi: li trattiamo come singoli elementi

        let clone = block.cloneNode(true);

        if (!canFit(clone, currentPage)) {
          // Nuova pagina se non entra
          currentPage = createPage(++pageNumber);
        }
        currentPage.appendChild(clone);
      }
    }
  }

  // Puliamo contenitore e avviamo
  container.innerHTML = '';
  populatePages();

</script>

</body>
</html>
