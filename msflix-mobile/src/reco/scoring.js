import { MOOD_BOOSTS } from "./constants";
import { getMovieKeywords } from "./keywordCache";

export async function scoreMovieV2(profile, movie, ctx = {}) {
    let score = 0;

    const genres = movie.genre_ids || [];

    // ✅ Genre taste score
    for (const g of genres) {
        score += profile.genreWeights?.[g] || 0;
    }

    // ✅ Mood boost
    const mood = ctx.mood || "pick";
    const boosts = MOOD_BOOSTS[mood] || {};
    for (const g of genres) {
        score += boosts[g] || 0;
    }

    // ✅ Keyword taste score (keep it smaller than genres)
    const movieKeywords = await getMovieKeywords(movie.id);

    let keywordHitCount = 0;
    for (const kw of movieKeywords) {
        const w = profile.keywordWeights?.[kw] || 0;
        if (w !== 0) {
            score += w * 0.8; // ✅ reduced keyword dominance
            keywordHitCount++;
        }
    }

    // ✅ Quality boost (STRONGER now)
    const rating = movie.vote_average || 0;
    const voteCount = movie.vote_count || 0;

    score += rating * 3.5; // ✅ stronger than before
    score += Math.log10(voteCount + 1) * 2.0;

    // ✅ Popularity boost (small)
    score += Math.log10((movie.popularity || 1) + 1) * 1.0;

    // ✅ Explanation
    const explanation = buildExplanation(profile, movieKeywords, keywordHitCount, rating);

    return { score, explanation };
}

function buildExplanation(profile, movieKeywords, keywordHitCount, rating) {
    const matches = movieKeywords
        .map((kw) => ({ kw, w: profile.keywordWeights?.[kw] || 0 }))
        .filter((x) => x.w > 0)
        .sort((a, b) => b.w - a.w)
        .slice(0, 2)
        .map((x) => x.kw);

    if (matches.length > 0) {
        return `Matched your taste: ${matches.join(", ")}`;
    }

    if (keywordHitCount > 0) {
        return `Matched your taste keywords`;
    }

    if (rating >= 7.5) return `Highly rated pick ⭐`;
    return `Good pick + mood match`;
}
