const KEY = "msflix_candidate_pool_cache_v1";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function loadCandidatePoolCache() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        console.log("Cache loaded:", KEY, data?.pool?.length, "movies");
        return data;
    } catch (e) {
        console.error("Failed to load cache:", e);
        return null;
    }
}

export function saveCandidatePoolCache(pool = []) {
    try {
        // Only save essential fields to reduce size
        const minimalPool = pool.map(m => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            vote_average: m.vote_average,
            release_date: m.release_date,
            overview: m.overview,
            genre_ids: m.genre_ids,
            vote_count: m.vote_count

        }));

        const payload = {
            v: 1,
            createdAt: Date.now(),
            pool: minimalPool,
        };

        const json = JSON.stringify(payload);
        const sizeKb = json.length / 1024;
        console.log("Saving cache:", sizeKb.toFixed(2), "KB");

        localStorage.setItem(KEY, json);
        console.log("Cache saved:", KEY, pool.length, "movies");
    } catch (e) {
        console.error("Failed to save cache:", e);
        console.error("Pool size:", pool.length, "movies");
    }
}

export function isCandidatePoolExpired(cache) {
    if (!cache?.createdAt) return true;
    return Date.now() - cache.createdAt > ONE_DAY_MS;
}

export function clearCandidatePoolCache() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
}
