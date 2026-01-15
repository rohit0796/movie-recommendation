import { getMovieKeywords } from "./keywordCache";

export async function buildTasteProfileV2(userState) {
    const profile = {
        genreWeights: {},    // genreId -> weight
        keywordWeights: {},  // keyword -> weight
        likedMovieIds: [],   // used for "because you liked"
    };

    const likedMovies = Object.values(userState?.liked || {});
    const dislikedMovies = Object.values(userState?.disliked || {});

    profile.likedMovieIds = likedMovies.map((m) => m.id);

    // ✅ GENRE weights from likes/dislikes
    for (const m of likedMovies) {
        for (const g of m.genre_ids || []) {
            profile.genreWeights[g] = (profile.genreWeights[g] || 0) + 3;
        }
    }

    for (const m of dislikedMovies) {
        for (const g of m.genre_ids || []) {
            profile.genreWeights[g] = (profile.genreWeights[g] || 0) - 4;
        }
    }

    // ✅ KEYWORD weights (strong personal signals)
    // Likes add +2, dislikes add -2 (you can tweak)
    for (const m of likedMovies) {
        const kws = await getMovieKeywords(m.id);
        for (const kw of kws) {
            profile.keywordWeights[kw] = (profile.keywordWeights[kw] || 0) + 2;
        }
    }

    for (const m of dislikedMovies) {
        const kws = await getMovieKeywords(m.id);
        for (const kw of kws) {
            profile.keywordWeights[kw] = (profile.keywordWeights[kw] || 0) - 2;
        }
    }

    return profile;
}
