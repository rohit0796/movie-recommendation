import React, { useEffect, useMemo, useState } from "react";
import { fetchTrending, fetchDiscoverByGenres } from "../tmdb";

const GENRE_OPTIONS = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 35, name: "Comedy" },
    { id: 18, name: "Drama" },
    { id: 27, name: "Horror" },
    { id: 53, name: "Thriller" },
    { id: 878, name: "Sci-Fi" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 16, name: "Animation" },
];

const TOTAL_TRAINING = 15;

function uniqueById(list = []) {
    const map = new Map();
    for (const item of list) if (item?.id) map.set(item.id, item);
    return Array.from(map.values());
}

function qualityGate(movie) {
    const rating = movie?.vote_average || 0;
    const votes = movie?.vote_count || 0;
    return rating >= 6 && votes >= 100;
}

export function Onboarding({ userState, onLike, onDislike, onSkip, onDone }) {
    const [step, setStep] = useState("genres"); // genres | training
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [pool, setPool] = useState([]);
    const [index, setIndex] = useState(0);
    const [actionsCount, setActionsCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const seenIds = useMemo(() => {
        const s = new Set();
        Object.keys(userState?.liked || {}).forEach((id) => s.add(String(id)));
        Object.keys(userState?.disliked || {}).forEach((id) => s.add(String(id)));
        Object.keys(userState?.watched || {}).forEach((id) => s.add(String(id)));
        return s;
    }, [userState]);

    const currentMovie = pool[index] || null;

    function toggleGenre(id) {
        setSelectedGenres((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            return [...prev, id];
        });
    }

    async function buildPool({ append = false } = {}) {
        setLoading(true);

        try {
            let movies = [];

            if (selectedGenres.length > 0) {
                movies = await fetchDiscoverByGenres(selectedGenres, {
                    minRating: 6.0,
                    minVotes: 100,
                    sort_by: "popularity.desc",
                });
            } else {
                movies = await fetchTrending();
            }

            const cleaned = uniqueById(movies)
                .filter(qualityGate)
                .filter((m) => !seenIds.has(String(m.id)));
            console.log(cleaned)
            setPool((prev) => {
                // ✅ if append → add new movies to existing pool
                const combined = append ? uniqueById([...prev, ...cleaned]) : cleaned;
                return combined;
            });

            // ✅ Only reset index when we are NOT appending (initial load)
            if (!append) {
                setIndex(0);
            }
        } catch (e) {
            console.error("Onboarding pool error:", e);

            // ✅ only clear pool on initial load failures
            if (!append) {
                setPool([]);
                setIndex(0);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (step === "training") buildPool({ append: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    // If remaining pool is low, rebuild in background
    useEffect(() => {
        if (step !== "training") return;
        const remaining = pool.length - index;
        if (remaining <= 5 && !loading) {
            buildPool({ append: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index]);

    function nextMovie() {
        setIndex((prev) => prev + 1);
    }

    function registerAction() {
        setActionsCount((c) => c + 1);
    }

    function handleLike() {
        if (!currentMovie) return;
        onLike(currentMovie);
        registerAction();
        nextMovie();
    }

    function handleDislike() {
        if (!currentMovie) return;
        onDislike(currentMovie);
        registerAction();
        nextMovie();
    }

    function handleSkipMovie() {
        if (!currentMovie) return;
        // ✅ FIX: skip must move next
        registerAction();
        nextMovie();
    }

    useEffect(() => {
        if (actionsCount >= TOTAL_TRAINING) {
            onDone?.();
        }
    }, [actionsCount, onDone]);

    return (
        <div className="onModalWrap">
            <div className="onModal">
                <div className="onModalTop">
                    <div>
                        <div className="onTitle">Train MSFlix 🎬</div>
                        <div className="onSub">
                            Do {TOTAL_TRAINING} quick actions to personalize your feed.
                        </div>
                    </div>

                    <button className="onSkip" onClick={onSkip}>
                        Skip
                    </button>
                </div>

                {step === "genres" && (
                    <div className="onCard">
                        <div className="onSectionTitle">
                            Pick your favorite genres <span style={{ opacity: 0.7 }}>(optional)</span>
                        </div>

                        <div className="genreGrid">
                            {GENRE_OPTIONS.map((g) => (
                                <button
                                    key={g.id}
                                    className={`genreChip ${selectedGenres.includes(g.id) ? "active" : ""}`}
                                    onClick={() => toggleGenre(g.id)}
                                >
                                    {g.name}
                                </button>
                            ))}
                        </div>

                        <div className="onActionsRow">
                            <button className="onPrimary" onClick={() => setStep("training")}>
                                Start Training →
                            </button>
                        </div>

                        <div className="onHint">Tip: select 2–4 genres for best results.</div>
                    </div>
                )}

                {step === "training" && (
                    <div className="onCard">
                        <div className="onProgress">
                            Training: <b>{actionsCount}</b> / {TOTAL_TRAINING}
                        </div>

                        {loading && <div className="onStatus">Loading movies…</div>}

                        {!loading && !currentMovie && (
                            <div className="onStatus">
                                No movies found. Try different genres or skip setup.
                            </div>
                        )}

                        {!loading && currentMovie && (
                            <>
                                <div className="trainPosterWrap">
                                    <img
                                        className="trainPoster"
                                        src={
                                            currentMovie.poster_path
                                                ? `https://image.tmdb.org/t/p/w342${currentMovie.poster_path}`
                                                : "https://via.placeholder.com/300x450?text=No+Poster"
                                        }
                                        alt={currentMovie.title}
                                    />
                                </div>

                                <div className="trainTitle">{currentMovie.title}</div>

                                <div className="trainMeta">
                                    ⭐ {currentMovie.vote_average?.toFixed?.(1) ?? "N/A"} •{" "}
                                    {currentMovie.release_date?.slice?.(0, 4) ?? "—"}
                                </div>

                                <div className="trainButtons">
                                    <button className="trainBtn bad" onClick={handleDislike}>
                                        👎 Dislike
                                    </button>

                                    <button className="trainBtn neutral" onClick={handleSkipMovie}>
                                        ➡️ Skip
                                    </button>

                                    <button className="trainBtn good" onClick={handleLike}>
                                        👍 Like
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
