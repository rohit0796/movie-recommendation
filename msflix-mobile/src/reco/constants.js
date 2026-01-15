// TMDB Genre IDs for Movies (core ones)
export const GENRES = {
    ACTION: 28,
    ADVENTURE: 12,
    ANIMATION: 16,
    COMEDY: 35,
    CRIME: 80,
    DOCUMENTARY: 99,
    DRAMA: 18,
    FAMILY: 10751,
    FANTASY: 14,
    HISTORY: 36,
    HORROR: 27,
    MUSIC: 10402,
    MYSTERY: 9648,
    ROMANCE: 10749,
    SCI_FI: 878,
    TV_MOVIE: 10770,
    THRILLER: 53,
    WAR: 10752,
    WESTERN: 37,
};

// Mood boosts (you can tweak anytime)
export const MOOD_BOOSTS = {
    pick: {},
    chill: {
        [GENRES.COMEDY]: 5,
        [GENRES.FAMILY]: 4,
        [GENRES.ROMANCE]: 2,
        [GENRES.DRAMA]: 1,
    },
    hype: {
        [GENRES.ACTION]: 6,
        [GENRES.ADVENTURE]: 5,
        [GENRES.THRILLER]: 2,
    },
    mind: {
        [GENRES.SCI_FI]: 6,
        [GENRES.MYSTERY]: 5,
        [GENRES.THRILLER]: 4,
        [GENRES.CRIME]: 2,
    },
    emotional: {
        [GENRES.DRAMA]: 6,
        [GENRES.ROMANCE]: 2,
        [GENRES.HISTORY]: 2,
    },
};
