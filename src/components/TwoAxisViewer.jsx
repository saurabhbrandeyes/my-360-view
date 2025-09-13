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
  sensitivity = 6,
  width = 600,
}) {
  const [hIndex, setHIndex] = useState(0);
  const [vIndex, setVIndex] = useState(0);
  const [lastMoveDir, setLastMoveDir] = useState("x");
  const [resolvedVBase, setResolvedVBase] = useState(vCandidates[0]);
  const [showHint, setShowHint] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const accX = useRef(0);
  const accY = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });
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

  // Pointer drag
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      draggingRef.current = true;
      el.style.cursor = "grabbing";
      lastPointer.current = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch {}
      stopScrolling();
    };
    const onPointerMove = (e) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      accX.current += dx;
      accY.current += dy;

      if (Math.abs(accX.current) >= sensitivity) {
        const steps = Math.floor(Math.abs(accX.current) / sensitivity);
        const dir = accX.current > 0 ? -1 : 1;
        setHIndex((prev) => (prev + dir * steps + horizontalCount) % horizontalCount);
        accX.current -= steps * sensitivity * dir;
        setLastMoveDir("x");
      }
      if (Math.abs(accY.current) >= sensitivity) {
        const steps = Math.floor(Math.abs(accY.current) / sensitivity);
        const dir = accY.current > 0 ? -1 : 1;
        setVIndex((prev) => (prev + dir * steps + verticalCount) % verticalCount);
        accY.current -= steps * sensitivity * dir;
        setLastMoveDir("y");
      }

      lastPointer.current = { x: e.clientX, y: e.clientY };
      setShowHint(false);
    };
    const onPointerUp = () => {
      draggingRef.current = false;
      accX.current = 0;
      accY.current = 0;
      el.style.cursor = "grab";
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [horizontalCount, verticalCount, sensitivity]);

  // Keyboard
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
      top: dir === "up" ? 10 : dir === "down" ? "auto" : "50%",
      bottom: dir === "down" ? 10 : "auto",
      left: dir === "left" ? 10 : dir === "right" ? "auto" : "50%",
      right: dir === "right" ? 10 : "auto",
      transform: "none",
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: width,
        aspectRatio: "1/1",
        border: "1px solid #ddd",
        touchAction: "none",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8f8f8",
        overflow: "hidden",
        position: "relative",
        cursor: "grab",
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
          onTouchStart={(e) => { e.stopPropagation(); startScrolling(dir); }}
          style={arrowStyle(dir)}
        >
          {dir === "left" ? "←" : dir === "right" ? "→" : dir === "up" ? "↑" : "↓"}
        </button>
      ))}
    </div>
  );
}
