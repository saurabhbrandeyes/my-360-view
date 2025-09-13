"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

// Pad function to create file name with leading zeros (e.g., 00001)
function pad(n, len = 5) {
  return String(n).padStart(len, "0");
}

export default function TwoAxisViewer({
  horizontalCount = 361,
  verticalCount = 361,
  hBase = "Watch-Horizontal.",
  vCandidates = ["Watch-Vertical.", "Watch-Verital."],
  fileExt = "png",
  sensitivity = 20,
  width = 600,
  height = 600,
}) {
  const [hIndex, setHIndex] = useState(0);
  const [vIndex, setVIndex] = useState(0);
  const [lastMoveDir, setLastMoveDir] = useState("x");
  const [resolvedVBase, setResolvedVBase] = useState(vCandidates[0]);
  const [showHint, setShowHint] = useState(true);

  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const accX = useRef(0);
  const accY = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Resolve correct vertical base (in case of naming error like Verital)
  useEffect(() => {
    let mounted = true;

    const tryOne = (base, cb) => {
      const img = new Image();
      img.onload = () => mounted && cb(true);
      img.onerror = () => mounted && cb(false);
      img.src = `/images/vertical/${base}${pad(0)}.${fileExt}`;
    };

    tryOne(vCandidates[0], (ok) => {
      if (ok) {
        setResolvedVBase(vCandidates[0]);
      } else if (vCandidates[1]) {
        tryOne(vCandidates[1], (ok2) => {
          setResolvedVBase(ok2 ? vCandidates[1] : vCandidates[0]);
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [vCandidates, fileExt]);

  // Preload current frame
  useEffect(() => {
    const img = new Image();
    img.src =
      lastMoveDir === "x"
        ? `/images/horizontal/${hBase}${pad(hIndex)}.${fileExt}`
        : `/images/vertical/${resolvedVBase}${pad(vIndex)}.${fileExt}`;
  }, [hIndex, vIndex, lastMoveDir, resolvedVBase, hBase, fileExt]);

  // Pointer handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      draggingRef.current = true;
      el.style.cursor = "grabbing";
      lastPointer.current = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
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
        setHIndex(
          (prev) => (prev + dir * steps + horizontalCount) % horizontalCount
        );
        accX.current -= steps * sensitivity * dir;
        setLastMoveDir("x");
      }

      if (Math.abs(accY.current) >= sensitivity) {
        const stepsY = Math.floor(Math.abs(accY.current) / sensitivity);
        const dirY = accY.current > 0 ? 1 : -1;
        setVIndex(
          (prev) => (prev + dirY * stepsY + verticalCount) % verticalCount
        );
        accY.current -= stepsY * sensitivity * dirY;
        setLastMoveDir("y");
      }

      lastPointer.current = { x: e.clientX, y: e.clientY };
      setShowHint(false);
    };

    const onPointerUp = (e) => {
      draggingRef.current = false;
      accX.current = 0;
      accY.current = 0;
      el.style.cursor = "grab";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [horizontalCount, verticalCount, sensitivity, resolvedVBase]);

  // Keyboard arrow navigation
  const handleKey = useCallback(
    (e) => {
      setShowHint(false);
      if (e.key === "ArrowRight") {
        setHIndex((prev) => (prev + 1) % horizontalCount);
        setLastMoveDir("x");
      } else if (e.key === "ArrowLeft") {
        setHIndex((prev) => (prev - 1 + horizontalCount) % horizontalCount);
        setLastMoveDir("x");
      } else if (e.key === "ArrowUp") {
        setVIndex((prev) => (prev - 1 + verticalCount) % verticalCount);
        setLastMoveDir("y");
      } else if (e.key === "ArrowDown") {
        setVIndex((prev) => (prev + 1) % verticalCount);
        setLastMoveDir("y");
      }
    },
    [horizontalCount, verticalCount]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Auto-shift on load to show interaction is possible
  useEffect(() => {
    const timer = setTimeout(() => {
      setHIndex((prev) => (prev + 5) % horizontalCount);
      setVIndex((prev) => (prev + 5) % verticalCount);
    }, 500);
    return () => clearTimeout(timer);
  }, [horizontalCount, verticalCount]);

  const hPath = (i) => `/images/horizontal/${hBase}${pad(i)}.${fileExt}`;
  const vPath = (i) => `/images/vertical/${resolvedVBase}${pad(i)}.${fileExt}`;
  const currentSrc = lastMoveDir === "x" ? hPath(hIndex) : vPath(vIndex);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
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
      tabIndex={0} // Needed for keyboard events
    >
      <img
        src={currentSrc}
        alt="360 viewer"
        onError={(e) => {
          e.target.onerror = null; // Prevent infinite loop
          e.target.src = "/images/fallback.png";
        }}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
        }}
        draggable={false}
      />

      {/* Hint overlay on first load */}
      {showHint && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            color: "rgba(0, 0, 0, 0.6)",
            background: "rgba(255, 255, 255, 0.7)",
            textAlign: "center",
            pointerEvents: "none",
            padding: 20,
            fontWeight: "bold",
          }}
        >
          Drag to Rotate<br />or Use Arrow Keys
        </div>
      )}
    </div>
  );
}
