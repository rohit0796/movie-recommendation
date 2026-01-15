import React from "react";
import { MdHome, MdSearch, MdFavoriteBorder, MdPlaylistAddCheck } from "react-icons/md";

export function BottomBar({ tab, setTab }) {
  return (
    <nav className="bottom">
      <button className={tab === "home" ? "active" : ""} onClick={() => setTab("home")}>
        <MdHome size={20} />
        <span>Home</span>
      </button>
      <button className={tab === "search" ? "active" : ""} onClick={() => setTab("search")}>
        <MdSearch size={20} />
        <span>Search</span>
      </button>
      <button className={tab === "liked" ? "active" : ""} onClick={() => setTab("liked")}>
        <MdFavoriteBorder size={20} />
        <span>Liked</span>
      </button>
      <button
        className={tab === "watchlist" ? "active" : ""}
        onClick={() => setTab("watchlist")}
      >
        <MdPlaylistAddCheck size={20} />
        <span>List</span>
      </button>

    </nav>
  );
}
