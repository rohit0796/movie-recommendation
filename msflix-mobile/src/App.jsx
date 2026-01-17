import React, { useEffect, useMemo, useState } from "react";
import { MdLocalFireDepartment, MdClear } from "react-icons/md";
import { fetchTrending, fetchDiscover, searchMovies } from "./tmdb";
import { MovieCard } from "./components/MovieCard";
import { BottomBar } from "./components/BottomBar";
import { PickerModal } from "./components/PickerModal";
import { loadState, saveState } from "./storage";
import iconPng from "./assets/icon.png";
import { recommendMoviesV2 } from "./reco/recommend";
import { RecoModal } from "./components/RecoModal";
import { bumpTasteVersion } from "./reco/tasteVersion";
import { clearCandidatePoolCache } from "./reco/candidatePoolCache";
import {
  loadCandidatePoolCache,
  saveCandidatePoolCache,
  isCandidatePoolExpired,
} from "./reco/candidatePoolCache";

import { buildCandidatePool } from "./reco/candidatePool";
import { addRecoHistory } from "./reco/recoHistory";
import { Onboarding } from "./components/Onboarding";



const MOODS = [
  { id: "pick", label: "Random", hint: "Best choice now" },
  { id: "chill", label: "Chill", hint: "Comfort & light" },
  { id: "hype", label: "Hype", hint: "Action & fast" },
  { id: "mind", label: "Mind", hint: "Thriller & sci-fi" },
  { id: "emotional", label: "Feels", hint: "Drama & heart" },
  { id: "horror", label: "Horror", hint: "Scary & dark" },

];

export default function App() {
  const [tab, setTab] = useState("home"); // home | search | liked
  const [mood, setMood] = useState("pick");
  const [recoOpen, setRecoOpen] = useState(false);
  const [recoList, setRecoList] = useState([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [cachedPool, setCachedPool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState(null);
  const [pickingLoading, setPickingLoading] = useState(false);

  const [userState, setUserState] = useState(() =>
    loadState() ?? { liked: {}, disliked: {}, watched: {}, watchlist: {}, onboardingDone: false }

  );
  useEffect(() => {
    async function preparePool() {
      setPoolLoading(true);

      try {
        const cache = loadCandidatePoolCache();

        // ✅ Use cache if fresh
        if (cache && !isCandidatePoolExpired(cache) && Array.isArray(cache.pool)) {
          setCachedPool(cache.pool);
          setPoolLoading(false);
          return;
        }

        // ✅ Rebuild pool (fresh)
        const pool = await buildCandidatePool({
          userState,
          mood: "pick",
          minRating: 6.0,
          minVotes: 200,
          maxPoolSize: 140,
        });

        saveCandidatePoolCache(pool);
        setCachedPool(pool);
      } catch (e) {
        console.error("Pool build failed:", e);
      } finally {
        setPoolLoading(false);
      }
    }

    preparePool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const likedList = useMemo(
    () => Object.values(userState.liked || {}),
    [userState.liked]
  );
  const totalTasteSignals =
    Object.keys(userState.liked || {}).length +
    Object.keys(userState.disliked || {}).length;

  const watchlistArr = useMemo(
    () => Object.values(userState.watchlist || {}),
    [userState.watchlist]
  );
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding if user is new and hasn't trained
    if (!userState.onboardingDone && totalTasteSignals < 5) {
      setShowOnboarding(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveState(userState);
  }, [userState]);

  async function loadHome() {
    setLoading(true);
    setPicked(null);

    try {
      let data;

      if (mood === "pick") {
        data = await fetchTrending();
      } else {
        data = await fetchDiscover(mood);
      }

      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "home") loadHome();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, mood]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setPicked(null);
    try {
      const data = await searchMovies(query.trim());
      setItems(data);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function likeMovie(movie) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      next.liked[movie.id] = movie;
      delete next.disliked[movie.id];
      return next;
    });
    bumpTasteVersion();
    clearCandidatePoolCache();
    setCachedPool([]);
  }

  function dislikeMovie(movie) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      next.disliked[movie.id] = movie;
      delete next.liked[movie.id];
      return next;
    });
    bumpTasteVersion();
    clearCandidatePoolCache();
    setCachedPool([]);
  }

  function markWatched(movie) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      next.watched[movie.id] = { id: movie.id, t: Date.now() };
      // Remove from watchlist when marked as watched
      if (next.watchlist) delete next.watchlist[movie.id];
      return next;
    });
  }

  function unmarkWatched(movieId) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      delete next.watched[movieId];
      return next;
    });
  }

  function removeLike(movieId) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      delete next.liked[movieId];
      return next;
    });
    bumpTasteVersion();
    clearCandidatePoolCache();
    setCachedPool([]);
    setRecoList([]); // Clear recommendations since profile changed
    setRecoOpen(false); // Close recommendations modal
  }
  async function pickForMe() {
    if (pickingLoading) return;

    setPickingLoading(true);

    try {
      let pool = cachedPool;

      // fallback if cache not ready
      if (!pool || pool.length === 0) {
        console.log("Pool is empty or not cached, rebuilding...");
        pool = await buildCandidatePool({
          userState,
          mood,
          minRating: 6.0,
          minVotes: 200,
          maxPoolSize: 140,
        });
        console.log("Built pool with", pool.length, "movies, saving...");
        // Save the newly built pool to cache
        saveCandidatePoolCache(pool);
      } else {
        console.log("Using cached pool with", pool.length, "movies");
      }

      const top5 = await recommendMoviesV2(userState, pool, { mood }, 5);

      if (!top5.length) {
        alert("No good recommendations found. Try another mood.");
        return;
      }

      // Filter out movies already in watchlist
      const filtered = top5.filter((m) => !isInWatchlist(m.id));

      if (!filtered.length) {
        alert("All recommendations are already in your watchlist!");
        return;
      }

      addRecoHistory(filtered.map((m) => m.id));

      setRecoList(filtered);
      setRecoOpen(true);
    } catch (e) {
      console.error(e);
      alert("Pick for me failed. Check console.");
    } finally {
      setPickingLoading(false);
    }
  }

  function addToWatchlist(movie) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      next.watchlist = next.watchlist || {};
      next.watchlist[movie.id] = movie;
      return next;
    });
  }

  function removeFromWatchlist(movieId) {
    setUserState((prev) => {
      const next = structuredClone(prev);
      if (next.watchlist) delete next.watchlist[movieId];
      return next;
    });
  }

  function isInWatchlist(movieId) {
    return !!userState.watchlist?.[movieId];
  }

  if (showOnboarding) {
    return (
      <div className="app">
        <Onboarding
          userState={userState}
          onLike={(movie) => likeMovie(movie)}
          onDislike={(movie) => dislikeMovie(movie)}
          onSkip={() => {
            setUserState((prev) => ({ ...prev, onboardingDone: true }));
            setShowOnboarding(false);
          }}
          onDone={() => {
            setUserState((prev) => ({ ...prev, onboardingDone: true }));
            setShowOnboarding(false);
          }}
        />
      </div>
    );
  }
  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src={iconPng} alt="MSFlix" className="logo" />
          <div>
            <div className="title">MSFlix</div>
            <div className="subtitle">Mobile movie picker</div>
          </div>
        </div>

        <button className="pill" onClick={pickForMe} disabled={pickingLoading}>
          {pickingLoading ? "Picking..." : "🎲 Pick for me"}
        </button>
      </header>

      {tab === "home" && (
        <div className="moods">
          {MOODS.map((m) => (
            <button
              key={m.id}
              className={`mood ${mood === m.id ? "active" : ""}`}
              onClick={() => setMood(m.id)}
            >
              <div className="moodLabel">{m.label}</div>
              <div className="moodHint">{m.hint}</div>
            </button>
          ))}
        </div>
      )}

      {tab === "search" && (
        <div className="searchBar">
          <div className="searchInput">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search movies… (e.g. Interstellar)"
            />
            {query && (
              <button className="clearBtn" onClick={() => setQuery('')}>
                <MdClear />
              </button>
            )}
          </div>
          <button className="searchBtn" onClick={handleSearch}>Search</button>
        </div>
      )}

      {tab === "liked" && (
        <div className="sectionTitle">
          Liked ({likedList.length})
        </div>
      )}
      {tab === "watchlist" && (
        <div className="sectionTitle">
          Watchlist ({watchlistArr.length})
        </div>
      )}


      <main className="content">
        {loading && <div className="status">Loading…</div>}

        {!loading && tab === "liked" && likedList.length === 0 && (
          <div className="status">No liked movies yet. Like some <MdLocalFireDepartment style={{ display: 'inline' }} /></div>
        )}

        {!loading && tab === "watchlist" && watchlistArr.length === 0 && (
          <div className="status">Your watchlist is empty. Add some movies!</div>
        )}

        {!loading && (
          <div className="grid">
            {(tab === "watchlist" ? watchlistArr : tab === "liked" ? likedList : items).map(
              (movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  isLiked={!!userState.liked?.[movie.id]}
                  isDisliked={!!userState.disliked?.[movie.id]}
                  isWatched={!!userState.watched?.[movie.id]}
                  onLike={() => likeMovie(movie)}
                  onDislike={() => dislikeMovie(movie)}
                  onWatched={() => markWatched(movie)}
                  onUnwatched={() => unmarkWatched(movie.id)}
                  onOpen={() => {
                    setPicked(movie);
                    setShowPicker(true);
                  }}
                  showRemove={tab === "liked"}
                  onRemoveLike={() => removeLike(movie.id)}
                />
              )
            )}
          </div>
        )}
      </main>

      <BottomBar tab={tab} setTab={setTab} />

      <PickerModal
        open={showPicker}
        movie={picked}
        isLiked={picked ? !!userState.liked?.[picked.id] : false}
        isDisliked={picked ? !!userState.disliked?.[picked.id] : false}
        isWatched={picked ? !!userState.watched?.[picked.id] : false}
        isInWatchlist={picked ? isInWatchlist(picked.id) : false}
        onClose={() => setShowPicker(false)}
        onLike={() => picked && likeMovie(picked)}
        onDislike={() => picked && dislikeMovie(picked)}
        onWatched={() => picked && markWatched(picked)}
        onUnwatched={() => picked && unmarkWatched(picked.id)}
        onAddToWatchlist={() => picked && addToWatchlist(picked)}
        onRemoveFromWatchlist={() => picked && removeFromWatchlist(picked.id)}
      />
      <RecoModal
        open={recoOpen}
        recommendations={recoList}
        userState={userState}
        onClose={() => setRecoOpen(false)}
        onOpenMovie={(movie) => {
          setPicked(movie);
          setShowPicker(true);
          setRecoOpen(false);
        }}
        onAddToWatchlist={(movie) => addToWatchlist(movie)}
        onRemoveFromWatchlist={(movieId) => removeFromWatchlist(movieId)}
        onReshuffle={pickForMe}
      />

    </div>
  );
}
