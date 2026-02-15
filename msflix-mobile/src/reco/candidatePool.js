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

function shuffle(list = []) {
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function hasAnyGenre(movie, genreIds = []) {
    const movieGenres = movie?.genre_ids || [];
    if (!genreIds.length || !movieGenres.length) return false;
    const set = new Set(movieGenres);
    return genreIds.some((g) => set.has(g));
}

function passesQualityGate(movie, minRating = 6.5, minVotes = 200) {
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

function getStrictMoodGenres(mood) {
    switch (mood) {
        case "hype":
            return [28]; // Action
        case "mind":
            return [878]; // Sci-Fi
        case "chill":
            return [35]; // Comedy
        case "emotional":
            return [18]; // Drama
        case "horror":
            return [27]; // Horror
        default:
            return [];
    }
}

function pickLikedAnchors(likedIds = [], maxAnchors = 6) {
    if (likedIds.length <= maxAnchors) return likedIds;

    const picked = new Set();

    // keep strong recency signal
    for (const id of likedIds.slice(-3)) picked.add(id);

    // and spread picks across full history for diversity
    const remaining = Math.max(0, maxAnchors - picked.size);
    if (remaining > 0) {
        const step = (likedIds.length - 1) / Math.max(1, remaining);
        for (let i = 0; i < remaining; i++) {
            const idx = Math.floor(i * step);
            picked.add(likedIds[idx]);
        }
    }

    return Array.from(picked).slice(0, maxAnchors);
}

// -----------------------------
// MAIN: Adaptive Candidate Pool Builder
// -----------------------------
export async function buildCandidatePool({
    userState,
    mood = "pick",
    minRating = 6.5,
    minVotes = 200,
    maxPoolSize = 120,
}) {
    const isStrictMood = mood !== "pick";

    // If user has no likes yet → fallback to mood discover + trending
    const likedMovies = Object.values(userState?.liked || {});
    const likedIds = likedMovies.map((m) => m.id);

    // ✅ 1) Build taste profile (genres + keywords in profileV2)
    const profile = await buildTasteProfileV2(userState);

    // ✅ 2) Get top genres from user taste
    const topGenres = getTopGenres(profile, 3);

    // ✅ 3) Mood boost genres (context)
    const moodGenres = getMoodGenreBoost(mood);
    const strictMoodGenres = getStrictMoodGenres(mood);

    // ✅ 4) Candidate sources
    const poolParts = [];

    // A) If user has liked movies → take TMDB recommendations + similar
    // (This is the best signal)
    if (likedIds.length > 0) {
        const anchorLikedIds = pickLikedAnchors(likedIds, isStrictMood ? 2 : 4);

        const recPromises = anchorLikedIds.map(async (id) => {
            const reqs = [
                fetchRecommendationsForMovie(id, 1),
                fetchSimilarForMovie(id, 1),
            ];

            const settled = await Promise.allSettled(reqs);
            return settled
                .filter((x) => x.status === "fulfilled")
                .flatMap((x) => x.value || []);
        });

        const recResults = await Promise.all(recPromises);
        poolParts.push(...recResults.flat());
    }

    // B) Discover from taste-based genres (dynamic)
    // Example: if you like Action + Thriller, pool becomes Action/Thriller
    if (!isStrictMood && topGenres.length > 0) {
        const [tastePage1, tastePage2] = await Promise.allSettled([
            fetchDiscoverByGenres(topGenres, {
                minRating,
                minVotes,
                sort_by: "popularity.desc",
                page: 1,
            }),
            fetchDiscoverByGenres(topGenres, {
                minRating,
                minVotes,
                sort_by: "vote_average.desc",
                page: 2,
            }),
        ]);

        if (tastePage1.status === "fulfilled") poolParts.push(...tastePage1.value);
        if (tastePage2.status === "fulfilled") poolParts.push(...tastePage2.value);
    }

    // C) Discover from mood (existing mood discover endpoint)
    // This keeps it “right now” relevant
    try {
        const moodRequests = [fetchDiscover(mood, 1)];
        if (!isStrictMood) moodRequests.push(fetchDiscover(mood, 2));
        const [moodPage1, moodPage2] = await Promise.allSettled(moodRequests);
        if (moodPage1.status === "fulfilled") poolParts.push(...moodPage1.value);
        if (moodPage2 && moodPage2.status === "fulfilled") poolParts.push(...moodPage2.value);
    } catch {
        // ignore
    }

    // D) Extra: mood genre boosted discover (stronger pool alignment)
    if (moodGenres.length > 0) {
        const moodGenreRequests = [fetchDiscoverByGenres(moodGenres.slice(0, 3), {
            minRating,
            minVotes,
            sort_by: "popularity.desc",
            page: 1,
        })];
        if (!isStrictMood) {
            moodGenreRequests.push(fetchDiscoverByGenres(moodGenres.slice(0, 3), {
                minRating,
                minVotes,
                sort_by: "vote_average.desc",
                page: 2,
            }));
        }
        const [moodGenrePage1, moodGenrePage2] = await Promise.allSettled(moodGenreRequests);
        if (moodGenrePage1.status === "fulfilled") poolParts.push(...moodGenrePage1.value);
        if (moodGenrePage2 && moodGenrePage2.status === "fulfilled") poolParts.push(...moodGenrePage2.value);
    }

    // E) Trending fallback (always add some freshness)
    if (!isStrictMood) {
        try {
            const [trendPage1, trendPage2] = await Promise.allSettled([
                fetchTrending(1),
                fetchTrending(2),
            ]);
            if (trendPage1.status === "fulfilled") poolParts.push(...trendPage1.value);
            if (trendPage2.status === "fulfilled") poolParts.push(...trendPage2.value);
        } catch {
            // ignore
        }
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
    if (mood !== "pick" && strictMoodGenres.length > 0) {
        pool = pool.filter((m) => hasAnyGenre(m, strictMoodGenres));
    }

    pool = pool.filter((m) => passesQualityGate(m, minRating, minVotes));

    // ✅ 8) Limit pool size (keep fast)
    if (pool.length > maxPoolSize) {
        // Shuffle before trimming so pool doesn't always bias to identical head items.
        pool = shuffle(pool).slice(0, maxPoolSize);
    }

    return pool;
}
