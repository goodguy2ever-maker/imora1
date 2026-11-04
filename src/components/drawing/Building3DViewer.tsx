import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sun, Layers, MapPin, ZoomIn, ZoomOut, Maximize2, Minimize2, Box } from 'lucide-react';
import { CELL_M, CELL_PX, DRAWING_WIDTH, DRAWING_HEIGHT } from '@/lib/drawing';
import { formatMoney } from '@/lib/format';
import type { DrawingData, EstimateMarker } from '@/lib/types';

interface Building3DViewerProps {
  data: DrawingData;
  drawingName: string;
  currency: string;
  projectName?: string;
  onMarkerClick?: (marker: EstimateMarker) => void;
}

export default function Building3DViewer({
  data,
  drawingName,
  currency,
  projectName,
  onMarkerClick,
}: Building3DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 3D Camera & Orbit State
  const [rotationX, setRotationX] = useState(55); // Elevation angle (deg)
  const [rotationZ, setRotationZ] = useState(45); // Azimuth angle (deg)
  const [zoom, setZoom] = useState(0.85);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  // Display toggles
  const [wallHeightM, setWallHeightM] = useState(3.0); // 1.2m slice or 3.0m full
  const [showMarkers, setShowMarkers] = useState(true);
  const [lightingMode, setLightingMode] = useState<'day' | 'sunset' | 'blueprint'>('day');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<EstimateMarker | null>(null);

  // Drag interaction refs
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; rotX: number; rotZ: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    rotX: 55,
    rotZ: 45,
    panX: 0,
    panY: 0,
  });

  const markers = useMemo(() => data.markers ?? [], [data.markers]);
  const walls = useMemo(() => data.walls ?? [], [data.walls]);

  // Reset Camera
  function resetCamera() {
    setRotationX(55);
    setRotationZ(45);
    setZoom(0.85);
    setPanX(0);
    setPanY(0);
  }

  // 3D Projection math
  // World space: X = width, Y = depth, Z = height (upwards)
  const project = useCallback((x: number, y: number, z: number, width: number, height: number) => {
    // Center at midpoint of drawing
    const cx = DRAWING_WIDTH / 2;
    const cy = DRAWING_HEIGHT / 2;

    const dx = (x - cx) * zoom;
    const dy = (y - cy) * zoom;
    const dz = z * zoom;

    const radZ = (rotationZ * Math.PI) / 180;
    const radX = (rotationX * Math.PI) / 180;

    // Rotate around Z axis (Azimuth)
    const rx = dx * Math.cos(radZ) - dy * Math.sin(radZ);
    const ry = dx * Math.sin(radZ) + dy * Math.cos(radZ);

    // Rotate around X axis (Elevation / Tilt)
    const px = rx + panX;
    const py = (ry * Math.cos(radX) - dz * Math.sin(radX)) + panY;

    // Screen coordinates
    return {
      x: width / 2 + px,
      y: height / 2 + py,
      depth: ry * Math.sin(radX) + dz * Math.cos(radX), // For Z-sorting
    };
  }, [zoom, rotationZ, rotationX, panX, panY]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    function render() {
      if (!canvas || !ctx) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background theme
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (lightingMode === 'day') {
        bgGrad.addColorStop(0, '#090d16');
        bgGrad.addColorStop(1, '#0f172a');
      } else if (lightingMode === 'sunset') {
        bgGrad.addColorStop(0, '#1a0f1e');
        bgGrad.addColorStop(1, '#0f172a');
      } else {
        bgGrad.addColorStop(0, '#021329');
        bgGrad.addColorStop(1, '#062040');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Height in pixel scale (1m = (CELL_PX / CELL_M) px = 40px)
      const pxPerMeter = CELL_PX / CELL_M;
      const wallH = wallHeightM * pxPerMeter;

      // 1. Draw 3D Foundation Slab
      const pad = 40;
      const f0 = project(-pad, -pad, 0, width, height);
      const f1 = project(DRAWING_WIDTH + pad, -pad, 0, width, height);
      const f2 = project(DRAWING_WIDTH + pad, DRAWING_HEIGHT + pad, 0, width, height);
      const f3 = project(-pad, DRAWING_HEIGHT + pad, 0, width, height);

      ctx.beginPath();
      ctx.moveTo(f0.x, f0.y);
      ctx.lineTo(f1.x, f1.y);
      ctx.lineTo(f2.x, f2.y);
      ctx.lineTo(f3.x, f3.y);
      ctx.closePath();
      ctx.fillStyle = lightingMode === 'sunset' ? '#1e1b2e' : '#131d31';
      ctx.fill();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Floor grid lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 0.8;
      for (let x = 0; x <= DRAWING_WIDTH; x += CELL_PX * 4) {
        const pA = project(x, 0, 0, width, height);
        const pB = project(x, DRAWING_HEIGHT, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }
      for (let y = 0; y <= DRAWING_HEIGHT; y += CELL_PX * 4) {
        const pA = project(0, y, 0, width, height);
        const pB = project(DRAWING_WIDTH, y, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(pB.x, pB.y);
        ctx.stroke();
      }

      // 2. Extrude and Render 3D Walls
      // Wall thickness
      const th = 6;

      // Sort walls back-to-front based on projected depth
      const sortedWalls = [...walls].map((w, idx) => {
        const x1 = w.x1 * CELL_PX;
        const y1 = w.y1 * CELL_PX;
        const x2 = w.x2 * CELL_PX;
        const y2 = w.y2 * CELL_PX;
        const mid = project((x1 + x2) / 2, (y1 + y2) / 2, wallH / 2, width, height);
        return { w, x1, y1, x2, y2, depth: mid.depth, idx };
      });
      sortedWalls.sort((a, b) => a.depth - b.depth);

      sortedWalls.forEach(({ x1, y1, x2, y2 }) => {
        // Calculate normal for thickness
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * th;
        const ny = (dx / len) * th;

        // Bottom polygon (foundation level)
        const b0 = project(x1 - nx, y1 - ny, 0, width, height);
        const b1 = project(x2 - nx, y2 - ny, 0, width, height);
        const b2 = project(x2 + nx, y2 + ny, 0, width, height);
        const b3 = project(x1 + nx, y1 + ny, 0, width, height);

        // Top polygon (ceiling level)
        const t0 = project(x1 - nx, y1 - ny, wallH, width, height);
        const t1 = project(x2 - nx, y2 - ny, wallH, width, height);
        const t2 = project(x2 + nx, y2 + ny, wallH, width, height);
        const t3 = project(x1 + nx, y1 + ny, wallH, width, height);

        // Wall colors
        const sideColorA = lightingMode === 'sunset' ? '#4a3b32' : '#334155';
        const sideColorB = lightingMode === 'sunset' ? '#5a463c' : '#475569';
        const topColor = lightingMode === 'sunset' ? '#e2d5c8' : '#e2e8f0';

        // Side Face 1
        ctx.beginPath();
        ctx.moveTo(b0.x, b0.y);
        ctx.lineTo(b1.x, b1.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineTo(t0.x, t0.y);
        ctx.closePath();
        ctx.fillStyle = sideColorA;
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Side Face 2
        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.closePath();
        ctx.fillStyle = sideColorB;
        ctx.fill();
        ctx.stroke();

        // Side Face 3
        ctx.beginPath();
        ctx.moveTo(b2.x, b2.y);
        ctx.lineTo(b3.x, b3.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.closePath();
        ctx.fillStyle = sideColorA;
        ctx.fill();
        ctx.stroke();

        // Top Face (Roof Cap)
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t3.x, t3.y);
        ctx.closePath();
        ctx.fillStyle = topColor;
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // 3. Render 3D Floating Estimate Pins
      if (showMarkers) {
        markers.forEach((m, idx) => {
          const mx = m.x * CELL_PX;
          const my = m.y * CELL_PX;
          const basePt = project(mx, my, 0, width, height);
          const pinPt = project(mx, my, wallH + 28, width, height);

          // Dotted stem from floor to pin
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.moveTo(basePt.x, basePt.y);
          ctx.lineTo(pinPt.x, pinPt.y);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          // Floor shadow circle
          ctx.beginPath();
          ctx.ellipse(basePt.x, basePt.y, 6 * zoom, 3 * zoom, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
          ctx.fill();

          // 3D Pin Head (amber glowing pill)
          const isSel = selectedMarker?.id === m.id;
          const pinRadius = isSel ? 14 : 11;

          ctx.beginPath();
          ctx.arc(pinPt.x, pinPt.y, pinRadius, 0, Math.PI * 2);
          ctx.fillStyle = isSel ? '#f59e0b' : '#d97706';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Pin number
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(idx + 1), pinPt.x, pinPt.y);

          // Floating Price Tag
          const label = `${m.title} · ${formatMoney(m.total_price, currency)}`;
          ctx.font = '600 10.5px sans-serif';
          const textMetrics = ctx.measureText(label);
          const tagW = textMetrics.width + 16;
          const tagH = 20;
          const tagX = pinPt.x + 14;
          const tagY = pinPt.y - 10;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.strokeStyle = isSel ? '#fbbf24' : '#475569';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(tagX, tagY, tagW, tagH, 5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isSel ? '#fef08a' : '#f1f5f9';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, tagX + 8, tagY + tagH / 2);
        });
      }

      // Compass Rose in bottom-left
      const compX = 50;
      const compY = height - 50;
      const compRad = (rotationZ * Math.PI) / 180;
      const compLen = 22;

      ctx.save();
      ctx.translate(compX, compY);
      // North arrow
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-Math.sin(compRad) * compLen, -Math.cos(compRad) * compLen);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', -Math.sin(compRad) * (compLen + 8), -Math.cos(compRad) * (compLen + 8));

      ctx.restore();
    }

    render();
  }, [project, currency, rotationX, rotationZ, zoom, panX, panY, wallHeightM, showMarkers, lightingMode, walls, markers, selectedMarker]);

  // Mouse Handlers for 3D Orbit & Pan
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotX: rotationX,
      rotZ: rotationZ,
      panX,
      panY,
    };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    if (e.shiftKey || e.button === 1) {
      // Pan mode
      setPanX(dragStartRef.current.panX + deltaX);
      setPanY(dragStartRef.current.panY + deltaY);
    } else {
      // Orbit rotation mode
      setRotationZ((dragStartRef.current.rotZ + deltaX * 0.4) % 360);
      setRotationX(Math.max(10, Math.min(85, dragStartRef.current.rotX - deltaY * 0.4)));
    }
  }

  function handleMouseUp() {
    isDraggingRef.current = false;
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.3, Math.min(2.5, z * factor)));
  }

  const totalSum = markers.reduce((acc, m) => acc + (m.total_price || 0), 0);

  return (
    <div
      className={`relative flex flex-col rounded-xl border border-slate-800 bg-slate-950 overflow-hidden select-none ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'w-full h-[620px]'
      }`}
    >
      {/* 3D Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="block w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Controls HUD */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none flex-wrap gap-2">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl">
          <Box className="h-4 w-4 text-sky-400" />
          <span className="text-xs font-semibold text-white">{projectName ? `${projectName} · ` : ''}{drawingName}</span>
          <span className="text-xs text-slate-400">· 3D Объемная модель</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/85 backdrop-blur-md border border-slate-700/80 p-1 rounded-lg shadow-xl">
          {/* Wall height mode toggle */}
          <button
            onClick={() => setWallHeightM((h) => (h >= 3.0 ? 1.2 : 3.0))}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              wallHeightM < 3.0 ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
            title="Переключить срез стен (1.2м план / 3.0м полная высота)"
          >
            <Layers className="h-3.5 w-3.5" />
            {wallHeightM < 3.0 ? 'Срез (1.2м)' : 'Стены (3.0м)'}
          </button>

          {/* Lighting Mode */}
          <button
            onClick={() =>
              setLightingMode((m) => (m === 'day' ? 'sunset' : m === 'sunset' ? 'blueprint' : 'day'))
            }
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-300 hover:text-white transition"
            title="Сменить освещение (День / Закат / Blueprint)"
          >
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            {lightingMode === 'day' ? 'День' : lightingMode === 'sunset' ? 'Закат' : 'Сетка'}
          </button>

          {/* Show markers toggle */}
          <button
            onClick={() => setShowMarkers(!showMarkers)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition ${
              showMarkers ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Вкл/Выкл сметные маркеры на 3D модели"
          >
            <MapPin className="h-3.5 w-3.5" />
            {showMarkers ? 'Смета вкл' : 'Смета выкл'}
          </button>

          {/* Zoom In / Out */}
          <button
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            title="Приблизить"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            title="Отдалить"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Reset Orbit */}
          <button
            onClick={resetCamera}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            title="Сбросить угол камеры"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-slate-400 hover:text-white transition"
            title="Во весь экран"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {markers.length > 0 && <div className="absolute left-3 top-16 max-w-xs"><label className="text-xs text-slate-300">Сметный маркер<select className="block w-full rounded bg-slate-900 p-2" value={selectedMarker?.id ?? ''} onChange={e => { const marker = markers.find(m => m.id === e.target.value) ?? null; setSelectedMarker(marker); if (marker) onMarkerClick?.(marker); }}><option value="">Не выбран</option>{markers.map(m => <option key={m.id} value={m.id}>{m.title} · {formatMoney(m.total_price, currency)}</option>)}</select></label></div>}
      {/* Bottom Floating Stats Pill */}
      <div className="absolute bottom-3 right-3 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl shadow-xl flex items-center gap-4 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px]">Стен в модели:</span>
          <span className="font-bold text-white">{walls.length} шт</span>
        </div>
        <div className="h-6 w-px bg-slate-700" />
        <div>
          <span className="text-slate-400 block text-[10px]">Сметных маркеров:</span>
          <span className="font-bold text-amber-300">{markers.length} шт</span>
        </div>
        <div className="h-6 w-px bg-slate-700" />
        <div>
          <span className="text-slate-400 block text-[10px]">Стоимость по смете:</span>
          <span className="font-bold text-emerald-400">{formatMoney(totalSum, currency)}</span>
        </div>
      </div>

      {/* Bottom Left Hint */}
      <div className="absolute bottom-3 left-3 pointer-events-none text-[11px] text-slate-500 bg-slate-950/70 px-2.5 py-1 rounded-md border border-slate-800">
        Зажмите левую кнопку мыши для вращения · Колесо мыши: Zoom · Shift+мышь: Перемещение
      </div>
    </div>
  );
}
