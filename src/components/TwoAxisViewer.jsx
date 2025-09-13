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
  const [resolvedVBase, setResolvedVBase] = useState(null);
  const [showHint, setShowHint] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeArrow, setActiveArrow] = useState(null);
  const [animateArrow, setAnimateArrow] = useState(true);

  const scrollInterval = useRef(null);

  useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  useEffect(() => {
    let mounted = true;
    const tryBase = async (base) => {
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = `/images/vertical/${base}${pad(0)}.${fileExt}`;
      });
    };
    const resolveVertical = async () => {
      for (let base of vCandidates) {
        const exists = await tryBase(base);
        if (exists && mounted) { setResolvedVBase(base); return; }
      }
      if (mounted) setResolvedVBase(vCandidates[0]);
    };
    resolveVertical();
    return () => { mounted = false; };
  }, [vCandidates, fileExt]);

  const preloadNextFrames = (direction, base, index, count) => {
    for (let i = 1; i <= 3; i++) {
      const idx = (index + i) % count;
      const img = new Image();
      img.src = `/images/${direction}/${base}${pad(idx)}.${fileExt}`;
    }
  };
  useEffect(() => {
    if (!resolvedVBase) return;
    lastMoveDir === "x"
      ? preloadNextFrames("horizontal", hBase, hIndex, horizontalCount)
      : preloadNextFrames("vertical", resolvedVBase, vIndex, verticalCount);
  }, [hIndex, vIndex, lastMoveDir, hBase, resolvedVBase]);

  const handleKey = useCallback((e) => {
    setShowHint(false);
    setAnimateArrow(false);
    if (e.key === "ArrowRight") { setHIndex((prev) => (prev + 1) % horizontalCount); setLastMoveDir("x"); }
    else if (e.key === "ArrowLeft") { setHIndex((prev) => (prev - 1 + horizontalCount) % horizontalCount); setLastMoveDir("x"); }
    else if (e.key === "ArrowUp") { setVIndex((prev) => (prev - 1 + verticalCount) % verticalCount); setLastMoveDir("y"); }
    else if (e.key === "ArrowDown") { setVIndex((prev) => (prev + 1) % verticalCount); setLastMoveDir("y"); }
  }, [horizontalCount, verticalCount]);
  useEffect(() => { window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey); }, [handleKey]);

  const startScrolling = (dir) => {
    stopScrolling();
    setActiveArrow(dir);
    setAnimateArrow(false);
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
    setActiveArrow(null);
  };

  const hPath = (i) => `/images/horizontal/${hBase}${pad(i)}.${fileExt}`;
  const vPath = (i) => `/images/vertical/${resolvedVBase}${pad(i)}.${fileExt}`;
  const currentSrc = lastMoveDir === "x" ? hPath(hIndex) : vPath(vIndex);

  const arrowStyle = (dir) => {
  let size = isMobile ? 35 : 28;
  let edgeOffset = 8; // distance from edge

  // default
  let transform = "translate(-50%, -50%)";

  // Adjust per direction
  if (dir === "left") transform = "translate(0, -50%)";    // left edge vertically centered
  if (dir === "right") transform = "translate(0, -50%)";   // right edge vertically centered
  if (dir === "up") transform = "translate(-50%, 0)";      // top edge horizontally centered
  if (dir === "down") transform = "translate(-50%, 0)";    // bottom edge horizontally centered

  return {
    position: "absolute",
    width: size,
    height: size,
    fontSize: size * 0.6,
    display: activeArrow && activeArrow !== dir ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    background: "linear-gradient(135deg,#1a73e8,#4285f4)",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    zIndex: 10,
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "none",
    WebkitTapHighlightColor: "transparent",
    top: dir === "up" ? edgeOffset : dir === "down" ? "auto" : "50%",
    bottom: dir === "down" ? edgeOffset : "auto",
    left: dir === "left" ? edgeOffset : dir === "right" ? "auto" : "50%",
    right: dir === "right" ? edgeOffset : "auto",
    transform: transform,
    transition: "all 0.2s ease",
    animation: animateArrow && !activeArrow ? "pulse 1.2s infinite" : "none",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
    zIndex: 20,
  };
};



  return (
    <div
      style={{
        width: "100%",
        maxWidth: width,
        aspectRatio: "1/1",
        border: activeArrow ? "none" : "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
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
          transform: activeArrow && isMobile ? "scale(1.1)" : "scale(1)",
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
            color: "rgba(255,255,255,0.5)",
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

      <style jsx>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
