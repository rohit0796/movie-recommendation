import { buildTasteProfileV2 } from "./profile";
import { scoreMovieV2 } from "./scoring";
import { getMovieKeywords } from "./keywordCache";

// ---------- helpers ----------
function overlapCount(arrA = [], arrB = []) {
  const setB = new Set(arrB);
  let c = 0;
  for (const x of arrA) if (setB.has(x)) c++;
  return c;
}

async function findBecauseYouLikedMovie(likedMovies, candidateMovie) {
  if (!likedMovies?.length) return null;

  const candGenres = candidateMovie.genre_ids || [];
  const candKeywords = await getMovieKeywords(candidateMovie.id);

  let best = null;
  let bestScore = -Infinity;

  for (const liked of likedMovies) {
    const likedGenres = liked.genre_ids || [];
    const likedKeywords = await getMovieKeywords(liked.id);

    const genreMatch = overlapCount(candGenres, likedGenres);
    const keywordMatch = overlapCount(candKeywords, likedKeywords);

    // ✅ similarity score
    const score = genreMatch * 3 + keywordMatch * 5;

    if (score > bestScore) {
      bestScore = score;
      best = liked;
    }
  }

  if (bestScore <= 0) return null;
  return best;
}

// ---------- QUALITY GATE ----------
function passesQualityGate(movie) {
  const rating = movie.vote_average || 0;
  const voteCount = movie.vote_count || 0;

  // ✅ Your requirement:
  if (rating < 6.0) return false;

  // ✅ Prevent trash / unknown movies
  // (tweak this if you want more variety)
  if (voteCount < 150) return false;

  return true;
}

// ---------- main recommender ----------
export async function recommendMoviesV2(
  userState,
  candidates = [],
  ctx = {},
  topN = 5
) {
  const watched = userState?.watched || {};
  const disliked = userState?.disliked || {};
  const liked = userState?.liked || {};

  // ✅ Filter out watched + disliked + already liked
  // ✅ Also apply quality gate here (IMPORTANT)
  const filtered = candidates
    .filter((m) => !watched[String(m.id)])
    .filter((m) => !disliked[String(m.id)])
    .filter((m) => !liked[String(m.id)])
    .filter((m) => passesQualityGate(m));

  const profile = await buildTasteProfileV2(userState);

  // Score + rank
  const ranked = [];
  for (const movie of filtered) {
    const { score, explanation } = await scoreMovieV2(profile, movie, ctx);
    ranked.push({ movie, score, explanation });
  }

  ranked.sort((a, b) => b.score - a.score);

  // Per-movie "Because you liked ..."
  const likedMovies = Object.values(liked || {});
  const topRanked = ranked.slice(0, topN);

  const result = [];
  for (const x of topRanked) {
    const becauseMovie = await findBecauseYouLikedMovie(likedMovies, x.movie);

    result.push({
      ...x.movie,
      __score: x.score,
      __why: x.explanation,
      __because: becauseMovie
        ? `Because you liked "${becauseMovie.title}"`
        : "Because it fits your taste",
    });
  }

  return result;
}
