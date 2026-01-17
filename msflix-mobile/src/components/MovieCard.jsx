import React from "react";
import { MdThumbUp, MdThumbDown, MdCheckCircle, MdCheckCircleOutline, MdClose } from "react-icons/md";
import { AiOutlineStar } from "react-icons/ai";
import { getPosterUrl } from "../utils";

export function MovieCard({
    movie,
    isLiked,
    isDisliked,
    isWatched,
    onLike,
    onDislike,
    onWatched,
    onUnwatched,
    onOpen,
    showRemove,
    onRemoveLike,
}) {
    return (
        <div className="card" onClick={onOpen}>
            <img
                className="poster"
                src={getPosterUrl(movie.poster_path)}
                alt={movie.title}
                loading="lazy"
            />

            <div className="cardBody">
                <div className="cardTitle">{movie.title}</div>
                <div className="cardMeta">
                    <AiOutlineStar style={{ display: 'inline', marginRight: '4px' }} /> {movie.vote_average?.toFixed?.(1) ?? "N/A"} •{" "}
                    {movie.release_date?.slice?.(0, 4) ?? "—"}
                    <div className="statusBadges" style={{ display: 'inline-flex', gap: '4px', marginLeft: '6px', flexWrap: 'wrap' }}>
                        {isLiked && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(43, 213, 118, 0.2)', color: '#2bd576', fontWeight: '700' }}>Liked</span>}
                        {isDisliked && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(255, 77, 109, 0.2)', color: '#ff4d6d', fontWeight: '700' }}>Skipped</span>}
                        {isWatched && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '6px', background: 'rgba(109, 94, 252, 0.2)', color: '#6d5efc', fontWeight: '700' }}>Watched</span>}
                    </div>
                </div>

                <div className="actions" onClick={(e) => e.stopPropagation()}>
                    <button className={`btn ${isLiked ? "on" : ""}`} onClick={onLike} disabled={isLiked}>
                        <MdThumbUp />
                    </button>
                    <button
                        className={`btn ${isDisliked ? "off" : ""}`}
                        onClick={onDislike}
                        disabled={isDisliked}
                    >
                        <MdThumbDown />
                    </button>
                    <button className="btn" onClick={isWatched ? onUnwatched : onWatched}>
                        {isWatched ? <MdCheckCircle /> : <MdCheckCircleOutline />}
                    </button>

                    {showRemove && (
                        <button className="btn ghost" onClick={onRemoveLike}>
                            <MdClose />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
