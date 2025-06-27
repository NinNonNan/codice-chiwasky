let currentPage = 1;
let loading = false;

// Funzione per caricare un file markdown
async function loadMarkdownPage(pageNumber) {
  try {
    const response = await fetch(`./notes/${pageNumber}.md`);
    if (!response.ok) return false; // Fine se il file non esiste

    const text = await response.text();
    const html = markdownToHtml(text);
    appendPage(html);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// Conversione markdown minima
function markdownToHtml(markdown) {
  // Supporto semplice per titoli e paragrafi
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n$/gim, '<br>')
    .replace(/\n/g, '<br>');
}

// Crea un blocco .page
function appendPage(content) {
  const container = document.getElementById('notebook');
  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = content;

  // Smudge casuale
  if (Math.random() < 0.5) {
    const smudge = document.createElement('div');
    smudge.className = 'smudge';
    smudge.style.left = `${Math.random() * 60 + 10}%`;
    smudge.style.bottom = `${Math.random() * 40 + 5}%`;
    page.appendChild(smudge);
  }

  container.appendChild(page);
}

// Scroll infinito
async function handleScroll() {
  if (loading) return;

  const scrollY = window.scrollY + window.innerHeight;
  const threshold = document.body.offsetHeight - 300;

  if (scrollY >= threshold) {
    loading = true;
    const loaded = await loadMarkdownPage(currentPage++);
    loading = false;

    if (!loaded) {
      window.removeEventListener('scroll', handleScroll);
    }
  }
}

// Avvio
loadMarkdownPage(currentPage++);
window.addEventListener('scroll', handleScroll);
