"use client";
import React, { useEffect, useRef, useState } from "react";

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

  // detect vertical base
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

  // preload current frame
  useEffect(() => {
    const img = new Image();
    img.src = lastMoveDir === "x" ? `/images/horizontal/${hBase}${pad(hIndex)}.${fileExt}` 
                                  : `/images/vertical/${resolvedVBase}${pad(vIndex)}.${fileExt}`;
  }, [hIndex, vIndex, lastMoveDir, resolvedVBase, hBase, fileExt]);

  // pointer handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      draggingRef.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch {}
    };

    const onPointerMove = (e) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      accX.current += dx;
      accY.current += dy;

      if (Math.abs(accX.current) >= sensitivity) {
        const steps = Math.floor(Math.abs(accX.current) / sensitivity);
        const dir = accX.current > 0 ? 1 : -1;
        setHIndex((prev) => (prev + dir * steps + horizontalCount) % horizontalCount);
        accX.current -= steps * sensitivity * dir;
        setLastMoveDir("x");
      }

      if (Math.abs(accY.current) >= sensitivity) {
        const stepsY = Math.floor(Math.abs(accY.current) / sensitivity);
        const dirY = accY.current > 0 ? 1 : -1;
        setVIndex((prev) => (prev + dirY * stepsY + verticalCount) % verticalCount);
        accY.current -= stepsY * sensitivity * dirY;
        setLastMoveDir("y");
      }

      lastPointer.current = { x: e.clientX, y: e.clientY };
      setShowHint(false); // hide hint when user interacts
    };

    const onPointerUp = (e) => {
      draggingRef.current = false;
      accX.current = 0;
      accY.current = 0;
      try { el.releasePointerCapture(e.pointerId); } catch {}
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

  // keyboard navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setHIndex((prev) => (prev - 1 + horizontalCount) % horizontalCount);
        setLastMoveDir("x");
      } else if (e.key === "ArrowRight") {
        setHIndex((prev) => (prev + 1) % horizontalCount);
        setLastMoveDir("x");
      } else if (e.key === "ArrowUp") {
        setVIndex((prev) => (prev - 1 + verticalCount) % verticalCount);
        setLastMoveDir("y");
      } else if (e.key === "ArrowDown") {
        setVIndex((prev) => (prev + 1) % verticalCount);
        setLastMoveDir("y");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [horizontalCount, verticalCount]);

  // auto-move on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHIndex(5); // small horizontal move
      setVIndex(5); // small vertical move
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
        cursor: "grab", // show "grab" cursor for draggable
      }}
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

      {/* Instruction hint */}
      {showHint && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: 24,
          color: "#555",
          userSelect: "none",
          fontWeight: "bold",
          background: "rgba(255, 255, 255, 0.7)",
          padding: "10px",
          borderRadius: "5px",
        }}>
          Drag to Navigate or Use Arrow Keys
        </div>
      )}
    </div>
  );
}
