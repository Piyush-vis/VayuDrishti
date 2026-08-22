import React from 'react';
import { History, Play, Pause, X } from 'lucide-react';
import { useReplay } from '../../context/ReplayContext';

const HOUR_MS = 3600 * 1000;
const toDate = (iso) => new Date(iso + 'Z');
const toNaiveIso = (date) => date.toISOString().slice(0, 19);

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
    <div className="w-full bg-[var(--accent-purple-subtle)] border-b border-[var(--accent-purple-border)] px-5 py-2.5 flex items-center gap-4 flex-wrap z-[1500] shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        <History className="h-4 w-4 text-[var(--accent-purple)]" />
        <span className="text-xs font-heading font-extrabold text-[var(--accent-purple)] uppercase tracking-wider whitespace-nowrap">
          Crisis Replay Mode
        </span>
        <span className="text-xs font-semibold text-[var(--text-primary)] hidden sm:inline whitespace-nowrap">
          · {episode.label}
        </span>
      </div>

      <button
        onClick={() => setPlaying(!playing)}
        className="h-7 w-7 rounded-full bg-[var(--accent-purple)] hover:opacity-90 flex items-center justify-center text-white transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"
        title={playing ? 'Pause timeline playback' : 'Play timeline hour-by-hour'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
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
        className="flex-1 min-w-[150px] h-2 accent-[var(--accent-purple)] bg-[var(--bg-surface-elevated)] rounded-lg cursor-pointer"
      />

      <span className="text-xs font-mono font-bold text-[var(--text-primary)] px-2.5 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] whitespace-nowrap shrink-0 shadow-sm">
        {istLabel} IST
      </span>

      <button
        onClick={exitReplay}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-xs font-heading font-semibold text-[var(--text-primary)] transition-all active:scale-95 shrink-0 cursor-pointer"
      >
        <X className="h-3.5 w-3.5 text-[var(--text-muted)]" />
        Exit Replay
      </button>
    </div>
  );
};

export default ReplayBanner;
