# UI/UX Pro Max Component Snippets

Reusable Tailwind / CSS snippet patterns for frontend interfaces:

---

## 1. Glassmorphism Card (Dark Theme)

```jsx
<div className="relative overflow-hidden rounded-2xl bg-slate-900/60 p-6 backdrop-blur-xl border border-white/[0.08] shadow-2xl transition-all duration-300 hover:border-emerald-500/30 hover:shadow-emerald-500/5 hover:-translate-y-0.5">
  <div className="flex items-center justify-between mb-4">
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current AQI</span>
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      Live
    </span>
  </div>
  <div className="text-3xl font-bold tracking-tight text-white font-mono">142</div>
  <p className="text-xs text-slate-400 mt-2">Moderate air quality. Sensitive individuals should wear masks.</p>
</div>
```

---

## 2. Bento Grid Layout Container

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
  {/* Hero 2x2 Bento Box */}
  <div className="col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-2 rounded-2xl bg-slate-900/80 border border-white/10 p-6 backdrop-blur-lg">
    {/* Map or Main Visualization */}
  </div>
  {/* Metric 1x1 Box */}
  <div className="col-span-1 rounded-2xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-lg">
    {/* Top Pollutant Card */}
  </div>
  {/* Trend 2x1 Box */}
  <div className="col-span-1 md:col-span-2 rounded-2xl bg-slate-900/60 border border-white/10 p-5 backdrop-blur-lg">
    {/* 24-hour Forecast Sparkline */}
  </div>
</div>
```

---

## 3. High-Craft Interactive Action Button

```jsx
<button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_25px_rgba(52,211,153,0.5)]">
  <span>Trigger Enforcement Scan</span>
</button>
```
