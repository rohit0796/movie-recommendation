import React from "react";
import { MdClose, MdThumbUp, MdThumbDown, MdCheckCircle, MdCheckCircleOutline, MdBookmark, MdBookmarkBorder } from "react-icons/md";
import { AiOutlineStar } from "react-icons/ai";
import { getBackdropUrl, getPosterUrl } from "../utils";

export function PickerModal({
  open,
  movie,
  isLiked,
  isDisliked,
  isWatched,
  onClose,
  onLike,
  onDislike,
  onWatched,
  onUnwatched,
  isInWatchlist,
  onAddToWatchlist,
  onRemoveFromWatchlist,

}) {
  if (!open || !movie) return null;

  return (
    <div className="modalWrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalHero">
          <img
            className="backdrop"
            src={getBackdropUrl(movie.backdrop_path)}
            alt="backdrop"
            loading="lazy"
          />

          <div className="modalOverlay" />

          <div className="modalTop">
            <button className="close" onClick={onClose}>
              <MdClose size={20} />
            </button>
          </div>

          <div className="modalInfo">
            <img
              className="modalPoster"
              src={getPosterUrl(movie.poster_path)}
              alt={movie.title}
            />

            <div className="modalText">
              <div className="modalTitle">{movie.title}</div>

              <div className="modalMeta">
                <AiOutlineStar style={{ display: 'inline', marginRight: '4px' }} /> {movie.vote_average?.toFixed?.(1) ?? "N/A"} •{" "}
                {movie.release_date?.slice?.(0, 4) ?? "—"}
              </div>

              {/* Status badges */}
              <div className="statusRow">
                {isLiked && <span className="badge good"><MdThumbUp style={{ display: 'inline', marginRight: '4px' }} /> Liked</span>}
                {isDisliked && <span className="badge bad"><MdThumbDown style={{ display: 'inline', marginRight: '4px' }} /> Disliked</span>}
                {isWatched && <span className="badge neutral"><MdCheckCircle style={{ display: 'inline', marginRight: '4px' }} /> Watched</span>}

                {!isLiked && !isDisliked && !isWatched && (
                  <span className="badge neutral">✨ Not decided</span>
                )}
              </div>

              <div className="modalOverview">
                {movie.overview || "No overview available."}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons with active highlight */}
        <div className="modalActions">
          <button className={isLiked ? "activeGood" : ""} onClick={onLike}>
            <MdThumbUp style={{ marginRight: '4px' }} /> Like
          </button>

          <button className={isDisliked ? "activeBad" : ""} onClick={onDislike}>
            <MdThumbDown style={{ marginRight: '4px' }} /> Skip
          </button>

          <button
            className={isWatched ? "activeNeutral" : ""}
            onClick={isWatched ? onUnwatched : onWatched}
          >
            {isWatched ? <MdCheckCircle style={{ marginRight: '4px' }} /> : <MdCheckCircleOutline style={{ marginRight: '4px' }} />}
            {isWatched ? 'Unwatch' : 'Watched'}
          </button>
        </div>

        {/* Watchlist button */}
        <div className="watchlistActions">
          <button
            className={`watchlistBtn ${isInWatchlist ? 'active' : ''}`}
            onClick={isInWatchlist ? onRemoveFromWatchlist : onAddToWatchlist}
          >
            {isInWatchlist ? <MdBookmark size={18} /> : <MdBookmarkBorder size={18} />}
            {isInWatchlist ? 'In Watchlist' : 'Add to List'}
          </button>
        </div>
      </div>
    </div>
  );
}
