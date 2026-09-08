const API = "https://api.jikan.moe/v4";
const STORE_KEY = "anime-stars-library-v1";

const $ = (id) => document.getElementById(id);
const form = $("search-form");
const queryInput = $("anime-query");
const statusLine = $("status-line");
const matchesEl = $("matches");
const briefingEl = $("briefing");
const seasonGrid = $("season-grid");
const libraryGrid = $("library-grid");
const libraryFilter = $("library-filter");

let lastRequest = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jikan(path) {
  const wait = 450 - (Date.now() - lastRequest);
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`Catalog request failed (${res.status})`);
  return res.json();
}

function starsFromMal(score) {
  if (!score) return 3;
  const mapped = score / 2;
  return Math.min(5, Math.max(1, Math.round(mapped * 2) / 2));
}

function starString(n) {
  const full = Math.floor(n);
  const half = n % 1 >= 0.5;
  return "\u2605".repeat(full) + (half ? "\u00bd" : "") + "\u2606".repeat(Math.max(0, 5 - Math.ceil(n)));
}

function labelForStars(n) {
  if (n >= 4.5) return "Essential";
  if (n >= 4) return "Highly recommended";
  if (n >= 3.5) return "Worth the watch";
  if (n >= 3) return "Solid, with caveats";
  if (n >= 2) return "For the dedicated only";
  return "Skip unless curious";
}

function listNames(arr) {
  return (arr || []).map((x) => x.name).filter(Boolean);
}

function cleanSynopsis(text) {
  if (!text) return "No official synopsis is on file yet.";
  return text.replace(/\[Written by MAL Rewrite\]/gi, "").replace(/\s+/g, " ").trim();
}

function generateEditorial(anime, stars) {
  const title = anime.title_english || anime.title;
  const genres = listNames(anime.genres);
  const themes = listNames(anime.themes);
  const studios = listNames(anime.studios);
  const eps = anime.episodes;
  const type = anime.type || "Anime";
  const status = (anime.status || "").toLowerCase();
  const year = anime.year || anime.aired?.prop?.from?.year;
  const source = anime.source;
  const genreLine = genres.slice(0, 3).join(", ") || "its own lane";
  const studioLine = studios[0] ? studios.slice(0, 2).join(" & ") : "an unlisted studio";
  const lengthNote = !eps
    ? "Episode count is still unlisted, so treat this as a moving target."
    : eps === 1
      ? "This is a single-feature commitment \u2014 one sitting, full payoff."
      : eps <= 13
        ? `${eps} episodes. A cour you can finish in a weekend if it hooks you.`
        : eps <= 26
          ? `${eps} episodes. A standard two-cour investment.`
          : `${eps} episodes. This is a long haul \u2014 pace yourself.`;

  const audience = [];
  if (genres.includes("Action") || genres.includes("Adventure")) audience.push("viewers who want momentum and set pieces");
  if (genres.includes("Drama") || genres.includes("Romance")) audience.push("people who stay for character work");
  if (genres.includes("Comedy") || genres.includes("Slice of Life")) audience.push("anyone hunting comfort or timing");
  if (genres.includes("Fantasy") || genres.includes("Sci-Fi") || genres.includes("Supernatural")) audience.push("world-building fans");
  if (genres.includes("Mystery") || genres.includes("Suspense") || genres.includes("Horror")) audience.push("viewers who like a slow uncoil");
  if (!audience.length) audience.push("curious fans sampling outside their usual stack");

  const watchouts = [];
  if (eps && eps > 40) watchouts.push("the runtime asks for loyalty before the thesis fully lands");
  if (status.includes("airing")) watchouts.push("it is still airing, so the briefing will shift as new episodes drop");
  if (!anime.score) watchouts.push("community score is thin, so the star rating is a first-pass estimate");
  if (anime.rating && /R\+|Rx/i.test(anime.rating)) watchouts.push("the content rating is mature \u2014 check before you hit play");
  if (!watchouts.length) watchouts.push("expectations should match the genre mix rather than the marketing art");

  return {
    tagline: `${labelForStars(stars)} \u00b7 ${type}${year ? ` \u00b7 ${year}` : ""}`,
    verdict: `${title} lands at ${stars} / 5 on the Anime Stars scale.`,
    editorial: `${title} is a ${type.toLowerCase()} from ${studioLine}${year ? `, first arriving in ${year}` : ""}, built around ${genreLine}${themes.length ? ` with ${themes.slice(0, 2).join(" and ")} in the mix` : ""}${source && source !== "Original" ? `, adapted from ${source}` : ""}. The catalog read suggests ${stars >= 4 ? "a title that consistently over-delivers on craft" : stars >= 3 ? "a watch with a clear audience and a few tradeoffs" : "a specialist piece that will split rooms"}.`,
    bestFor: `Best for ${audience.join("; ")}.`,
    commitment: lengthNote,
    watchouts: `Keep in mind: ${watchouts.join("; ")}.`,
    closing:
      stars >= 4.5
        ? "If your list has a hole in this genre, fill it here first."
        : stars >= 4
          ? "Queue it with confidence. The floor is high."
          : stars >= 3
            ? "A good pickup when you know what you want from the genre."
            : "Sample an episode before you commit the whole run.",
  };
}

function normalize(anime, overrideStars) {
  const stars = overrideStars ?? starsFromMal(anime.score);
  const editorial = generateEditorial(anime, stars);
  return {
    id: anime.mal_id,
    title: anime.title_english || anime.title,
    titleJp: anime.title_japanese || anime.title,
    image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "",
    score: anime.score,
    scoredBy: anime.scored_by,
    stars,
    episodes: anime.episodes,
    type: anime.type,
    status: anime.status,
    year: anime.year || anime.aired?.prop?.from?.year || null,
    rating: anime.rating,
    studios: listNames(anime.studios),
    genres: listNames(anime.genres),
    source: anime.source,
    url: anime.url,
    synopsis: cleanSynopsis(anime.synopsis),
    editorial,
    savedAt: Date.now(),
  };
}

function loadLibrary() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLibrary(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

function upsertLibrary(entry) {
  const list = loadLibrary().filter((x) => x.id !== entry.id);
  list.unshift(entry);
  saveLibrary(list);
  renderLibrary();
}

function setStatus(msg, isError = false) {
  statusLine.textContent = msg;
  statusLine.classList.toggle("error", isError);
}

function renderMatches(list) {
  matchesEl.classList.remove("hidden");
  briefingEl.classList.add("hidden");
  matchesEl.innerHTML = list
    .map(
      (a) => `
      <button class="match" data-id="${a.mal_id}">
        <img src="${a.images?.jpg?.image_url || ""}" alt="" />
        <div>
          <strong>${escapeHtml(a.title_english || a.title)}</strong>
          <span>${a.type || "Anime"} \u00b7 ${a.episodes ? a.episodes + " eps" : "eps TBA"} \u00b7 ${a.year || "year TBA"}</span>
        </div>
      </button>`
    )
    .join("");
  matchesEl.querySelectorAll(".match").forEach((btn) => {
    btn.addEventListener("click", () => openById(Number(btn.dataset.id)));
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function renderBriefing(entry) {
  matchesEl.classList.add("hidden");
  briefingEl.classList.remove("hidden");
  const chips = [
    entry.episodes ? `${entry.episodes} episodes` : "Episodes TBA",
    entry.type,
    entry.status,
    entry.year,
    entry.rating,
    entry.source,
    ...entry.studios,
    ...entry.genres.slice(0, 4),
  ]
    .filter(Boolean)
    .map((c, i) => `<span class="chip${i === 0 ? " accent" : ""}">${escapeHtml(c)}</span>`)
    .join("");

  briefingEl.innerHTML = `
    <article class="briefing-card">
      <div>
        <img class="cover" src="${entry.image}" alt="${escapeHtml(entry.title)} poster" />
      </div>
      <div>
        <h3 class="title">${escapeHtml(entry.title)}</h3>
        <p class="jp">${escapeHtml(entry.titleJp)}</p>
        <div class="stars" aria-label="${entry.stars} out of 5 stars">${starString(entry.stars)}</div>
        <p class="score-note">${entry.editorial.tagline}${entry.score ? ` \u00b7 MAL ${entry.score}/10` : ""}</p>
        <div class="meta">${chips}</div>
        <p class="verdict">${escapeHtml(entry.editorial.verdict)}</p>
        <div class="review">
          <h4>Synopsis</h4>
          <p>${escapeHtml(entry.synopsis)}</p>
          <h4>Anime Stars take</h4>
          <p>${escapeHtml(entry.editorial.editorial)}</p>
          <p>${escapeHtml(entry.editorial.bestFor)}</p>
          <p>${escapeHtml(entry.editorial.commitment)}</p>
          <p>${escapeHtml(entry.editorial.watchouts)}</p>
          <p>${escapeHtml(entry.editorial.closing)}</p>
        </div>
        <div class="actions">
          <div class="rate-row">
            Override stars:
            ${[1, 2, 3, 4, 5]
              .map((n) => `<button type="button" data-rate="${n}" aria-label="${n} stars">${n <= Math.round(entry.stars) ? "\u2605" : "\u2606"}</button>`)
              .join("")}
          </div>
          ${entry.url ? `<a class="ghost" href="${entry.url}" target="_blank" rel="noreferrer">MyAnimeList</a>` : ""}
          <button type="button" class="danger" id="remove-current">Remove from library</button>
        </div>
      </div>
    </article>
  `;
  briefingEl.querySelectorAll("[data-rate]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = normalize(
        {
          ...entry,
          mal_id: entry.id,
          title_english: entry.title,
          title_japanese: entry.titleJp,
          title: entry.title,
          images: { jpg: { large_image_url: entry.image, image_url: entry.image } },
          score: entry.score,
          scored_by: entry.scoredBy,
          episodes: entry.episodes,
          type: entry.type,
          status: entry.status,
          year: entry.year,
          rating: entry.rating,
          source: entry.source,
          url: entry.url,
          synopsis: entry.synopsis,
          studios: entry.studios.map((name) => ({ name })),
          genres: entry.genres.map((name) => ({ name })),
          themes: [],
        },
        Number(btn.dataset.rate)
      );
      upsertLibrary(next);
      renderBriefing(next);
      setStatus(`Saved ${next.title} at ${next.stars} stars.`);
    });
  });
  $("remove-current")?.addEventListener("click", () => {
    saveLibrary(loadLibrary().filter((x) => x.id !== entry.id));
    renderLibrary();
    briefingEl.classList.add("hidden");
    setStatus("Removed from library.");
  });
  briefingEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLibrary() {
  const q = (libraryFilter.value || "").toLowerCase();
  const list = loadLibrary().filter((x) => !q || x.title.toLowerCase().includes(q) || (x.titleJp || "").toLowerCase().includes(q));
  if (!list.length) {
    libraryGrid.innerHTML = `<p class="empty">${q ? "No titles match that filter." : "Your library is empty. Generate a briefing above."}</p>`;
    return;
  }
  libraryGrid.innerHTML = list
    .map(
      (x) => `
      <button class="lib-card" data-id="${x.id}">
        <img src="${x.image}" alt="" />
        <div class="pad">
          <strong>${escapeHtml(x.title)}</strong>
          <div class="stars">${starString(x.stars)}</div>
          <span class="chip">${x.episodes ? x.episodes + " eps" : "eps TBA"}</span>
        </div>
      </button>`
    )
    .join("");
  libraryGrid.querySelectorAll(".lib-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = loadLibrary().find((x) => x.id === Number(btn.dataset.id));
      if (item) renderBriefing(item);
    });
  });
}

async function searchTitle(q) {
  setStatus(`Searching catalog for \u201c${q}\u201d\u2026`);
  $("search-btn").disabled = true;
  try {
    const data = await jikan(`/anime?q=${encodeURIComponent(q)}&limit=8&sfw=true`);
    const results = data.data || [];
    if (!results.length) {
      setStatus("No matches. Try the English or romaji title.", true);
      matchesEl.classList.add("hidden");
      return;
    }
    if (results.length === 1) {
      const full = await jikan(`/anime/${results[0].mal_id}/full`);
      const entry = normalize(full.data);
      upsertLibrary(entry);
      renderBriefing(entry);
      setStatus(`Briefing ready for ${entry.title}.`);
    } else {
      renderMatches(results);
      setStatus(`${results.length} matches. Pick the exact title.`);
    }
  } catch (err) {
    setStatus(err.message || "Could not reach the catalog. Wait a moment and try again.", true);
  } finally {
    $("search-btn").disabled = false;
  }
}

async function openById(id) {
  setStatus("Building briefing\u2026");
  try {
    const full = await jikan(`/anime/${id}/full`);
    const entry = normalize(full.data);
    upsertLibrary(entry);
    renderBriefing(entry);
    setStatus(`Briefing ready for ${entry.title}.`);
  } catch (err) {
    setStatus(err.message || "Could not load that title.", true);
  }
}

async function loadSeason() {
  try {
    const data = await jikan("/seasons/now?sfw=true&limit=10");
    const shows = (data.data || []).filter((a) => a.images?.jpg?.image_url).slice(0, 10);
    seasonGrid.innerHTML = shows
      .map(
        (a) => `
        <figure class="poster-card" data-id="${a.mal_id}" title="${escapeHtml(a.title)}">
          <img src="${a.images.jpg.image_url}" alt="${escapeHtml(a.title_english || a.title)}" />
          <figcaption>${escapeHtml(a.title_english || a.title)}</figcaption>
        </figure>`
      )
      .join("");
    seasonGrid.querySelectorAll(".poster-card").forEach((el) => {
      el.addEventListener("click", () => openById(Number(el.dataset.id)));
    });
  } catch {
    seasonGrid.innerHTML = `<p class="empty">Seasonal titles could not be loaded right now.</p>`;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = queryInput.value.trim();
  if (q) searchTitle(q);
});

libraryFilter.addEventListener("input", renderLibrary);
$("clear-library").addEventListener("click", () => {
  if (confirm("Clear every saved briefing on this device?")) {
    saveLibrary([]);
    renderLibrary();
    briefingEl.classList.add("hidden");
    setStatus("Library cleared.");
  }
});

renderLibrary();
loadSeason();
