import { fetchMovieKeywords } from "../tmdb";

const KEY = "msflix_keyword_cache_v1";
const KEYWORD_STOPLIST = new Set([
    "sequel",
    "based on novel or book",
    "based on novel",
    "based on book",
    "duringcreditsstinger",
    "aftercreditsstinger",
    "third part",
    "second part",
    "woman director",
    "independent film",
    "friendship",
    "love",
    "adaptation",
    "remake",
    "reboot",
    "los angeles",
    "new york city",
    "murder",
    "death",
    "police",
    "fight",
]);

function cleanKeywords(keywords = []) {
    return keywords
        .map((k) => String(k).trim().toLowerCase())
        .filter(Boolean)
        .filter((k) => k.length >= 4)                // remove tiny words
        .filter((k) => !KEYWORD_STOPLIST.has(k));    // remove junk keywords
}

function loadCache() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
        return {};
    }
}

function saveCache(cache) {
    try {
        localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {
        // ignore
    }
}

// ✅ Get cached keywords or fetch once and store
export async function getMovieKeywords(movieId) {
    const cache = loadCache();
    if (cache[movieId]) return cache[movieId];

    const keywords = await fetchMovieKeywords(movieId);

    cache[movieId] = keywords;
    saveCache(cache);

    return cleanKeywords(keywords);
}

// ✅ Useful when you want to prefetch
export async function prefetchMovieKeywords(movieIds = []) {
    for (const id of movieIds) {
        await getMovieKeywords(id);
    }
}
