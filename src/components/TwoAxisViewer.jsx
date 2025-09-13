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
  sensitivity = 25,
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

  // detect vertical base (Vertical vs Verital)
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

    return () => {
      mounted = false;
    };
  }, [vCandidates, fileExt]);

  // preload current frame
  useEffect(() => {
    const img = new Image();
    img.src =
      lastMoveDir === "x"
        ? `/images/horizontal/${hBase}${pad(hIndex)}.${fileExt}`
        : `/images/vertical/${resolvedVBase}${pad(vIndex)}.${fileExt}`;
  }, [hIndex, vIndex, lastMoveDir, resolvedVBase, hBase, fileExt]);

  // pointer handlers
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
      setShowHint(false); // hide arrows after first drag
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

  // keyboard support
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

  // auto-move once on load
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
      tabIndex={0} // 👈 keyboard ke liye focusable
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

      {/* Hint Overlay Arrows (only once) */}
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
    </div>
  );
}
