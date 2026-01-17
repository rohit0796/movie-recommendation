const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = import.meta.env.VITE_TMDB_BASE_URL;

function ensureKey() {
    if (!API_KEY) {
        throw new Error("Missing VITE_TMDB_API_KEY in .env");
    }
}

async function tmdb(path, params = {}) {
    ensureKey();

    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");

    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString());
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`TMDB error: ${res.status} ${txt}`);
    }

    const data = await res.json();
    return data?.results || [];
}

// Mood → discover filters (simple + effective)
function moodToParams(mood) {
    switch (mood) {
        case "chill":
            return { with_genres: "35,10749", sort_by: "popularity.desc" }; // Comedy, Romance
        case "hype":
            return { with_genres: "28,12", sort_by: "popularity.desc" }; // Action, Adventure
        case "mind":
            return { with_genres: "878,9648,53", sort_by: "vote_average.desc", "vote_count.gte": 500 }; // Sci-fi, Mystery, Thriller
        case "emotional":
            return { with_genres: "18", sort_by: "vote_average.desc", "vote_count.gte": 300 }; // Drama
        case "horror":
            return {
                with_genres: "27,53,9648", // Horror + Thriller + Mystery
                sort_by: "popularity.desc",
            };
        default:
            return { sort_by: "popularity.desc" };
    }
}

export async function fetchTrending() {
    return tmdb("/trending/movie/week");
}

export async function fetchDiscover(mood) {
    return tmdb("/discover/movie", {
        include_adult: "false",
        ...moodToParams(mood),
    });
}

export async function searchMovies(query) {
    return tmdb("/search/movie", { query, include_adult: "false" });
}


export async function fetchMovieKeywords(movieId) {

    const url = new URL(`${BASE_URL}/movie/${movieId}/keywords`);
    url.searchParams.set("api_key", API_KEY);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.keywords || []).map((k) => k.name.toLowerCase());
}

// ✅ Get TMDB recommendations for a movie (very powerful)
export async function fetchRecommendationsForMovie(movieId) {
    return tmdb(`/movie/${movieId}/recommendations`, {
        include_adult: "false",
        page: 1,
    });
}

// ✅ Get TMDB similar movies for a movie
export async function fetchSimilarForMovie(movieId) {
    return tmdb(`/movie/${movieId}/similar`, {
        include_adult: "false",
        page: 1,
    });
}

// ✅ Discover movies using dynamic genre list + quality constraints
export async function fetchDiscoverByGenres(genreIds = [], opts = {}) {
    const withGenres = genreIds.filter(Boolean).join(",");

    return tmdb("/discover/movie", {
        include_adult: "false",
        sort_by: opts.sort_by || "popularity.desc",
        with_genres: withGenres || undefined,

        // ✅ Quality gate
        "vote_average.gte": opts.minRating ?? 6.0,
        "vote_count.gte": opts.minVotes ?? 200,

        // optional language filter
        with_original_language: opts.lang || undefined,

        page: 1,
    });
}
