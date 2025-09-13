"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

function pad(n, len = 5) {
  return String(n).padStart(len, "0");
}

export default function TwoAxisViewer({
  horizontalCount = 361,
  verticalCount = 361,
  hBase = "Watch-Horizontal.",
  vCandidates = ["Watch-Vertical.", "Watch-Verital."],
  fileExt = "png",
  width = 600,
}) {
  const [hIndex, setHIndex] = useState(0);
  const [vIndex, setVIndex] = useState(0);
  const [lastMoveDir, setLastMoveDir] = useState("x");
  const [resolvedVBase, setResolvedVBase] = useState(vCandidates[0]);
  const [showHint, setShowHint] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeArrow, setActiveArrow] = useState(null); // currently moving arrow

  const scrollInterval = useRef(null);

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  // Detect vertical base
  useEffect(() => {
    let mounted = true;
    const tryOne = (base, cb) => {
      const img = new Image();
      img.onload = () => mounted && cb(true);
      img.onerror = () => mounted && cb(false);
      img.src = `/images/vertical/${base}${pad(0)}.${fileExt}`;
    };
    tryOne(vCandidates[0], (ok) => {
      if (ok) setResolvedVBase(vCandidates[0]);
      else if (vCandidates[1]) {
        tryOne(vCandidates[1], (ok2) => {
          if (ok2) setResolvedVBase(vCandidates[1]);
          else setResolvedVBase(vCandidates[0]);
        });
      }
    });
    return () => { mounted = false; };
  }, [vCandidates, fileExt]);

  // Preload frames
  const preloadNextFrames = (direction, base, index, count) => {
    for (let i = 1; i <= 2; i++) {
      const idx = (index + i) % count;
      const img = new Image();
      img.src = `/images/${direction}/${base}${pad(idx)}.${fileExt}`;
    }
  };
  useEffect(() => {
    lastMoveDir === "x"
      ? preloadNextFrames("horizontal", hBase, hIndex, horizontalCount)
      : preloadNextFrames("vertical", resolvedVBase, vIndex, verticalCount);
  }, [hIndex, vIndex, lastMoveDir, hBase, resolvedVBase]);

  // Keyboard support (optional)
  const handleKey = useCallback((e) => {
    setShowHint(false);
    if (e.key === "ArrowRight") { setHIndex((prev) => (prev + 1) % horizontalCount); setLastMoveDir("x"); }
    else if (e.key === "ArrowLeft") { setHIndex((prev) => (prev - 1 + horizontalCount) % horizontalCount); setLastMoveDir("x"); }
    else if (e.key === "ArrowUp") { setVIndex((prev) => (prev - 1 + verticalCount) % verticalCount); setLastMoveDir("y"); }
    else if (e.key === "ArrowDown") { setVIndex((prev) => (prev + 1) % verticalCount); setLastMoveDir("y"); }
  }, [horizontalCount, verticalCount]);
  useEffect(() => { window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey); }, [handleKey]);

  // Scroll buttons logic
  const startScrolling = (dir) => {
    stopScrolling();
    setActiveArrow(dir); // set the moving arrow
    scrollInterval.current = setInterval(() => {
      if (dir === "left") { setHIndex((prev) => (prev - 1 + horizontalCount) % horizontalCount); setLastMoveDir("x"); }
      else if (dir === "right") { setHIndex((prev) => (prev + 1) % horizontalCount); setLastMoveDir("x"); }
      else if (dir === "up") { setVIndex((prev) => (prev - 1 + verticalCount) % verticalCount); setLastMoveDir("y"); }
      else if (dir === "down") { setVIndex((prev) => (prev + 1) % verticalCount); setLastMoveDir("y"); }
      setShowHint(false);
    }, 30);
  };

  const stopScrolling = () => {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    scrollInterval.current = null;
    setActiveArrow(null); // reset active arrow
  };

  const hPath = (i) => `/images/horizontal/${hBase}${pad(i)}.${fileExt}`;
  const vPath = (i) => `/images/vertical/${resolvedVBase}${pad(i)}.${fileExt}`;
  const currentSrc = lastMoveDir === "x" ? hPath(hIndex) : vPath(vIndex);

  const arrowStyle = (dir) => {
    const size = isMobile ? 50 : 32;
    return {
      position: "absolute",
      fontSize: size,
      padding: "10px",
      color: "#fff",
      background: "rgba(0,0,0,0.4)",
      border: "none",
      borderRadius: 5,
      cursor: "pointer",
      zIndex: 10,
      userSelect: "none",
      WebkitUserSelect: "none",
      touchAction: "none",
      WebkitTapHighlightColor: "transparent",
      top: dir === "up" ? 10 : dir === "down" ? "auto" : "50%",
      bottom: dir === "down" ? 10 : "auto",
      left: dir === "left" ? 10 : dir === "right" ? "auto" : "50%",
      right: dir === "right" ? 10 : "auto",
      transform: "none",
      display: activeArrow && activeArrow !== dir ? "none" : "block", // only show active arrow
    };
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        aspectRatio: "1/1",
        border: activeArrow ? "none" : "1px solid #ddd", // hide border while moving
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f8f8",
        overflow: "hidden",
        position: "relative",
      }}
      onClick={stopScrolling}
      onTouchStart={stopScrolling}
    >
      <img
        src={currentSrc}
        alt="360 viewer"
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
          transform: activeArrow && isMobile ? "scale(1.1)" : "scale(1)", // zoom slightly on mobile when moving
          transition: "transform 0.2s ease",
        }}
        draggable={false}
      />

      {showHint && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            color: "rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          ⬅️ ➡️ ⬆️ ⬇️
        </div>
      )}

      {["left","right","up","down"].map(dir => (
        <button
          key={dir}
          onMouseDown={(e) => { e.stopPropagation(); startScrolling(dir); }}
          onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); startScrolling(dir); }}
          style={arrowStyle(dir)}
        >
          {dir === "left" ? "←" : dir === "right" ? "→" : dir === "up" ? "↑" : "↓"}
        </button>
      ))}
    </div>
  );
}
