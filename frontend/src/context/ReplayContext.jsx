import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { replayApi, setGlobalReplayAt } from '../services/api';

// Global historical-replay state. `replayAt` (naive UTC ISO string) is mirrored
// into the api layer, which stamps every GET with `at=` — so entering a replay
// re-scopes the entire platform to that historical moment.
const ReplayContext = createContext(null);

const HOUR_MS = 3600 * 1000;
const toDate = (iso) => new Date(iso + 'Z');
const toNaiveIso = (date) => date.toISOString().slice(0, 19);

export function ReplayProvider({ children }) {
  const [episodes, setEpisodes] = useState([]);
  const [episode, setEpisode] = useState(null);
  const [replayAt, _setReplayAt] = useState(null);
  const [replayAtDebounced, setReplayAtDebounced] = useState(null);
  const [playing, setPlaying] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    replayApi.episodes().then(setEpisodes).catch(() => setEpisodes([]));
  }, []);

  const setReplayAt = (iso) => {
    setGlobalReplayAt(iso);
    _setReplayAt(iso);
    // Debounce the value data hooks depend on, so scrubbing the timeline
    // doesn't fire a refetch burst per pixel of drag.
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setReplayAtDebounced(iso), 300);
  };

  const enterReplay = (ep) => {
    setEpisode(ep);
    setReplayAt(ep.default_at);
  };

  const exitReplay = () => {
    setPlaying(false);
    setEpisode(null);
    setReplayAt(null);
  };

  // Playback: advance one hour per tick until the episode ends
  useEffect(() => {
    if (!playing || !episode || !replayAt) return undefined;
    const timer = setInterval(() => {
      _setReplayAt((prev) => {
        const next = new Date(toDate(prev).getTime() + HOUR_MS);
        if (next > toDate(episode.end)) {
          setPlaying(false);
          return prev;
        }
        const iso = toNaiveIso(next);
        setGlobalReplayAt(iso);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setReplayAtDebounced(iso), 300);
        return iso;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [playing, episode]);

  return (
    <ReplayContext.Provider value={{
      episodes, episode, replayAt, replayAtDebounced,
      setReplayAt, enterReplay, exitReplay, playing, setPlaying,
    }}>
      {children}
    </ReplayContext.Provider>
  );
}

const INERT = {
  episodes: [], episode: null, replayAt: null, replayAtDebounced: null,
  setReplayAt: () => {}, enterReplay: () => {}, exitReplay: () => {},
  playing: false, setPlaying: () => {},
};

export const useReplay = () => useContext(ReplayContext) || INERT;
