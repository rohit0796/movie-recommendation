const KEY = "msflix_candidate_pool_cache_v3";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function loadAllCaches() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { v: 3, entries: {} };
        const data = JSON.parse(raw);

        // Backward compatibility with single-entry cache shape
        if (Array.isArray(data?.pool)) {
            const mood = data?.mood || "pick";
            return {
                v: 3,
                entries: {
                    [mood]: {
                        createdAt: data?.createdAt || 0,
                        tasteVersion: Number(data?.tasteVersion || 0),
                        pool: data.pool,
                    },
                },
            };
        }

        if (data && typeof data === "object" && data.entries && typeof data.entries === "object") {
            return data;
        }

        return { v: 3, entries: {} };
    } catch (e) {
        console.error("Failed to load cache:", e);
        return { v: 3, entries: {} };
    }
}

export function loadCandidatePoolCache(meta = {}) {
    const all = loadAllCaches();
    const mood = meta?.mood || "pick";
    const entry = all?.entries?.[mood] || null;
    console.log("Cache loaded:", KEY, mood, entry?.pool?.length || 0, "movies");
    return entry;
}

export function saveCandidatePoolCache(pool = [], meta = {}) {
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

        const mood = meta.mood || "pick";
        const all = loadAllCaches();
        all.entries = all.entries || {};
        all.entries[mood] = {
            createdAt: Date.now(),
            tasteVersion: Number(meta.tasteVersion || 0),
            pool: minimalPool,
        };

        const payload = {
            v: 3,
            entries: all.entries,
        };

        const json = JSON.stringify(payload);
        const sizeKb = json.length / 1024;
        console.log("Saving cache:", sizeKb.toFixed(2), "KB");

        localStorage.setItem(KEY, json);
        console.log("Cache saved:", KEY, mood, pool.length, "movies");
    } catch (e) {
        console.error("Failed to save cache:", e);
        console.error("Pool size:", pool.length, "movies");
    }
}

export function isCandidatePoolExpired(cache, meta = {}) {
    if (!cache?.createdAt) return true;
    if (Date.now() - cache.createdAt > ONE_DAY_MS) return true;
    if (meta.tasteVersion !== undefined && Number(cache.tasteVersion || 0) !== Number(meta.tasteVersion)) return true;
    return false;
}

export function clearCandidatePoolCache() {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // ignore
    }
}
