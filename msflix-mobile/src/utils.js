const IMAGE_BASE = import.meta.env.VITE_TMDB_IMAGE_BASE;

export function getPosterUrl(path) {
    if (!path) return "https://via.placeholder.com/300x450?text=No+Poster";
    return `${IMAGE_BASE}/w342${path}`;
}

export function getBackdropUrl(path) {
    if (!path) return "https://via.placeholder.com/800x450?text=No+Backdrop";
    return `${IMAGE_BASE}/w780${path}`;
}
