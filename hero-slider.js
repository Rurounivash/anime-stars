const SEED_TRENDING = [
  {
    id: 43,
    title: "Ghost in the Shell",
    image: "https://cdn.myanimelist.net/images/anime/10/82594l.jpg",
    score: 8.0,
    genres: ["Action", "Sci-Fi"],
    synopsis: "In a future of cybernetic bodies, Major Motoko Kusanagi hunts a ghost in the machine.",
  },
  {
    id: 32615,
    title: "Youjo Senki",
    image: "https://cdn.myanimelist.net/images/anime/5/82890l.jpg",
    score: 7.9,
    genres: ["Action", "Fantasy"],
    synopsis: "A ruthless salaryman is reborn as a child soldier in an imperial mage corps.",
  },
  {
    id: 54744,
    title: "The Elusive Samurai",
    image: "https://cdn.myanimelist.net/images/anime/1863/143447l.jpg",
    score: 8.1,
    genres: ["Action", "Historical"],
    synopsis: "A young lord survives betrayal by becoming the most elusive warrior of his age.",
  },
  {
    id: 52991,
    title: "Frieren: Beyond Journey's End",
    image: "https://cdn.myanimelist.net/images/anime/1015/138195l.jpg",
    score: 9.3,
    genres: ["Adventure", "Drama"],
    synopsis: "An elf mage walks a quieter road after the hero's party already saved the world.",
  },
  {
    id: 5114,
    title: "Fullmetal Alchemist: Brotherhood",
    image: "https://cdn.myanimelist.net/images/anime/1208/94745l.jpg",
    score: 9.1,
    genres: ["Action", "Adventure"],
    synopsis: "Two brothers pay an impossible price for forbidden alchemy and spend a life putting it right.",
  },
];

const HERO_MS = 7000;
let heroIndex = 0;
let heroTimer = null;
let heroPaused = false;
let heroItems = SEED_TRENDING.slice();

function renderHero(items) {
  heroItems = (items && items.length ? items : SEED_TRENDING).slice(0, 5);
  const slides = document.getElementById("hero-slides");
  const thumbs = document.getElementById("hero-thumbs");
  if (!slides || !thumbs) return;
  slides.innerHTML = heroItems
    .map(
      (item, i) => `
      <div class="hero-slide${i === heroIndex ? " is-active" : ""}" data-i="${i}">
        <img src="${item.image}" alt="" />
      </div>`
    )
    .join("");
  thumbs.innerHTML = heroItems
    .map(
      (item, i) => `
      <button type="button" role="tab" data-i="${i}" class="${i === heroIndex ? "is-active" : ""}" aria-label="Show ${escapeHtml(item.title)}">
        <img src="${item.image}" alt="" />
      </button>`
    )
    .join("");
  thumbs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => showHero(Number(btn.dataset.i), true));
  });
  paintHeroCopy();
  restartHeroTimer();
}

function paintHeroCopy() {
  const item = heroItems[heroIndex];
  if (!item) return;
  document.getElementById("hero-title").textContent = item.title;
  document.getElementById("hero-meta").textContent = [
    `#${heroIndex + 1} trending`,
    item.score ? `${item.score} MAL` : null,
    (item.genres || []).slice(0, 3).join(" · "),
  ]
    .filter(Boolean)
    .join("  ·  ");
  document.getElementById("hero-blurb").textContent = item.synopsis || "";
  document.querySelectorAll(".hero-slide").forEach((el, i) => el.classList.toggle("is-active", i === heroIndex));
  document.querySelectorAll("#hero-thumbs button").forEach((el, i) => el.classList.toggle("is-active", i === heroIndex));
  restartProgressBar();
}

function restartProgressBar() {
  const bar = document.getElementById("hero-progress-bar");
  if (!bar) return;
  bar.style.animation = "none";
  void bar.offsetWidth;
  if (!heroPaused) bar.style.animation = "";
}

function showHero(i, user) {
  if (!heroItems.length) return;
  heroIndex = ((i % heroItems.length) + heroItems.length) % heroItems.length;
  paintHeroCopy();
  if (user && !heroPaused) restartHeroTimer();
}

function nextHero() {
  showHero(heroIndex + 1, false);
}

function restartHeroTimer() {
  clearInterval(heroTimer);
  if (heroPaused) return;
  heroTimer = setInterval(nextHero, HERO_MS);
  restartProgressBar();
}

function setHeroPaused(paused) {
  heroPaused = paused;
  const root = document.getElementById("hero-slider");
  const toggle = document.getElementById("hero-toggle");
  root && root.classList.toggle("is-paused", paused);
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Play slider" : "Pause slider");
    const label = toggle.querySelector(".toggle-label");
    if (label) label.textContent = paused ? "Play" : "Pause";
  }
  if (paused) {
    clearInterval(heroTimer);
    heroTimer = null;
  } else {
    restartHeroTimer();
  }
}

function initHeroControls() {
  const toggle = document.getElementById("hero-toggle");
  const open = document.getElementById("hero-open");
  if (toggle) toggle.addEventListener("click", () => setHeroPaused(!heroPaused));
  if (open) open.addEventListener("click", () => {
    const item = heroItems[heroIndex];
    if (item && item.id && typeof openById === "function") openById(item.id);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearInterval(heroTimer);
    else if (!heroPaused) restartHeroTimer();
  });
}

async function loadTrendingHero() {
  renderHero(SEED_TRENDING);
  initHeroControls();
  try {
    const data = await jikan("/top/anime?filter=airing&limit=10");
    const live = (data.data || [])
      .filter((a) => a.images && a.images.jpg && (a.images.jpg.large_image_url || a.images.jpg.image_url))
      .slice(0, 5)
      .map((a) => ({
        id: a.mal_id,
        title: a.title_english || a.title,
        image: a.images.jpg.large_image_url || a.images.jpg.image_url,
        score: a.score,
        genres: (a.genres || []).map((g) => g.name),
        synopsis: typeof cleanSynopsis === "function" ? cleanSynopsis(a.synopsis) : (a.synopsis || ""),
      }));
    if (live.length) renderHero(live);
  } catch (err) {
    /* keep seed — never blank the banner */
  }
}

loadTrendingHero();
