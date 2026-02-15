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
import { bumpTasteVersion, getTasteVersion } from "./reco/tasteVersion";
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

const GENRE_NAMES = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  27: "Horror",
  28: "Action",
  35: "Comedy",
  36: "History",
  37: "Western",
  53: "Thriller",
  80: "Crime",
  878: "Sci-Fi",
  9648: "Mystery",
  99: "Documentary",
  10402: "Music",
  10749: "Romance",
  10751: "Family",
  10752: "War",
  10770: "TV Movie",
};

export default function App() {
  const [tab, setTab] = useState("home"); // home | search | liked
  const [mood, setMood] = useState("pick");
  const [recoOpen, setRecoOpen] = useState(false);
  const [recoList, setRecoList] = useState([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [cachedPools, setCachedPools] = useState({});
  const [poolLoading, setPoolLoading] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [picked, setPicked] = useState(null);
  const [pickingLoading, setPickingLoading] = useState(false);
  const [watchlistGenreFilter, setWatchlistGenreFilter] = useState("all");

  const [userState, setUserState] = useState(() =>
    loadState() ?? { liked: {}, disliked: {}, watched: {}, watchlist: {}, onboardingDone: false }

  );
  useEffect(() => {
    async function preparePool() {
      setPoolLoading(true);

      try {
        const cacheMeta = { mood: "pick", tasteVersion: getTasteVersion() };
        const cache = loadCandidatePoolCache(cacheMeta);

        // ✅ Use cache if fresh
        if (cache && !isCandidatePoolExpired(cache, cacheMeta) && Array.isArray(cache.pool)) {
          setCachedPools((prev) => ({ ...prev, pick: cache.pool }));
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

        saveCandidatePoolCache(pool, cacheMeta);
        setCachedPools((prev) => ({ ...prev, pick: pool }));
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

  const watchlistGenreOptions = useMemo(() => {
    const ids = new Set();
    for (const movie of watchlistArr) {
      for (const id of movie.genre_ids || []) ids.add(Number(id));
    }

    return Array.from(ids)
      .sort((a, b) => (GENRE_NAMES[a] || String(a)).localeCompare(GENRE_NAMES[b] || String(b)))
      .map((id) => ({ id: String(id), label: GENRE_NAMES[id] || `Genre ${id}` }));
  }, [watchlistArr]);

  const filteredWatchlist = useMemo(() => {
    if (watchlistGenreFilter === "all") return watchlistArr;
    return watchlistArr.filter((movie) =>
      (movie.genre_ids || []).some((id) => String(id) === watchlistGenreFilter)
    );
  }, [watchlistArr, watchlistGenreFilter]);

  useEffect(() => {
    if (watchlistGenreFilter === "all") return;
    const exists = watchlistGenreOptions.some((g) => g.id === watchlistGenreFilter);
    if (!exists) setWatchlistGenreFilter("all");
  }, [watchlistGenreFilter, watchlistGenreOptions]);
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
    setCachedPools({});
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
    setCachedPools({});
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
    setCachedPools({});
    setRecoList([]); // Clear recommendations since profile changed
    setRecoOpen(false); // Close recommendations modal
  }
  async function pickForMe() {
    if (pickingLoading) return;

    setPickingLoading(true);

    try {
      const cacheMeta = { mood, tasteVersion: getTasteVersion() };
      const liveCache = loadCandidatePoolCache(cacheMeta);
      let pool = [];

      if (
        liveCache &&
        !isCandidatePoolExpired(liveCache, cacheMeta) &&
        Array.isArray(liveCache.pool) &&
        liveCache.pool.length > 0
      ) {
        pool = liveCache.pool;
        setCachedPools((prev) => ({ ...prev, [mood]: liveCache.pool }));
        console.log("Using cached pool with", pool.length, "movies for mood:", mood);
      } else if (cachedPools?.[mood]?.length > 0) {
        pool = cachedPools[mood];
        console.log("Using warm in-memory pool with", pool.length, "movies for mood:", mood);
      } else {
        console.log("Pool is missing/stale for this mood, rebuilding...");
        pool = await buildCandidatePool({
          userState,
          mood,
          minRating: 6.0,
          minVotes: 200,
          maxPoolSize: 140,
        });
        console.log("Built pool with", pool.length, "movies, saving...");
        saveCandidatePoolCache(pool, cacheMeta);
        setCachedPools((prev) => ({ ...prev, [mood]: pool }));
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
          Watchlist ({filteredWatchlist.length}/{watchlistArr.length})
        </div>
      )}

      {tab === "watchlist" && (
        <div className="watchlistFilters">
          <button
            className={`watchlistFilterBtn ${watchlistGenreFilter === "all" ? "active" : ""}`}
            onClick={() => setWatchlistGenreFilter("all")}
          >
            All
          </button>
          {watchlistGenreOptions.map((g) => (
            <button
              key={g.id}
              className={`watchlistFilterBtn ${watchlistGenreFilter === g.id ? "active" : ""}`}
              onClick={() => setWatchlistGenreFilter(g.id)}
            >
              {g.label}
            </button>
          ))}
          {watchlistGenreOptions.length === 0 && (
            <span className="watchlistFilterHint">Add movies with genre data to filter by genre.</span>
          )}
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
        {!loading && tab === "watchlist" && watchlistArr.length > 0 && filteredWatchlist.length === 0 && (
          <div className="status">No movies in this genre filter.</div>
        )}

        {!loading && (
          <div className="grid">
            {(tab === "watchlist" ? filteredWatchlist : tab === "liked" ? likedList : items).map(
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
        open={recoOpen && !showPicker}
        recommendations={recoList}
        userState={userState}
        onClose={() => setRecoOpen(false)}
        onOpenMovie={(movie) => {
          setPicked(movie);
          setShowPicker(true);
        }}
        onAddToWatchlist={(movie) => addToWatchlist(movie)}
        onRemoveFromWatchlist={(movieId) => removeFromWatchlist(movieId)}
        onReshuffle={pickForMe}
      />

    </div>
  );
}
