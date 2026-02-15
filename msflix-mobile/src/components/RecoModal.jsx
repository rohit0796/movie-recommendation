import React, { useMemo, useState, useRef } from "react";
import { MdBookmark, MdBookmarkBorder, MdClose, MdAutorenew } from "react-icons/md";
import { getBackdropUrl, getPosterUrl } from "../utils";

export function RecoModal({
    open,
    recommendations = [],
    userState,
    onClose,
    onOpenMovie,   // open PickerModal for selected
    onAddToWatchlist,
    onRemoveFromWatchlist,
    onReshuffle,   // new prop for reshuffling
}) {
    const [index, setIndex] = useState(0);
    const [swipeDirection, setSwipeDirection] = useState(null);
    const touchStartX = useRef(0);

    const safeIndex = useMemo(() => {
        if (!recommendations.length) return 0;
        return Math.max(0, Math.min(index, recommendations.length - 1));
    }, [index, recommendations.length]);

    const movie = recommendations[safeIndex];
    const total = recommendations.length;

    function goNext() {
        if (!total) return;
        setIndex((i) => (i + 1) % total);
    }

    function goPrev() {
        if (!total) return;
        setIndex((i) => (i - 1 + total) % total);
    }

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        const swipeThreshold = 50; // minimum swipe distance

        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swiped left - go to next
                setSwipeDirection('left');
                goNext();
            } else {
                // Swiped right - go to prev
                setSwipeDirection('right');
                goPrev();
            }
            // Reset direction after animation
            setTimeout(() => setSwipeDirection(null), 300);
        }
    };

    if (!open) return null;

    return (
        <div className="modalWrap" onClick={onClose}>
            <div
                className="modal recoModal"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <div className={`modalHero ${swipeDirection ? `swipe-${swipeDirection}` : ''}`}>
                    <img
                        className="backdrop"
                        src={getBackdropUrl(movie?.backdrop_path)}
                        alt="backdrop"
                        loading="lazy"
                    />
                    <div className="modalOverlay" />

                    <div className="modalTop">
                        <button className="close" onClick={onClose}><MdClose size={20} /></button>
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

                <div className="recoWatchlist">
                    <button
                        className={`watchlistBtn ${userState?.watchlist?.[movie?.id] ? 'active' : ''}`}
                        onClick={() => {
                            if (userState?.watchlist?.[movie?.id]) {
                                onRemoveFromWatchlist?.(movie?.id);
                            } else {
                                onAddToWatchlist?.(movie);
                            }
                        }}
                    >
                        {userState?.watchlist?.[movie?.id] ? <MdBookmark size={18} /> : <MdBookmarkBorder size={18} />}
                        {userState?.watchlist?.[movie?.id] ? 'In Watchlist' : 'Add to List'}
                    </button>
                </div>

                <div className="recoActions">
                    <button
                        onClick={goPrev}
                    >
                        ◀ Prev
                    </button>

                    <button
                        className="primary"
                        onClick={() => onOpenMovie?.(movie)}
                    >
                        Open 
                    </button>

                    <button
                        onClick={goNext}
                    >
                        Next ▶
                    </button>

                    <button
                        className="reshuffle"
                        onClick={() => onReshuffle?.()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <MdAutorenew size={18} /> Reshuffle
                    </button>
                </div>
            </div>
        </div>
    );
}
