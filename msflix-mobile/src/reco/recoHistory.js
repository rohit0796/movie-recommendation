const KEY = "msflix_reco_history_v1";
const LIMIT = 25;

export function loadRecoHistory() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
        return [];
    }
}

export function addRecoHistory(movieIds = []) {
    const prev = loadRecoHistory();
    const merged = [...movieIds, ...prev];

    // unique keep order
    const seen = new Set();
    const unique = [];
    for (const id of merged) {
        const s = String(id);
        if (!seen.has(s)) {
            seen.add(s);
            unique.push(s);
        }
    }

    const trimmed = unique.slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function isRecentlyRecommended(movieId) {
    const hist = loadRecoHistory();
    return hist.includes(String(movieId));
}
