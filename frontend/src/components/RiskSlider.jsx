import React, { useState, useEffect, useRef } from "react";

export default function RiskSlider({
  min: initialMin = 0,
  max: initialMax = 100,
  step = 1,
  onChange = () => {},
  widthClass = "w-full"
}) {
  const [minVal, setMinVal] = useState(initialMin);
  const [maxVal, setMaxVal] = useState(initialMax);

  const trackRef = useRef(null);
  const draggingRef = useRef(null); // 'left' | 'right' | null

  // notify parent when valid
  useEffect(() => {
    if (minVal > maxVal) setMinVal(maxVal);
    else if (maxVal < minVal) setMaxVal(minVal);
    else onChange(minVal, maxVal);
  }, [minVal, maxVal, onChange]);

  useEffect(() => {
    const onUp = () => {
      if (draggingRef.current) draggingRef.current = null;
      // remove listeners – we'll remove in cleanup as well
    };
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  // helper to convert clientX -> percent (0..100) relative to track
  const clientXToPercent = (clientX) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    return Math.round((x / rect.width) * 100);
  };

  // move handler used while dragging
  const handleMove = (clientX) => {
    const pct = clientXToPercent(clientX);
    // snap to step
    const snapped = Math.round(pct / step) * step;
    if (draggingRef.current === "left") {
      const newVal = Math.min(snapped, maxVal);
      setMinVal(newVal);
    } else if (draggingRef.current === "right") {
      const newVal = Math.max(snapped, minVal);
      setMaxVal(newVal);
    }
  };

  // attach mousemove / touchmove while dragging
  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      if (e.type === "mousemove") {
        handleMove(e.clientX);
      } else if (e.type === "touchmove" && e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX);
      }
    };
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
    };
  }, [minVal, maxVal, step]);

  // percent helpers for UI
  const getPercent = (value) => Math.round(((value - 0) / (100 - 0)) * 100);
  const minPercent = getPercent(minVal);
  const maxPercent = getPercent(maxVal);
  const trackStyle = { left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` };

  // start dragging when visible handle is pressed
  const startDragLeft = (e) => {
    e.preventDefault();
    draggingRef.current = "left";
    const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    handleMove(clientX);
  };
  const startDragRight = (e) => {
    e.preventDefault();
    draggingRef.current = "right";
    const clientX = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    handleMove(clientX);
  };

  // quick presets
  const setPreset = (minP, maxP) => {
    setMinVal(minP);
    setMaxVal(maxP);
  };

  return (
    <div className={`p-3 bg-white rounded-lg shadow ${widthClass}`}>
    
    
     <div className="flex items-center justify-between mb-1">
    <div className="flex items-center gap-1">
        <span className="font-semibold text-gray-900">Risk Window:</span>
        <span className="text-gray-500 text-sm">
            Trim to show customers in this risk range
        </span>
    </div>

    <div className="text-gray-600 font-medium text-sm">
        {minVal}% — {maxVal}%
    </div>
</div>




      <div className="relative mt-3 select-none">
        <div ref={trackRef} className="h-2 bg-gray-200 rounded-full relative">
          <div className="absolute h-2 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full" style={trackStyle} />
        </div>

        {/* Hidden native inputs kept for accessibility but not relied on for dragging */}
        <input
          type="range"
          min={0}
          max={100}
          step={step}
          value={minVal}
          onChange={(e) => setMinVal(Math.min(Number(e.target.value), maxVal))}
          aria-label="min risk"
          style={{
            position: "absolute",
            left: 0,
            top: "-10px",
            width: "100%",
            height: "40px",
            opacity: 0.01,
            pointerEvents: "none" // disable pointer events so visible handle controls dragging
          }}
        />
        <input
          type="range"
          min={0}
          max={100}
          step={step}
          value={maxVal}
          onChange={(e) => setMaxVal(Math.max(Number(e.target.value), minVal))}
          aria-label="max risk"
          style={{
            position: "absolute",
            left: 0,
            top: "-10px",
            width: "100%",
            height: "40px",
            opacity: 0.01,
            pointerEvents: "none"
          }}
        />

        {/* Visible handle (left) — user clicks/touches this to begin drag */}
        <div
          onMouseDown={startDragLeft}
          onTouchStart={startDragLeft}
          style={{ left: `${minPercent}%` }}
          className="absolute -top-2 -translate-x-1/2 w-6 h-6 bg-white border rounded-full shadow flex items-center justify-center z-40 cursor-pointer"
        >
          <div className="w-2 h-2 bg-yellow-500 rounded-full" />
        </div>

        {/* Visible handle (right) */}
        <div
          onMouseDown={startDragRight}
          onTouchStart={startDragRight}
          style={{ left: `${maxPercent}%` }}
          className="absolute -top-2 -translate-x-1/2 w-6 h-6 bg-white border rounded-full shadow flex items-center justify-center z-40 cursor-pointer"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full" />
        </div>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <button className="px-2 py-1 text-xs rounded bg-gray-100" onClick={() => setPreset(80, 100)}>Top 20% (High)</button>
        <button className="px-2 py-1 text-xs rounded bg-gray-100" onClick={() => setPreset(50, 80)}>50–80% (Medium)</button>
        <button className="px-2 py-1 text-xs rounded bg-gray-100" onClick={() => setPreset(0, 50)}>Bottom 50% (Low)</button>
        <button className="px-2 py-1 text-xs rounded bg-gray-100" onClick={() => setPreset(0, 100)}>Show All</button>
      </div>
    </div>
  );
}
