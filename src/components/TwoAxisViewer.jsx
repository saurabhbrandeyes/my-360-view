"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";

function pad(n, len = 5) { return String(n).padStart(len, "0"); }

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
  const [isMobile, setIsMobile] = useState(false);
  const [activeArrow, setActiveArrow] = useState(null);

  const [loadedCount, setLoadedCount] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);

  const scrollInterval = useRef(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // Momentum
  const velocityX = useRef(0);
  const velocityY = useRef(0);
  const momentumFrame = useRef(null);

  const sensitivity = 0.5;
  const momentumFactor = 0.92; // friction
  const snapThreshold = 0.5; // minimum speed before snapping
  const totalImages = horizontalCount + verticalCount;

  useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  // Resolve vertical base
  useEffect(() => {
    let mounted = true;
    const tryBase = async (base) => {
      const img = new Image();
      return new Promise(resolve => {
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

  // Preload images
  useEffect(() => {
    if (!resolvedVBase) return;
    let loaded = 0;
    const loadImage = (src) => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });

    const preload = async () => {
      for (let i = 0; i < horizontalCount; i++) { await loadImage(`/images/horizontal/${hBase}${pad(i)}.${fileExt}`); loaded++; setLoadedCount(loaded); }
      for (let i = 0; i < verticalCount; i++) { await loadImage(`/images/vertical/${resolvedVBase}${pad(i)}.${fileExt}`); loaded++; setLoadedCount(loaded); }
      setAllLoaded(true);
    };
    preload();
  }, [resolvedVBase, hBase, fileExt, horizontalCount, verticalCount]);

  // Keyboard navigation
  const handleKey = useCallback((e) => {
    if (e.key === "ArrowRight") { setHIndex((prev) => (prev + 1) % horizontalCount); setLastMoveDir("x"); }
    if (e.key === "ArrowLeft") { setHIndex((prev) => (prev - 1 + horizontalCount) % horizontalCount); setLastMoveDir("x"); }
    if (e.key === "ArrowUp") { setVIndex((prev) => (prev - 1 + verticalCount) % verticalCount); setLastMoveDir("y"); }
    if (e.key === "ArrowDown") { setVIndex((prev) => (prev + 1) % verticalCount); setLastMoveDir("y"); }
  }, [horizontalCount, verticalCount]);
  useEffect(() => { window.addEventListener("keydown", handleKey); return () => window.removeEventListener("keydown", handleKey); }, [handleKey]);

  // Arrow scroll
  const startScrolling = (dir) => {
    stopScrolling();
    setActiveArrow(dir);
    scrollInterval.current = setInterval(() => {
      if (dir === "left") { setHIndex(prev => (prev - 1 + horizontalCount) % horizontalCount); setLastMoveDir("x"); }
      if (dir === "right") { setHIndex(prev => (prev + 1) % horizontalCount); setLastMoveDir("x"); }
      if (dir === "up") { setVIndex(prev => (prev - 1 + verticalCount) % verticalCount); setLastMoveDir("y"); }
      if (dir === "down") { setVIndex(prev => (prev + 1) % verticalCount); setLastMoveDir("y"); }
    }, 20);
  };
  const stopScrolling = () => { if(scrollInterval.current) clearInterval(scrollInterval.current); scrollInterval.current=null; setActiveArrow(null); };

  const hPath = (i) => `/images/horizontal/${hBase}${pad(i)}.${fileExt}`;
  const vPath = (i) => `/images/vertical/${resolvedVBase}${pad(i)}.${fileExt}`;
  const currentSrc = lastMoveDir === "x" ? hPath(hIndex) : vPath(vIndex);

  const arrowStyle = (dir) => {
    const size = isMobile ? 35 : 28;
    const edgeOffset = 8;
    let transform = "translate(-50%, -50%)";
    if (dir === "left") transform = "translate(0, -50%)";
    if (dir === "right") transform = "translate(0, -50%)";
    if (dir === "up") transform = "translate(-50%, 0)";
    if (dir === "down") transform = "translate(-50%, 0)";
    return {
      position: "absolute", width: size, height: size, fontSize: size*0.6, display: activeArrow && activeArrow!==dir?"none":"flex",
      alignItems:"center",justifyContent:"center",color:"#fff",background:"linear-gradient(135deg,#1a73e8,#4285f4)",
      border:"none",borderRadius:"50%",cursor:"pointer",
      userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none", touchAction:"none",
      top: dir==="up"?edgeOffset:dir==="down"?"auto":"50%",
      bottom: dir==="down"?edgeOffset:"auto",
      left: dir==="left"?edgeOffset:dir==="right"?"auto":"50%",
      right: dir==="right"?edgeOffset:"auto",
      transform, transition:"all 0.2s ease", zIndex:20, boxShadow:"0 4px 8px rgba(0,0,0,0.3)"
    };
  };

  // Momentum + snap
  const applyMomentum = () => {
    if(!dragging.current){
      velocityX.current *= momentumFactor;
      velocityY.current *= momentumFactor;

      // Snap to nearest frame when velocity is low
      if(Math.abs(velocityX.current)<snapThreshold) velocityX.current=0;
      if(Math.abs(velocityY.current)<snapThreshold) velocityY.current=0;

      if(velocityX.current !== 0){
        setHIndex(prev => (prev + Math.round(velocityX.current) + horizontalCount)%horizontalCount);
        setLastMoveDir("x");
      }
      if(velocityY.current !== 0){
        setVIndex(prev => (prev + Math.round(velocityY.current) + verticalCount)%verticalCount);
        setLastMoveDir("y");
      }

      if(velocityX.current!==0 || velocityY.current!==0){
        momentumFrame.current = requestAnimationFrame(applyMomentum);
      }
    }
  };

  // Drag
  const handleDragStart = (x,y)=>{
    dragging.current=true;
    lastX.current=x; lastY.current=y;
    cancelAnimationFrame(momentumFrame.current);
  };
  const handleDragMove = (x,y)=>{
    if(!dragging.current) return;
    const dx = x-lastX.current;
    const dy = y-lastY.current;
    setHIndex(prev=>(prev+Math.round(dx*sensitivity)+horizontalCount)%horizontalCount);
    setVIndex(prev=>(prev+Math.round(dy*sensitivity)+verticalCount)%verticalCount);
    setLastMoveDir(Math.abs(dx)>Math.abs(dy)?"x":"y");
    velocityX.current=dx*sensitivity; velocityY.current=dy*sensitivity;
    lastX.current=x; lastY.current=y;
  };
  const handleDragEnd = ()=>{
    dragging.current=false;
    momentumFrame.current=requestAnimationFrame(applyMomentum);
  };

  const handleMouseDown=(e)=>{handleDragStart(e.clientX,e.clientY);};
  const handleMouseMove=(e)=>{handleDragMove(e.clientX,e.clientY);};
  const handleMouseUp=()=>{handleDragEnd();};
  const handleTouchStart=(e)=>{if(e.touches.length===1) handleDragStart(e.touches[0].clientX,e.touches[0].clientY);};
  const handleTouchMove=(e)=>{if(e.touches.length===1){ handleDragMove(e.touches[0].clientX,e.touches[0].clientY); e.preventDefault(); }};
  const handleTouchEnd=()=>{handleDragEnd();};

  return (
    <>
      {!allLoaded && <div style={{position:"fixed",inset:0,background:"radial-gradient(circle at center,#111 0%,#000 100%)",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:9999,color:"#fff",fontSize:20}}>
        <div className="loader-ring"></div>
        <div style={{marginTop:20}}>{Math.round((loadedCount/totalImages)*100)}%</div>
        <style jsx>{`.loader-ring{width:80px;height:80px;border:8px solid rgba(255,255,255,0.2);border-top:8px solid #1a73e8;border-radius:50%;animation:spin 1s linear infinite;position:relative}.loader-ring::after{content:"";position:absolute;top:-16px;left:-16px;width:112px;height:112px;border:8px dashed rgba(255,255,255,0.2);border-radius:50%;animation:spin 2s linear reverse infinite}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>}

      <div style={{width:"100%",maxWidth:width,aspectRatio:"1/1",display:"flex",alignItems:"center",justifyContent:"center",
        background:"#000",overflow:"hidden",position:"relative",margin:"0 auto",touchAction:"none"}}
        onClick={stopScrolling} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {allLoaded && <img src={currentSrc} alt="360 viewer" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain",pointerEvents:"none",userSelect:"none"}} draggable={false}/>}

        {allLoaded && ["left","right","up","down"].map(dir=>(
          <button key={dir} 
            onMouseDown={e=>{e.stopPropagation(); startScrolling(dir)}}
            onMouseUp={stopScrolling} onMouseLeave={stopScrolling}
            onTouchStart={e=>{e.stopPropagation();e.preventDefault(); startScrolling(dir)}}
            onTouchEnd={stopScrolling}
            onContextMenu={e=>e.preventDefault()}
            style={arrowStyle(dir)}>
              {dir==="left"?"←":dir==="right"?"→":dir==="up"?"↑":"↓"}
          </button>
        ))}
      </div>
    </>
  );
}
