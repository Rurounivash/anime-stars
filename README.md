# Anime Stars

A dark, cinematic site for anime reviews and briefings.

Type a title. The site loads official catalog facts (episodes, studio, genres, synopsis, score) from MyAnimeList via the free [Jikan API](https://jikan.moe), then generates a **1–5 star** Anime Stars review in the browser.

## What you get

- Search by English, romaji, or a short nickname
- Live “this season” row
- Poster, episode count, status, year, rating, studio, genres
- Official synopsis
- Generated editorial: verdict, who it’s for, time commitment, caveats
- Manual star override
- Library saved in your browser (`localStorage`)

## Run it locally

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Publish on GitHub Pages

1. Repo: `https://github.com/Rurounivash/anime-stars`
2. Settings → Pages → Deploy from branch → `main` / `/ (root)`
3. Site URL will be `https://rurounivash.github.io/anime-stars/`

## Notes

- Jikan rate limit: about 3 requests/second, 60/minute. The app spaces calls.
- Editorial text is generated from catalog fields. It is not a live large-language-model call (no API key required).
- Not affiliated with any studio or MyAnimeList.
