import {
    fetchTrending,
    fetchDiscover,
    fetchDiscoverByGenres,
    fetchRecommendationsForMovie,
    fetchSimilarForMovie,
} from "../tmdb";
import { buildTasteProfileV2 } from "./profile";

// -----------------------------
// Small utilities
// -----------------------------
function uniqueById(list = []) {
    const map = new Map();
    for (const item of list) {
        if (item?.id) map.set(item.id, item);
    }
    return Array.from(map.values());
}

function passesQualityGate(movie, minRating = 6.0, minVotes = 200) {
    const rating = movie?.vote_average || 0;
    const votes = movie?.vote_count || 0;
    if (rating < minRating) return false;
    if (votes < minVotes) return false;
    return true;
}

// Pick top N genres from user profile weights
function getTopGenres(profile, n = 3) {
    const entries = Object.entries(profile?.genreWeights || {})
        .map(([g, w]) => ({ genreId: Number(g), weight: w }))
        .sort((a, b) => b.weight - a.weight);

    return entries.slice(0, n).map((x) => x.genreId);
}

// Mood influences candidate pool, not only scoring
function getMoodGenreBoost(mood) {
    // These are NOT hardcoded preferences — just “contextual boosts”
    // (You can tweak them; they are universal mappings)
    switch (mood) {
        case "hype":
            return [28, 12, 53]; // Action, Adventure, Thriller
        case "mind":
            return [878, 9648, 53]; // Sci-Fi, Mystery, Thriller
        case "chill":
            return [35, 10751, 10749]; // Comedy, Family, Romance
        case "emotional":
            return [18, 10749]; // Drama, Romance
        case "horror":
            return [27, 53, 9648]; // Horror, Thriller, Mystery
        default:
            return [];
    }
}

// -----------------------------
// MAIN: Adaptive Candidate Pool Builder
// -----------------------------
export async function buildCandidatePool({
    userState,
    mood = "pick",
    minRating = 6.0,
    minVotes = 200,
    maxPoolSize = 120,
}) {
    // If user has no likes yet → fallback to mood discover + trending
    const likedMovies = Object.values(userState?.liked || {});
    const likedIds = likedMovies.map((m) => m.id);

    // ✅ 1) Build taste profile (genres + keywords in profileV2)
    const profile = await buildTasteProfileV2(userState);

    // ✅ 2) Get top genres from user taste
    const topGenres = getTopGenres(profile, 3);

    // ✅ 3) Mood boost genres (context)
    const moodGenres = getMoodGenreBoost(mood);

    // ✅ 4) Candidate sources
    const poolParts = [];

    // A) If user has liked movies → take TMDB recommendations + similar
    // (This is the best signal)
    if (likedIds.length > 0) {
        const lastFewLiked = likedIds.slice(-3); // keep it fast

        const recPromises = lastFewLiked.map(async (id) => {
            const [rec, sim] = await Promise.allSettled([
                fetchRecommendationsForMovie(id),
                fetchSimilarForMovie(id),
            ]);

            const recList = rec.status === "fulfilled" ? rec.value : [];
            const simList = sim.status === "fulfilled" ? sim.value : [];

            return [...recList, ...simList];
        });

        const recResults = await Promise.all(recPromises);
        poolParts.push(...recResults.flat());
    }

    // B) Discover from taste-based genres (dynamic)
    // Example: if you like Action + Thriller, pool becomes Action/Thriller
    if (topGenres.length > 0) {
        const tasteDiscover = await fetchDiscoverByGenres(topGenres, {
            minRating,
            minVotes,
            sort_by: "popularity.desc",
        });
        poolParts.push(...tasteDiscover);
    }

    // C) Discover from mood (existing mood discover endpoint)
    // This keeps it “right now” relevant
    try {
        const moodDiscover = await fetchDiscover(mood);
        poolParts.push(...moodDiscover);
    } catch {
        // ignore
    }

    // D) Extra: mood genre boosted discover (stronger pool alignment)
    if (moodGenres.length > 0) {
        const moodGenreDiscover = await fetchDiscoverByGenres(moodGenres.slice(0, 3), {
            minRating,
            minVotes,
            sort_by: "popularity.desc",
        });
        poolParts.push(...moodGenreDiscover);
    }

    // E) Trending fallback (always add some freshness)
    try {
        const trending = await fetchTrending();
        poolParts.push(...trending);
    } catch {
        // ignore
    }

    // ✅ 5) Merge + dedupe
    let pool = uniqueById(poolParts);

    // ✅ 6) Remove movies user already liked/disliked/watched
    const watched = userState?.watched || {};
    const disliked = userState?.disliked || {};
    const liked = userState?.liked || {};

    pool = pool
        .filter((m) => !watched[String(m.id)])
        .filter((m) => !disliked[String(m.id)])
        .filter((m) => !liked[String(m.id)]);

    // ✅ 7) Apply quality gate
    pool = pool.filter((m) => passesQualityGate(m, minRating, minVotes));

    // ✅ 8) Limit pool size (keep fast)
    if (pool.length > maxPoolSize) {
        pool = pool.slice(0, maxPoolSize);
    }

    return pool;
}
