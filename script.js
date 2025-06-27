let currentPage = 1;
const container = document.getElementById("container");
let loading = false;

async function loadNextPage() {
  if (loading) return;
  loading = true;

  try {
    const response = await fetch(`notes/${currentPage}.md`);
    if (!response.ok) {
      loading = false;
      return; // Nessun altro file trovato
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);

    const page = document.createElement("div");
    page.classList.add("page");
    page.innerHTML = html;

    container.appendChild(page);
    currentPage++;
    loading = false;
  } catch (e) {
    console.error("Errore nel caricamento:", e);
    loading = false;
  }
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadNextPage();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  loadNextPage(); // carica la prima pagina
});
