import { isRecentlyRecommended } from "./recoHistory";

// Weighted random selection from ranked list
export function weightedTopPick(rankedList = []) {
    // rankedList = [{movie, score, ...}, ...] sorted high->low

    // Prefer top part only
    const top = rankedList.slice(0, 25);

    // Build weights: higher score = higher chance
    // Add penalty if recently recommended
    const weights = top.map((x, idx) => {
        let w = Math.max(1, 100 - idx * 4); // top gets biggest weight
        if (isRecentlyRecommended(x.movie.id)) w *= 0.15; // heavy penalty
        return w;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;

    for (let i = 0; i < top.length; i++) {
        r -= weights[i];
        if (r <= 0) return top[i];
    }

    return top[0] || null;
}
