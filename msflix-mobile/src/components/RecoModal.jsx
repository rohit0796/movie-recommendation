import React, { useMemo, useState } from "react";
import { getBackdropUrl, getPosterUrl } from "../utils";

export function RecoModal({
    open,
    recommendations = [],
    userState,
    onClose,
    onOpenMovie,   // open PickerModal for selected
}) {
    const [index, setIndex] = useState(0);

    const safeIndex = useMemo(() => {
        if (!recommendations.length) return 0;
        return Math.max(0, Math.min(index, recommendations.length - 1));
    }, [index, recommendations.length]);

    const movie = recommendations[safeIndex];

    if (!open) return null;

    return (
        <div className="modalWrap" onClick={onClose}>
            <div className="modal recoModal" onClick={(e) => e.stopPropagation()}>
                <div className="modalHero">
                    <img
                        className="backdrop"
                        src={getBackdropUrl(movie?.backdrop_path)}
                        alt="backdrop"
                        loading="lazy"
                    />
                    <div className="modalOverlay" />

                    <div className="modalTop">
                        <button className="close" onClick={onClose}>✖</button>
                    </div>

                    <div className="modalInfo">
                        <img
                            className="modalPoster"
                            src={getPosterUrl(movie?.poster_path)}
                            alt={movie?.title}
                        />

                        <div className="modalText">
                            <div className="modalTitle">
                                {movie?.title}
                            </div>

                            <div className="modalMeta">
                                ⭐ {movie?.vote_average?.toFixed?.(1) ?? "N/A"} •{" "}
                                {movie?.release_date?.slice?.(0, 4) ?? "—"} •{" "}
                                Pick {safeIndex + 1}/{recommendations.length}
                            </div>

                            <div className="statusRow">
                                <span className="badge neutral">{movie?.__because || "Recommended"}</span>
                                <span className="badge good">{movie?.__why || "Matched your vibe"}</span>
                            </div>

                            <div className="modalOverview">
                                {movie?.overview || "No overview available."}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="recoActions">
                    <button
                        disabled={safeIndex === 0}
                        onClick={() => setIndex((i) => Math.max(0, i - 1))}
                    >
                        ◀ Prev
                    </button>

                    <button
                        className="primary"
                        onClick={() => onOpenMovie?.(movie)}
                    >
                        Open 🎬
                    </button>

                    <button
                        disabled={safeIndex === recommendations.length - 1}
                        onClick={() => setIndex((i) => Math.min(recommendations.length - 1, i + 1))}
                    >
                        Next ▶
                    </button>
                </div>
            </div>
        </div>
    );
}
