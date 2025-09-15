"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

function pad(n, len = 5) {
  return String(n).padStart(len, "0");
}

export default function TwoAxisViewer({
  horizontalCount = 361,
  verticalCount = 361,
  dCount = 361,
  hBase = "Watch-Horizontal.",
  vCandidates = ["Watch-Vertical.", "Watch-Verital."],
  dLeftBase = "Dai_left.",
  dRightBase = "Dai_right.",
  fileExt = "png",
  width = 600,
  preloadOffset = 3,
  sensitivity = 0.3,
}) {
  const [hIndex, setHIndex] = useState(0);
  const [vIndex, setVIndex] = useState(0);
  const [dlIndex, setDlIndex] = useState(0);
  const [drIndex, setDrIndex] = useState(0);
  const [lastMoveDir, setLastMoveDir] = useState("x");
  const [resolvedVBase, setResolvedVBase] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeArrow, setActiveArrow] = useState(null);
  const [firstLoaded, setFirstLoaded] = useState(false);

  const loadedImages = useRef({});
  const scrollInterval = useRef(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const velocityX = useRef(0);
  const velocityY = useRef(0);
  const momentumFrame = useRef(null);

  const momentumFactor = 0.92;
  const snapThreshold = 0.5;

  useEffect(() => setIsMobile(window.innerWidth < 768), []);

  // resolve vertical base
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
        if (exists && mounted) {
          setResolvedVBase(base);
          return;
        }
      }
      if (mounted) setResolvedVBase(vCandidates[0]);
    };
    resolveVertical();
    return () => {
      mounted = false;
    };
  }, [vCandidates, fileExt]);

  // preload first horizontal
  useEffect(() => {
    const firstImg = new Image();
    firstImg.src = `/images/horizontal/${hBase}${pad(0)}.${fileExt}`;
    firstImg.onload = () => {
      loadedImages.current[`h-0`] = true;
      setFirstLoaded(true);
      lazyPreload(0, 0);
    };
  }, [hBase, fileExt]);

  // path helpers
  const hPath = (i) => `/images/horizontal/${hBase}${pad(i)}.${fileExt}`;
  const vPath = (i) => `/images/vertical/${resolvedVBase}${pad(i)}.${fileExt}`;
  const dlPath = (i) =>
    `/images/diagonal-left/${dLeftBase}${pad(i)}.${fileExt}`;
  const drPath = (i) =>
    `/images/diagonal-right/${dRightBase}${pad(i)}.${fileExt}`;

  const lazyPreload = (h, v) => {
    for (let i = 1; i <= preloadOffset; i++) {
      const idxH = (h + i) % horizontalCount;
      if (!loadedImages.current[`h-${idxH}`]) {
        const img = new Image();
        img.src = hPath(idxH);
        loadedImages.current[`h-${idxH}`] = true;
      }
      if (resolvedVBase) {
        const idxV = (v + i) % verticalCount;
        if (!loadedImages.current[`v-${idxV}`]) {
          const img = new Image();
          img.src = vPath(idxV);
          loadedImages.current[`v-${idxV}`] = true;
        }
      }
      const idxDL = (dlIndex + i) % dCount;
      if (!loadedImages.current[`dl-${idxDL}`]) {
        const img = new Image();
        img.src = dlPath(idxDL);
        loadedImages.current[`dl-${idxDL}`] = true;
      }
      const idxDR = (drIndex + i) % dCount;
      if (!loadedImages.current[`dr-${idxDR}`]) {
        const img = new Image();
        img.src = drPath(idxDR);
        loadedImages.current[`dr-${idxDR}`] = true;
      }
    }
  };

  useEffect(
    () => lazyPreload(hIndex, vIndex),
    [hIndex, vIndex, dlIndex, drIndex, resolvedVBase]
  );

  // keyboard
  const handleKey = useCallback(
    (e) => {
      if (e.key === "ArrowRight") {
        setHIndex((p) => (p - 1 + horizontalCount) % horizontalCount); // swapped
        setLastMoveDir("x");
      }
      if (e.key === "ArrowLeft") {
        setHIndex((p) => (p + 1) % horizontalCount); // swapped
        setLastMoveDir("x");
      }
      if (e.key === "ArrowUp") {
        setVIndex((p) => (p - 1 + verticalCount) % verticalCount);
        setLastMoveDir("y");
      }
      if (e.key === "ArrowDown") {
        setVIndex((p) => (p + 1) % verticalCount);
        setLastMoveDir("y");
      }
    },
    [horizontalCount, verticalCount]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // arrow scroll (with diagonal remap fix)
  const startScrolling = (dir) => {
    stopScrolling();
    setActiveArrow(dir);
    scrollInterval.current = setInterval(() => {
      if (dir === "left") {
        setHIndex((p) => (p + 1) % horizontalCount); // swapped
        setLastMoveDir("x");
      }
      if (dir === "right") {
        setHIndex((p) => (p - 1 + horizontalCount) % horizontalCount); // swapped
        setLastMoveDir("x");
      }
      if (dir === "up") {
        setVIndex((p) => (p - 1 + verticalCount) % verticalCount);
        setLastMoveDir("y");
      }
      if (dir === "down") {
        setVIndex((p) => (p + 1) % verticalCount);
        setLastMoveDir("y");
      }

      // diagonals remap
      if (dir === "down-right") {
        // behave like top-right
        setDrIndex((p) => (p - 1 + dCount) % dCount);
        setHIndex((p) => (p + 1) % horizontalCount);
        setVIndex((p) => (p - 1 + verticalCount) % verticalCount);
        setLastMoveDir("dr");
      }
      if (dir === "down-left") {
        // behave like bottom-left
        setDlIndex((p) => (p + 1) % dCount);
        setHIndex((p) => (p - 1 + horizontalCount) % horizontalCount);
        setVIndex((p) => (p + 1) % verticalCount);
        setLastMoveDir("dl");
      }
      if (dir === "up-left") {
        // behave like bottom-right
        setDrIndex((p) => (p + 1) % dCount);
        setHIndex((p) => (p + 1) % horizontalCount);
        setVIndex((p) => (p + 1) % verticalCount);
        setLastMoveDir("dr");
      }
      if (dir === "up-right") {
        // behave like top-left
        setDlIndex((p) => (p - 1 + dCount) % dCount);
        setHIndex((p) => (p - 1 + horizontalCount) % horizontalCount);
        setVIndex((p) => (p - 1 + verticalCount) % verticalCount);
        setLastMoveDir("dl");
      }
    }, 20);
  };

  const stopScrolling = () => {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    scrollInterval.current = null;
    setActiveArrow(null);
  };

  // (drag + momentum code same as before — unchanged)

  const applyMomentum = () => {
    if (!dragging.current) {
      velocityX.current *= momentumFactor;
      velocityY.current *= momentumFactor;
      if (Math.abs(velocityX.current) < snapThreshold) velocityX.current = 0;
      if (Math.abs(velocityY.current) < snapThreshold) velocityY.current = 0;
      if (velocityX.current !== 0) {
        setHIndex(
          (p) =>
            (p + Math.round(velocityX.current) + horizontalCount) %
            horizontalCount
        );
        setLastMoveDir("x");
      }
      if (velocityY.current !== 0) {
        setVIndex(
          (p) =>
            (p + Math.round(velocityY.current) + verticalCount) % verticalCount
        );
        setLastMoveDir("y");
      }
      if (velocityX.current !== 0 || velocityY.current !== 0)
        momentumFrame.current = requestAnimationFrame(applyMomentum);
    }
  };

  const handleDragStart = (x, y) => {
    dragging.current = true;
    lastX.current = x;
    lastY.current = y;
    cancelAnimationFrame(momentumFrame.current);
  };
  const handleDragMove = (x, y) => {
    if (!dragging.current) return;
    const dx = x - lastX.current,
      dy = y - lastY.current;
    velocityX.current = dx * sensitivity;
    velocityY.current = dy * sensitivity;
    lastX.current = x;
    lastY.current = y;

    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      setHIndex(
        (p) =>
          (p - Math.round(dx * sensitivity) + horizontalCount) % horizontalCount
      );
      setLastMoveDir("x");
    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      setVIndex(
        (p) =>
          (p + Math.round(dy * sensitivity) + verticalCount) % verticalCount
      );
      setLastMoveDir("y");
    }
  };
  const handleDragEnd = () => {
    dragging.current = false;
    momentumFrame.current = requestAnimationFrame(applyMomentum);
  };

  const handleMouseDown = (e) => handleDragStart(e.clientX, e.clientY);
  const handleMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
  const handleMouseUp = () => handleDragEnd();
  const handleTouchStart = (e) => {
    if (e.touches.length === 1)
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  };
  const handleTouchEnd = () => handleDragEnd();

  const currentSrc =
    lastMoveDir === "x"
      ? hPath(hIndex)
      : lastMoveDir === "y"
      ? vPath(vIndex)
      : lastMoveDir === "dl"
      ? dlPath(dlIndex)
      : drPath(drIndex);

  const arrowStyle = (dir) => {
    const size = isMobile ? 35 : 28,
      edge = 8;
    let base = {
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
      userSelect: "none",
      WebkitUserSelect: "none",
      WebkitTouchCallout: "none",
      touchAction: "none",
      transition: "all 0.2s ease",
      zIndex: 20,
      boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
    };
    if (dir === "left")
      return { ...base, left: edge, top: "50%", transform: "translate(0,-50%)" };
    if (dir === "right")
      return { ...base, right: edge, top: "50%", transform: "translate(0,-50%)" };
    if (dir === "up")
      return { ...base, top: edge, left: "50%", transform: "translate(-50%,0)" };
    if (dir === "down")
      return { ...base, bottom: edge, left: "50%", transform: "translate(-50%,0)" };
    if (dir === "up-left") return { ...base, top: edge, left: edge };
    if (dir === "up-right") return { ...base, top: edge, right: edge };
    if (dir === "down-left") return { ...base, bottom: edge, left: edge };
    if (dir === "down-right") return { ...base, bottom: edge, right: edge };
    return base;
  };

  return (
    <>
      {firstLoaded && (
        <div
          style={{
            width: "100%",
            maxWidth: width,
            aspectRatio: "1/1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#000",
            overflow: "hidden",
            position: "relative",
            margin: "0 auto",
            touchAction: "none",
          }}
          onClick={stopScrolling}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
          {[
            "left",
            "right",
            "up",
            "down",
            "up-left",
            "up-right",
            "down-left",
            "down-right",
          ].map((dir) => (
            <button
              key={dir}
              onMouseDown={(e) => {
                e.stopPropagation();
                startScrolling(dir);
              }}
              onMouseUp={stopScrolling}
              onMouseLeave={stopScrolling}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                startScrolling(dir);
              }}
              onTouchEnd={stopScrolling}
              onContextMenu={(e) => e.preventDefault()}
              style={arrowStyle(dir)}
            >
              {dir === "left"
                ? "←"
                : dir === "right"
                ? "→"
                : dir === "up"
                ? "↑"
                : dir === "down"
                ? "↓"
                : dir === "up-left"
                ? "↖"
                : dir === "up-right"
                ? "↗"
                : dir === "down-left"
                ? "↙"
                : "↘"}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
