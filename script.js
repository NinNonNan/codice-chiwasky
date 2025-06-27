let currentPage = 1;
const container = document.getElementById("container");
let loading = false;

async function loadNextPage() {
  if (loading) return false;
  loading = true;

  try {
    const response = await fetch(`notes/${currentPage}.md`);
    if (!response.ok) {
      loading = false;
      return false;  // file non trovato, stop
    }

    const markdown = await response.text();
    const html = marked.parse(markdown);

    const page = document.createElement("div");
    page.classList.add("page");
    page.innerHTML = html;

    container.appendChild(page);
    currentPage++;
    loading = false;
    return true;
  } catch (e) {
    console.error("Errore durante il caricamento:", e);
    loading = false;
    return false;
  }
}

async function preloadUntilScrollable() {
  while (document.body.scrollHeight <= window.innerHeight) {
    const success = await loadNextPage();
    if (!success) break; // esci se non ci sono più pagine
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
