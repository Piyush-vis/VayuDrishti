import React from 'react';
import { History, Play, Pause, X } from 'lucide-react';
import { useReplay } from '../../context/ReplayContext';

const HOUR_MS = 3600 * 1000;
const toDate = (iso) => new Date(iso + 'Z');
const toNaiveIso = (date) => date.toISOString().slice(0, 19);

// Persistent full-width strip shown whenever a historical replay episode is
// active. Deliberately loud: the on-screen label is part of the honesty story.
const ReplayBanner = () => {
  const { episode, replayAt, setReplayAt, exitReplay, playing, setPlaying } = useReplay();
  if (!episode || !replayAt) return null;

  const start = toDate(episode.start);
  const end = toDate(episode.end);
  const totalHours = Math.round((end - start) / HOUR_MS);
  const currentHour = Math.round((toDate(replayAt) - start) / HOUR_MS);

  const istLabel = toDate(replayAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  return (
    <div className="w-full bg-gradient-to-r from-purple-950/95 via-purple-900/95 to-purple-950/95 border-b border-purple-700/50 px-4 py-2 flex items-center gap-3 flex-wrap z-[1500]">
      <div className="flex items-center gap-2 shrink-0">
        <History className="h-4 w-4 text-purple-300" />
        <span className="text-[10px] font-black text-purple-200 uppercase tracking-widest whitespace-nowrap">
          Historical Replay
        </span>
        <span className="text-[10px] font-semibold text-purple-300/90 hidden sm:inline whitespace-nowrap">
          {episode.label}
        </span>
      </div>

      <button
        onClick={() => setPlaying(!playing)}
        className="h-6 w-6 rounded-full bg-purple-700/60 hover:bg-purple-600 border border-purple-500/50 flex items-center justify-center text-purple-100 transition-all active:scale-95 shrink-0"
        title={playing ? 'Pause playback' : 'Play the crisis hour by hour'}
      >
        {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
      </button>

      <input
        type="range"
        min={0}
        max={totalHours}
        value={Math.min(Math.max(currentHour, 0), totalHours)}
        onChange={(e) => {
          const next = new Date(start.getTime() + Number(e.target.value) * HOUR_MS);
          setReplayAt(toNaiveIso(next));
        }}
        className="flex-1 min-w-[140px] h-1.5 accent-purple-400 cursor-pointer"
      />

      <span className="text-[11px] font-mono font-bold text-purple-100 whitespace-nowrap shrink-0">
        {istLabel} IST
      </span>

      <button
        onClick={exitReplay}
        className="flex items-center gap-1 px-2 py-1 rounded border border-purple-500/50 bg-purple-800/50 hover:bg-purple-700 text-[10px] font-bold text-purple-100 uppercase tracking-wider transition-all active:scale-95 shrink-0"
      >
        <X className="h-3 w-3" /> Exit replay
      </button>
    </div>
  );
};

export default ReplayBanner;
