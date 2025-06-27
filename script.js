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
 * Carica il prossimo file Markdown e lo converte in HTML.
 * Aggiunge il contenuto al DOM come un nuovo blocco di pagina.
 */
async function loadNextPage() {
  // Evita caricamenti multipli o inutili se non ci sono più pagine
  if (loading || !hasMorePages) return false;
  loading = true;

  try {
    // Tenta di caricare il file Markdown corrente
    const response = await fetch(`notes/${currentPage}.md`);
    
    // Se il file non esiste (es. 404), interrompe il caricamento futuro
    if (!response.ok) {
      hasMorePages = false;
      loading = false;
      return false;
    }

    // Converte il testo Markdown in HTML
    const markdown = await response.text();
    const html = marked.parse(markdown);

    // Crea e configura il nuovo blocco di pagina
    const page = document.createElement("div");
    page.classList.add("page");
    page.style.marginBottom = "4rem"; // Spazio tra le pagine
    page.innerHTML = html;

    // Aggiunge il blocco al contenitore
    container.appendChild(page);

    // Passa alla pagina successiva
    currentPage++;
    loading = false;
    return true;

  } catch (e) {
    // In caso di errore imprevisto (es. rete), log e blocco caricamenti futuri
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
  while (
    document.body.scrollHeight <= window.innerHeight &&
    hasMorePages
  ) {
    const success = await loadNextPage();
    if (!success) break;
  }
}

// Quando la pagina è caricata, inizia a caricare le prime pagine
window.addEventListener("DOMContentLoaded", () => {
  preloadUntilScrollable();
});

// Quando l'utente si avvicina al fondo, carica una nuova pagina
window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 300
  ) {
    loadNextPage();
  }
});
