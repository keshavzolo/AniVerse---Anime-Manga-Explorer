// ---------- Utility ----------
function createAnimeCardHTML(anime) {
  const title = anime.title || anime.name || "Unknown";
  const imageUrl = anime.images?.jpg?.image_url || "";
  const score = anime.score || "N/A";
  const episodes = anime.episodes || "TBA";
  const type = anime.type || "";
  const malId = anime.mal_id;

  return `
    <div class="anime-card">
      <a class="card-link" href="anime-details.html?animeId=${encodeURIComponent(malId)}">
        <img src="${imageUrl}" alt="${title}" />
        <h3>${title}</h3>
        <p>${type} | Episodes: ${episodes}</p>
        <p>Rating: ${score}</p>
      </a>
    </div>
  `;
}

// ---------- Search / Top Anime ----------
async function loadAnimeList(query = "") {
  const endpoint = query
    ? `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=23`
    : `https://api.jikan.moe/v4/top/anime?limit=24`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    const animeList = data.data || [];

    const container = document.getElementById("anime-list");
    if (!container) return;
    container.innerHTML = "";

    animeList.forEach((anime) => {
      container.insertAdjacentHTML("beforeend", createAnimeCardHTML(anime));
    });
  } catch (error) {
    console.error("Failed to fetch anime:", error);
  }
}

// Debounced search
let searchTimeout = null;
function setupSearch() {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;
  searchBox.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    searchTimeout = setTimeout(() => {
      loadAnimeList(query);
    }, 300);
  });
}

// ---------- Year Search Setup ----------
function setupYearSearch() {
  const input = document.getElementById("search-year");
  const btn = document.getElementById("year-search-btn");
  if (!input || !btn) return;

  const performSearch = () => {
    const yearStr = input.value.trim();
    if (!/^\d{4}$/.test(yearStr)) {
      alert("Please enter a valid 4-digit year."); 
      return;
    }
    const year = parseInt(yearStr, 10);
    if (year < 1964 || year > 2025) {
      alert("Year must be between 1964 and 2025.");
      return;
    }
    loadTopAnimeByYear(year);
  };

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    performSearch();
  });

  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
    }
  });
}

// ---------- Year-based Top Anime ----------
async function loadTopAnimeByYear(year) {
  if (!year) return;
  try {
    const response = await fetch(
      `https://api.jikan.moe/v4/anime?start_date=${year}-01-01&end_date=${year}-12-31&order_by=score&sort=desc&limit=15`
    );
    const data = await response.json();
    const animeList = data.data || [];
    const container = document.getElementById("anime-yearly");
    if (!container) return;
    container.innerHTML = "";

    animeList.forEach((anime) => {
      container.insertAdjacentHTML("beforeend", createAnimeCardHTML(anime));
    });
  } catch (err) {
    console.error(`Error loading top anime for ${year}:`, err);
    const container = document.getElementById("anime-yearly");
    if (container) container.innerHTML = `<p style="color:red;">Failed to load anime for ${year}</p>`;
  }
}

// ---------- Upcoming Anime ----------
async function loadUpcomingAnime() {
  const container = document.getElementById("anime-upcoming");
  if (!container) return;
  container.innerHTML = "<p>Loading upcoming anime...</p>";

  try {
    const response = await fetch("https://api.jikan.moe/v4/seasons/upcoming");
    const data = await response.json();
    const animeList = (data.data || []).slice(0, 24); // limit

    container.innerHTML = "";
    animeList.forEach((anime) => {
      container.insertAdjacentHTML("beforeend", createAnimeCardHTML(anime));
    });
  } catch (err) {
    container.innerHTML = "<p>Failed to load upcoming anime.</p>";
    console.error("Error fetching upcoming anime:", err);
  }
}

// ---------- Genre Anime ----------
async function loadGenreAnime(genreId) {
  const container = document.getElementById("anime-genre-results") || document.getElementById("anime-yearly");
  const titleEl = document.getElementById("genre-title");
  if (titleEl) titleEl.innerText = "Loading...";
  if (!container) return;

  container.innerHTML = "<p>Loading genre anime...</p>";

  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?genres=${genreId}&order_by=score&sort=desc&limit=25`
    );
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      if (titleEl) titleEl.innerText = "No anime found in this genre.";
      container.innerHTML = "";
      return;
    }

    const genreName = data.data[0].genres?.find((g) => g.mal_id === genreId)?.name || "Genre";
    if (titleEl) titleEl.innerText = `Top ${genreName} Anime`;

    container.innerHTML = "";
    data.data.forEach((anime) => {
      container.insertAdjacentHTML("beforeend", createAnimeCardHTML(anime));
    });
  } catch (err) {
    console.error(err);
    if (titleEl) titleEl.innerText = "Error loading genre.";
    container.innerHTML = "<p>Failed to load data.</p>";
  }
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// ---------- Anime Details ----------

async function fetchAnimeDetails(id) {
  const container = document.getElementById("anime-detail");
  if (!container) return;
  container.innerHTML = "<p>Loading...</p>";
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${encodeURIComponent(id)}/full`);
    let data;
    if (res.status === 404) {
      const fallback = await fetch(`https://api.jikan.moe/v4/anime/${encodeURIComponent(id)}`);
      data = (await fallback.json()).data;
    } else {
      data = (await res.json()).data;
    }

    const genresHTML = (data.genres || [])
      .map((g) => `<span class="genre-badge">${g.name}</span>`)
      .join(" ");
    const studios = data.studios?.map((s) => s.name).join(", ") || "N/A";
    const producers = data.producers?.map((p) => p.name).join(", ") || "N/A";
    const trailerEmbed = data.trailer?.embed_url
      ? `<div class="trailer">
           <h3>Trailer</h3>
           <iframe width="560" height="315" src="${data.trailer.embed_url}" title="Trailer" frameborder="0" allowfullscreen></iframe>
         </div>`
      : "";

    container.innerHTML = `
      <div class="detail-poster">
        <img src="${data.images.jpg.large_image_url}" alt="${data.title}" />
      </div>
      <div class="detail-info">
        <h1>${data.title} ${data.title_japanese ? `(${data.title_japanese})` : ""}</h1>
        <p class="score">Score: ${data.score || "N/A"} | Episodes: ${data.episodes || "TBA"} | Type: ${data.type || "N/A"}</p>
        <div class="genres">${genresHTML}</div>
        <p><strong>Studios:</strong> ${studios}</p>
        <p><strong>Producers:</strong> ${producers}</p>
        <p><strong>Synopsis:</strong> ${data.synopsis || "No synopsis available."}</p>
        ${trailerEmbed}
      </div>
    `;
  } catch (err) {
    console.error("Detail fetch error:", err);
    container.innerHTML = "<p>Failed to load anime details.</p>";
  }
}

// ---------- Anime Characters ----------
async function fetchAnimeCharacters(id) {
  const container = document.getElementById("anime-characters");
  if (!container) return;

  container.innerHTML = "<p style='color:white;'>Loading characters...</p>";

  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/characters`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      container.innerHTML = "<p style='color:white;'>No characters found.</p>";
      return;
    }

    // Show only first 1000 characters
    container.innerHTML = data.data.slice(0, 1000).map(char => {
      // Pick Japanese voice actor if available
      const japaneseVA = char.voice_actors?.find(va => va.language === "Japanese");

      return `
        <div class="character-card">
          <img src="${char.character.images.jpg.image_url}" alt="${char.character.name}" />
          <h4>${char.character.name}</h4>
          <p>${char.role}</p>

          <div class="voice-actor">
            ${
              japaneseVA
                ? `<img src="${japaneseVA.person.images.jpg.image_url}" alt="${japaneseVA.person.name}" />
                   <p><strong>${japaneseVA.person.name}</strong> <br>(Japanese)</p>`
                : `<p>No Voice artist found</p>`
            }
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading characters:", err);
    container.innerHTML = "<p style='color:red;'>Failed to load characters.</p>";
  }
}

// ---------- Initialization ----------
document.addEventListener("DOMContentLoaded", () => {     
  // Search setup
  setupSearch();
  setupYearSearch();

  // Load top anime list on landing
  if (document.getElementById("anime-list")) {
    loadAnimeList();
  }

  // Load year default
  if (document.getElementById("anime-yearly")) {
    loadTopAnimeByYear(2025);
  }

  // Upcoming page
  if (window.location.pathname.includes("upcoming") || document.getElementById("anime-upcoming")) {
    loadUpcomingAnime();
  }

  // Genre page
  if (window.location.pathname.includes("genre") && document.getElementById("anime-genre-results")) {
    // optionally: loadGenreAnime(1);
  }

  // Detail page
  if (window.location.pathname.includes("anime-details.html")) {
    const animeId = getQueryParam("animeId");
    if (animeId) {
      fetchAnimeDetails(animeId);
      fetchAnimeCharacters(animeId); // Fetch characters
    } else {
      const container = document.getElementById("anime-detail");
      if (container) container.innerHTML = "<p>Anime ID missing in URL.</p>";
    }
  }
});

// ---------- Utility for Manga ----------
function createMangaCardHTML(manga) {
  const title = manga.title || "Unknown";
  const imageUrl = manga.images?.jpg?.image_url || "";
  const score = manga.score || "N/A";
  const volumes = manga.volumes || "N/A";
  const malId = manga.mal_id;

  return `
    <div class="anime-card">
      <a class="card-link" href="manga.html?mangaId=${encodeURIComponent(malId)}">
        <img src="${imageUrl}" alt="${title}" />
        <h3>${title}</h3>
        <p>Volumes: ${volumes}</p>
        <p>Score: ${score}</p>
      </a>
    </div>
  `;
}

// ---------- Manga Details ----------
async function fetchMangaDetails(id) {
  const container = document.getElementById("manga-detail");
  if (!container) return;
  container.innerHTML = "<p>Loading manga details...</p>";

  try {
    const res = await fetch(`https://api.jikan.moe/v4/manga/${id}`);
    const data = (await res.json()).data;

    container.innerHTML = `
      <div class="detail-poster">
        <img src="${data.images.jpg.large_image_url}" alt="${data.title}" />
      </div>
      <div class="detail-info">
        <h1>${data.title}</h1>
        <p><strong>Type:</strong> ${data.type || "N/A"}</p>
        <p><strong>Chapters:</strong> ${data.chapters || "N/A"}</p>
        <p><strong>Volumes:</strong> ${data.volumes || "N/A"}</p>
        <p><strong>Score:</strong> ${data.score || "N/A"}</p>
        <p><strong>Status:</strong> ${data.status || "N/A"}</p>
        <p><strong>Published:</strong> ${data.published?.string || "N/A"}</p>
        <p><strong>Synopsis:</strong> ${data.synopsis || "No synopsis available."}</p>
      </div>
    `;
  } catch (err) {
    console.error("Error loading manga details:", err);
    container.innerHTML = "<p>Failed to load manga details.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("manga-list")) {
    loadTopManga();
  }

  if (window.location.pathname.includes("manga-details.html")) {
    const mangaId = new URLSearchParams(window.location.search).get("mangaId");
    if (mangaId) {
      fetchMangaDetails(mangaId);
    }
  }
});

// ---------- Manga Search & Top Manga ----------
async function loadMangaList(query = "") {
  const endpoint = query
    ? `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=25`
    : `https://api.jikan.moe/v4/top/manga?limit=24`;

  try {
    const response = await fetch(endpoint);
    const data = await response.json();
    const mangaList = data.data || [];

    const container = document.getElementById("manga-list");
    if (!container) return;
    container.innerHTML = "";

    if (mangaList.length === 0) {
      container.innerHTML = `<p style="color:white;">No manga found.</p>`;
      return;
    }

    mangaList.forEach((manga) => {
      const title = manga.title || "Unknown";
      const imageUrl = manga.images?.jpg?.image_url || "";
      const type = manga.type || "N/A";
      const chapters = manga.chapters || "TBA";
      const score = manga.score || "N/A";
      const malId = manga.mal_id;

      container.insertAdjacentHTML("beforeend", `
        <div class="anime-card">
          <a class="card-link" href="manga-details.html?mangaId=${encodeURIComponent(malId)}">
            <img src="${imageUrl}" alt="${title}" />
            <h3>${title}</h3>
            <p>${type} | Chapters: ${chapters}</p>
            <p>Rating: ${score}</p>
          </a>
        </div>
      `);
    });
  } catch (error) {
    console.error("Failed to fetch manga:", error);
  }
}

// ---------- Manga Search Box Setup ----------
function setupMangaSearch() {
  const searchBox = document.getElementById("searchBoxManga");
  if (!searchBox) return;

  let searchTimeout = null;
  searchBox.addEventListener("input", function () {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    searchTimeout = setTimeout(() => {
      loadMangaList(query);
    }, 300);
  });
}

// ---------- Init Top Manga Page ----------
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("manga-list")) {
    loadMangaList(); // Load top manga by default
    setupMangaSearch();
  }
});
