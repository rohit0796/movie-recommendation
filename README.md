# MSFlix Mobile

A React + Vite movie picker app powered by TMDB.

It supports:
- Mood-based recommendations
- Strict genre filtering by mood (non-random moods)
- Liked/Disliked/Watched tracking
- Watchlist management with Watchlist filters
- Recommendation history to reduce repeats
- Candidate pool caching by mood

## Tech Stack

- React 19
- Vite 7
- TMDB API
- LocalStorage for app state and caches

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root:

```env
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
VITE_TMDB_IMAGE_BASE=https://image.tmdb.org/t/p
```

3. Start dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint

## Recommendation Flow (High Level)

1. Build candidate pool from:
- Similar/recommended movies from liked titles
- Mood discover endpoints
- Genre discover endpoints
- Trending (mainly for random mode)

2. Filter pool:
- Remove liked/disliked/watched
- For non-random moods, keep only strict mood genre
- Apply quality gates (`vote_average`, `vote_count`)

3. Score and pick top recommendations.

4. Store recommendation history so recently shown titles are deprioritized/filtered.

## Caching

- Candidate pools are cached per mood in LocalStorage.
- Cache is invalidated by taste changes (like/dislike profile updates).
- Cache key is currently `msflix_candidate_pool_cache_v4`.

## Project Structure

- `src/App.jsx` - main app state and UI orchestration
- `src/components/` - UI components (cards, modals, bottom nav)
- `src/reco/` - recommendation logic (pooling, scoring, history, cache)
- `src/tmdb.js` - TMDB API wrappers
- `src/styles.css` - app styles

## Notes

- This project uses browser LocalStorage heavily for user state and caches.
- If behavior seems stale after logic changes, clear LocalStorage or bump cache keys.
