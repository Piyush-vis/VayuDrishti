import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const TimeSlider = ({ onChange, startHour = -24, endHour = 0 }) => {
  const [value, setValue] = useState(endHour);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setValue((prev) => {
          if (prev >= endHour) {
            return startHour; // loop back
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, startHour, endHour]);

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const resetSlider = () => {
    setIsPlaying(false);
    setValue(endHour);
  };

  const getLabel = (val) => {
    if (val === 0) return "Live / Current";
    return `${Math.abs(val)} hours ago`;
  };

  return (
    <div className="absolute bottom-6 left-6 z-[1000] p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-xl flex items-center gap-4 w-[calc(100%-3rem)] max-w-lg shadow-2xl">
      <button
        onClick={togglePlay}
        className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-all active:scale-95 flex items-center justify-center shrink-0"
        title={isPlaying ? "Pause Timelapse" : "Play Timelapse"}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <button
        onClick={resetSlider}
        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95 flex items-center justify-center shrink-0 border border-slate-700/50"
        title="Reset to Live"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      <div className="flex-1 space-y-1.5">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
          <span>{startHour}H (Past)</span>
          <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            {getLabel(value)}
          </span>
          <span>Live</span>
        </div>
        <input
          type="range"
          min={startHour}
          max={endHour}
          value={value}
          onChange={(e) => {
            setIsPlaying(false);
            setValue(parseInt(e.target.value));
          }}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
};

export default TimeSlider;
