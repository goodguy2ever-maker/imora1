import { useEffect, useState, type FormEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Eraser, Ruler, Save, Type, Undo2, MapPin, Trash2, Box, type LucideIcon } from 'lucide-react';
import Building3DViewer from '@/components/drawing/Building3DViewer';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/useAuth';
import Link from '@/components/Link';
import { Alert, Button, Card, Field, Input, Modal, PageHeader, Select, Spinner } from '@/components/ui';
import {
  CELL_M,
  CELL_PX,
  DRAWING_HEIGHT,
  DRAWING_WIDTH,
  GRID_COLS,
  GRID_ROWS,
  clampCell,
  formatMeters,
  parseDrawingData,
  totalWallLengthM,
  wallLengthM,
} from '@/lib/drawing';
import { errorMessage, formatDate, formatMoney } from '@/lib/format';
import { canEditEstimates, type Drawing, type DrawingData, type EstimateMarker } from '@/lib/types';

type Tool = 'wall' | 'label' | 'marker' | 'erase';
type Point = { x: number; y: number };

const TOOLS: { id: Tool; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'wall', label: 'Стена', icon: Ruler, hint: 'Протяните мышью, чтобы нарисовать стену' },
  { id: 'label', label: 'Подпись', icon: Type, hint: 'Нажмите на поле, чтобы добавить подпись' },
  { id: 'marker', label: 'Метка сметы', icon: MapPin, hint: 'Кликните на чертеже (комната / стена), чтобы привязать позицию сметы' },
  { id: 'erase', label: 'Удалить', icon: Eraser, hint: 'Нажмите на объект, чтобы удалить его' },
];

const PRESET_WORKS = [
  { title: 'Штукатурка стен по маякам', unit: 'м²', price: 3200, category: 'labor' as const },
  { title: 'Стяжка пола армированная', unit: 'м²', price: 2800, category: 'labor' as const },
  { title: 'Монтаж перегородок из ГКЛ', unit: 'м²', price: 4500, category: 'labor' as const },
  { title: 'Укладка керамогранита', unit: 'м²', price: 5500, category: 'labor' as const },
  { title: 'Разводка электропроводки', unit: 'точка', price: 3500, category: 'materials' as const },
  { title: 'Монтаж оконных блоков', unit: 'шт', price: 42000, category: 'equipment' as const },
  { title: 'Сантехническая разводка', unit: 'точка', price: 8000, category: 'materials' as const },
];

function toCell(event: { clientX: number; clientY: number; currentTarget: SVGSVGElement }): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * DRAWING_WIDTH / CELL_PX;
  const y = ((event.clientY - rect.top) / rect.height) * DRAWING_HEIGHT / CELL_PX;
  return { x: clampCell(x, GRID_COLS), y: clampCell(y, GRID_ROWS) };
}

function straightWallEnd(start: Point, end: Point): Point {
  return Math.abs(end.x - start.x) >= Math.abs(end.y - start.y) ? { x: end.x, y: start.y } : { x: start.x, y: end.y };
}

function shortenTitle(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function DrawingEditorPage({ drawingId }: { drawingId: string }) {
  const { access } = useAuth();
  const canEdit = access?.role ? canEditEstimates(access.role) : false;

  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectCurrency, setProjectCurrency] = useState('RUB');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [data, setData] = useState<DrawingData>({ walls: [], labels: [], markers: [] });
  const [undoStack, setUndoStack] = useState<DrawingData[]>([]);
  const [tool, setTool] = useState<Tool>('wall');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [draftWall, setDraftWall] = useState<{ start: Point; end: Point } | null>(null);
  
  // Label modal
  const [labelAt, setLabelAt] = useState<Point | null>(null);
  const [labelText, setLabelText] = useState('');

  // Estimate Marker modal & state
  const [markerAt, setMarkerAt] = useState<Point | null>(null);
  const [editingMarker, setEditingMarker] = useState<EstimateMarker | null>(null);
  const [markerTitle, setMarkerTitle] = useState('');
  const [markerRoom, setMarkerRoom] = useState('');
  const [markerQty, setMarkerQty] = useState('1');
  const [markerUnit, setMarkerUnit] = useState('м²');
  const [markerUnitPrice, setMarkerUnitPrice] = useState('3000');
  const [markerCategory, setMarkerCategory] = useState<'materials' | 'labor' | 'equipment' | 'other'>('labor');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: row, error: qErr } = await supabase
        .from('drawings')
        .select('id,project_id,name,data,updated_at')
        .eq('id', drawingId)
        .maybeSingle();
      if (!active) return;
      if (qErr) {
        setLoadError(errorMessage(qErr));
        setLoading(false);
        return;
      }
      if (!row) {
        setLoadError('Чертёж не найден или у вас нет к нему доступа.');
        setLoading(false);
        return;
      }
      const loaded = row as Drawing;
      setDrawing(loaded);
      setData(parseDrawingData(loaded.data));
      const { data: project, error: projectError } = await supabase.from('projects').select('name,currency').eq('id', loaded.project_id).maybeSingle();
      if (!active) return;
      if (projectError || !project) { setLoadError('Не удалось загрузить валюту проекта. Обновите страницу.'); setLoading(false); return; }
      setProjectName(project.name);
      setProjectCurrency(project.currency);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [drawingId]);

  function commit(next: DrawingData) {
    setUndoStack((stack) => [...stack, data]);
    setData(next);
    setDirty(true);
    setSaveError('');
  }

  function undo() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack(undoStack.slice(0, -1));
    setData(previous);
    setDirty(true);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (!canEdit || tool !== 'wall') return;
    const point = toCell(event);
    setDraftWall({ start: point, end: point });
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draftWall) return;
    setDraftWall({ ...draftWall, end: toCell(event) });
  }

  function handlePointerUp() {
    if (!draftWall) return;
    const end = straightWallEnd(draftWall.start, draftWall.end);
    const { start } = draftWall;
    setDraftWall(null);
    if (start.x === end.x && start.y === end.y) return;
    commit({ ...data, walls: [...data.walls, { x1: start.x, y1: start.y, x2: end.x, y2: end.y }] });
  }

  function handleCanvasClick(event: ReactMouseEvent<SVGSVGElement>) {
    if (!canEdit) return;
    if (tool === 'label') {
      setLabelAt(toCell(event));
      setLabelText('');
    } else if (tool === 'marker') {
      const pt = toCell(event);
      setMarkerAt(pt);
      setEditingMarker(null);
      // Defaults
      setMarkerTitle(PRESET_WORKS[0].title);
      setMarkerUnit(PRESET_WORKS[0].unit);
      setMarkerUnitPrice(String(PRESET_WORKS[0].price));
      setMarkerCategory(PRESET_WORKS[0].category);
      setMarkerQty('15');
      setMarkerRoom('Комната 1');
    }
  }

  function saveLabel(event: FormEvent) {
    event.preventDefault();
    const text = labelText.trim();
    if (!labelAt || !text) return;
    commit({ ...data, labels: [...data.labels, { x: labelAt.x, y: labelAt.y, text }] });
    setLabelAt(null);
  }

  function saveMarker(event: FormEvent) {
    event.preventDefault();
    if (!markerTitle.trim()) return;
    const qty = Math.max(0.1, parseFloat(markerQty) || 1);
    const price = Math.max(0, parseFloat(markerUnitPrice) || 0);
    const total = qty * price;

    if (editingMarker) {
      // Update existing
      const updatedMarkers = (data.markers ?? []).map((m) =>
        m.id === editingMarker.id
          ? {
              ...m,
              title: markerTitle.trim(),
              room_name: markerRoom.trim() || undefined,
              quantity: qty,
              unit: markerUnit.trim() || 'м²',
              unit_price: price,
              total_price: total,
              category: markerCategory,
            }
          : m
      );
      commit({ ...data, markers: updatedMarkers });
      setEditingMarker(null);
    } else if (markerAt) {
      // Create new
      const newMarker: EstimateMarker = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: markerAt.x,
        y: markerAt.y,
        title: markerTitle.trim(),
        room_name: markerRoom.trim() || undefined,
        quantity: qty,
        unit: markerUnit.trim() || 'м²',
        unit_price: price,
        total_price: total,
        category: markerCategory,
        status: 'planned',
      };
      commit({ ...data, markers: [...(data.markers ?? []), newMarker] });
      setMarkerAt(null);
    }
  }

  function removeWall(index: number) {
    if (!canEdit || tool !== 'erase') return;
    commit({ ...data, walls: data.walls.filter((_, i) => i !== index) });
  }

  function removeLabel(index: number) {
    if (!canEdit || tool !== 'erase') return;
    commit({ ...data, labels: data.labels.filter((_, i) => i !== index) });
  }

  function removeMarker(id: string) {
    if (!canEdit) return;
    commit({ ...data, markers: (data.markers ?? []).filter((m) => m.id !== id) });
    if (selectedMarkerId === id) setSelectedMarkerId(null);
  }

  function openEditMarker(m: EstimateMarker) {
    setEditingMarker(m);
    setMarkerTitle(m.title);
    setMarkerRoom(m.room_name ?? '');
    setMarkerQty(String(m.quantity));
    setMarkerUnit(m.unit);
    setMarkerUnitPrice(String(m.unit_price));
    setMarkerCategory(m.category ?? 'labor');
  }

  async function save() {
    if (!drawing) return;
    setSaving(true);
    setSaveError('');
    const { error: updErr } = await supabase.from('drawings').update({ data }).eq('id', drawing.id);
    setSaving(false);
    if (updErr) setSaveError(errorMessage(updErr));
    else setDirty(false);
  }

  if (loading) return <Spinner />;
  if (loadError || !drawing) return <Alert tone="error">{loadError || 'Чертёж не найден.'}</Alert>;

  const draftEnd = draftWall ? straightWallEnd(draftWall.start, draftWall.end) : null;
  const activeTool = TOOLS.find((t) => t.id === tool) ?? TOOLS[0];
  const markers = data.markers ?? [];
  const totalEstimateOnDrawing = markers.reduce((sum, m) => sum + (m.total_price || 0), 0);

  return (
    <div>
      <Link to={`/app/projects/${drawing.project_id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> К проекту
      </Link>

      <PageHeader
        title={drawing.name}
        description={`${projectName || 'Проект'} · клетка сетки ${CELL_M} м · Сметных меток: ${markers.length}`}
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" onClick={undo} disabled={undoStack.length === 0}>
                <Undo2 className="h-4 w-4" /> Отменить
              </Button>
              <Button onClick={() => void save()} loading={saving} disabled={!dirty}>
                <Save className="h-4 w-4" /> Сохранить
              </Button>
            </>
          ) : (
            <span className="text-sm text-slate-400">Режим просмотра</span>
          )
        }
      />

      {/* 2D / 3D Mode Selector & Tools Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* 2D / 3D Switcher */}
        <div className="inline-flex rounded-xl bg-slate-900 border border-slate-700/80 p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === '2d'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ruler className="h-4 w-4" /> 2D Чертёж (План)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === '3d'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="h-4 w-4" /> Объемный 3D Вид
          </button>
        </div>

        {/* 2D Drawing Tools (Only visible in 2D mode) */}
        {viewMode === '2d' && canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              const active = tool === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTool(t.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? t.id === 'marker'
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                        : 'bg-sky-600 text-white shadow-sm shadow-sky-600/20'
                      : 'bg-slate-800 text-slate-300 ring-1 ring-inset ring-slate-600 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
                </button>
              );
            })}
            <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
              {activeTool.hint}
            </span>
          </div>
        )}
      </div>

      {viewMode === '3d' ? (
        <Building3DViewer
          data={data}
          drawingName={drawing.name}
          projectName={projectName}
          currency={projectCurrency}
          onMarkerClick={openEditMarker}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Canvas SVG */}
        <Card className="overflow-hidden p-2 sm:p-3 relative">
          <svg
            viewBox={`0 0 ${DRAWING_WIDTH} ${DRAWING_HEIGHT}`}
            className={`block w-full touch-none select-none rounded-lg bg-slate-950 ${
              canEdit && tool !== 'erase' ? 'cursor-crosshair' : ''
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => setDraftWall(null)}
            onClick={handleCanvasClick}
            role="img"
            aria-label={`Чертёж: ${drawing.name}`}
          >
            <defs>
              <pattern id="cell-grid" width={CELL_PX} height={CELL_PX} patternUnits="userSpaceOnUse">
                <path d={`M ${CELL_PX} 0 L 0 0 0 ${CELL_PX}`} fill="none" stroke="#1e293b" strokeWidth="1" />
              </pattern>
              <pattern id="major-grid" width={CELL_PX * 5} height={CELL_PX * 5} patternUnits="userSpaceOnUse">
                <path d={`M ${CELL_PX * 5} 0 L 0 0 0 ${CELL_PX * 5}`} fill="none" stroke="#334155" strokeWidth="1" />
              </pattern>
              <filter id="marker-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect width={DRAWING_WIDTH} height={DRAWING_HEIGHT} fill="url(#cell-grid)" />
            <rect width={DRAWING_WIDTH} height={DRAWING_HEIGHT} fill="url(#major-grid)" />

            {/* Walls */}
            {data.walls.map((w, i) => {
              const midX = ((w.x1 + w.x2) / 2) * CELL_PX;
              const midY = ((w.y1 + w.y2) / 2) * CELL_PX;
              return (
                <g key={`wall-${i}`}>
                  <line
                    x1={w.x1 * CELL_PX}
                    y1={w.y1 * CELL_PX}
                    x2={w.x2 * CELL_PX}
                    y2={w.y2 * CELL_PX}
                    stroke="#e2e8f0"
                    strokeWidth={6}
                    strokeLinecap="square"
                    className={canEdit && tool === 'erase' ? 'cursor-pointer hover:stroke-rose-400' : ''}
                    onClick={(e) => { e.stopPropagation(); removeWall(i); }}
                  />
                  <text x={midX} y={midY - 12} textAnchor="middle" fill="#7dd3fc" fontSize={12} pointerEvents="none">
                    {formatMeters(wallLengthM(w))}
                  </text>
                </g>
              );
            })}

            {/* Labels */}
            {data.labels.map((l, i) => (
              <text
                key={`label-${i}`}
                x={l.x * CELL_PX}
                y={l.y * CELL_PX}
                fill="#fde68a"
                fontSize={14}
                fontWeight={500}
                className={canEdit && tool === 'erase' ? 'cursor-pointer hover:fill-rose-400' : ''}
                onClick={(e) => { e.stopPropagation(); removeLabel(i); }}
              >
                {l.text}
              </text>
            ))}

            {/* Interactive Estimate Markers */}
            {markers.map((m, idx) => {
              const mx = m.x * CELL_PX;
              const my = m.y * CELL_PX;
              const isSelected = selectedMarkerId === m.id;
              return (
                <g
                  key={m.id}
                  transform={`translate(${mx}, ${my})`}
                  className="cursor-pointer transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tool === 'erase') {
                      removeMarker(m.id);
                    } else {
                      setSelectedMarkerId(isSelected ? null : m.id);
                    }
                  }}
                >
                  {/* Outer pulse circle */}
                  <circle
                    r={isSelected ? 18 : 14}
                    fill={isSelected ? '#f59e0b' : '#d97706'}
                    fillOpacity={0.35}
                    stroke={isSelected ? '#fbbf24' : '#f59e0b'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    filter="url(#marker-glow)"
                  />
                  {/* Pin core */}
                  <circle r={10} fill="#f59e0b" stroke="#78350f" strokeWidth={1} />
                  {/* Marker Number */}
                  <text
                    y={3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {idx + 1}
                  </text>
                  {/* Floating Price Pill */}
                  <g transform="translate(14, -8)" pointerEvents="none">
                    <rect
                      width={Math.max(65, m.title.length * 6)}
                      height={20}
                      rx={4}
                      fill="#0f172a"
                      fillOpacity={0.9}
                      stroke={isSelected ? '#fbbf24' : '#334155'}
                      strokeWidth={1}
                    />
                    <text x={6} y={14} fill="#e2e8f0" fontSize={9.5} fontWeight={600}>
                      {shortenTitle(m.title, 14)} · {formatMoney(m.total_price, projectCurrency)}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Drawing draft wall */}
            {draftWall && draftEnd && (
              <>
                <line
                  x1={draftWall.start.x * CELL_PX}
                  y1={draftWall.start.y * CELL_PX}
                  x2={draftEnd.x * CELL_PX}
                  y2={draftEnd.y * CELL_PX}
                  stroke="#38bdf8"
                  strokeWidth={4}
                  strokeDasharray="8 6"
                  pointerEvents="none"
                />
                <text
                  x={((draftWall.start.x + draftEnd.x) / 2) * CELL_PX}
                  y={((draftWall.start.y + draftEnd.y) / 2) * CELL_PX - 12}
                  textAnchor="middle"
                  fill="#38bdf8"
                  fontSize={12}
                  pointerEvents="none"
                >
                  {formatMeters(wallLengthM({ x1: draftWall.start.x, y1: draftWall.start.y, x2: draftEnd.x, y2: draftEnd.y }))}
                </text>
              </>
            )}

            {/* Title Stamp Block in bottom-right corner */}
            <g transform={`translate(${DRAWING_WIDTH - 300} ${DRAWING_HEIGHT - 84})`} pointerEvents="none">
              <rect width="292" height="76" fill="#0f172a" stroke="#475569" />
              <text x="12" y="22" fill="#e2e8f0" fontSize={13} fontWeight={600}>{shortenTitle(drawing.name, 34)}</text>
              <text x="12" y="42" fill="#94a3b8" fontSize={11}>{shortenTitle(projectName || 'Проект', 40)}</text>
              <text x="12" y="62" fill="#94a3b8" fontSize={11}>Масштаб {CELL_M} м · {formatDate(drawing.updated_at)}</text>
            </g>
          </svg>
        </Card>

        {/* Right Sidebar: Plan Specs + Interactive Estimate */}
        <div className="space-y-4">
          {/* Estimate summary card */}
          <Card className="p-4 border-amber-500/30 bg-slate-900/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">Смета на чертеже</h3>
              </div>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                {markers.length} поз.
              </span>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-500/20">
              <span className="text-xs text-amber-300/80 block">Итого по чертежу:</span>
              <span className="text-xl font-bold text-amber-300">{formatMoney(totalEstimateOnDrawing, projectCurrency)}</span>
            </div>

            {/* Markers list */}
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {markers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Нет меток. Выберите инструмент <strong className="text-amber-400">Метка сметы</strong> и кликните на чертеже.
                </p>
              ) : (
                markers.map((m, idx) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMarkerId(m.id)}
                    className={`rounded-lg p-2.5 text-xs transition border cursor-pointer ${
                      selectedMarkerId === m.id
                        ? 'border-amber-400 bg-amber-950/40 text-white'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-semibold text-white flex items-center gap-1">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-slate-950 font-bold">
                          {idx + 1}
                        </span>
                        {m.title}
                      </span>
                      <span className="font-bold text-amber-300 shrink-0">
                        {formatMoney(m.total_price, projectCurrency)}
                      </span>
                    </div>
                    {m.room_name && <p className="text-[11px] text-slate-400 mt-1">Зона: {m.room_name}</p>}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span>{m.quantity} {m.unit} × {formatMoney(m.unit_price, projectCurrency)}</span>
                      {canEdit && (
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditMarker(m)}
                            className="text-sky-400 hover:text-sky-300"
                            title="Редактировать"
                          >
                            Изм.
                          </button>
                          <button
                            onClick={() => removeMarker(m.id)}
                            className="text-rose-400 hover:text-rose-300"
                            title="Удалить"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Geometry summary card */}
          <Card className="p-4">
            <h3 className="font-semibold text-white text-sm">Геометрия</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Стен всего</dt><dd className="text-slate-100 font-medium">{data.walls.length}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Общая длина стен</dt><dd className="text-slate-100 font-medium">{formatMeters(totalWallLengthM(data.walls))}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Подписей</dt><dd className="text-slate-100 font-medium">{data.labels.length}</dd></div>
            </dl>
            {dirty && <p className="mt-3 text-xs text-amber-300">Есть несохранённые правки.</p>}
            {saveError && <div className="mt-3"><Alert tone="error">{saveError}</Alert></div>}
          </Card>
        </div>
      </div>
      )}

      {/* Label Modal */}
      <Modal
        open={labelAt !== null}
        title="Подпись на чертеже"
        onClose={() => setLabelAt(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLabelAt(null)}>Отмена</Button>
            <Button type="submit" form="drawing-label-form">Добавить</Button>
          </>
        }
      >
        <form id="drawing-label-form" onSubmit={saveLabel}>
          <Field label="Текст подписи">
            <Input value={labelText} onChange={(e) => setLabelText(e.target.value)} maxLength={80} required autoFocus placeholder="Например: Спальня 16.8 м²" />
          </Field>
        </form>
      </Modal>

      {/* Estimate Marker Modal (New & Edit) */}
      <Modal
        open={markerAt !== null || editingMarker !== null}
        title={editingMarker ? 'Редактировать сметную позицию' : 'Привязать смету к точке на чертеже'}
        onClose={() => { setMarkerAt(null); setEditingMarker(null); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setMarkerAt(null); setEditingMarker(null); }}>Отмена</Button>
            <Button type="submit" form="estimate-marker-form">
              {editingMarker ? 'Сохранить изменения' : 'Привязать к чертежу'}
            </Button>
          </>
        }
      >
        <form id="estimate-marker-form" onSubmit={saveMarker} className="space-y-4">
          {/* Quick preset selector */}
          {!editingMarker && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Быстрый шаблон сметы</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_WORKS.map((pw) => (
                  <button
                    key={pw.title}
                    type="button"
                    onClick={() => {
                      setMarkerTitle(pw.title);
                      setMarkerUnit(pw.unit);
                      setMarkerUnitPrice(String(pw.price));
                      setMarkerCategory(pw.category);
                    }}
                    className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-xs text-slate-300 transition"
                  >
                    {pw.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field label="Название работы / материала *">
            <Input
              value={markerTitle}
              onChange={(e) => setMarkerTitle(e.target.value)}
              required
              placeholder="Например: Штукатурка стен по маякам"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Помещение / Зона">
              <Input
                value={markerRoom}
                onChange={(e) => setMarkerRoom(e.target.value)}
                placeholder="Гостиная, Санузел..."
              />
            </Field>
            <Field label="Категория">
              <Select
                value={markerCategory}
                onChange={(e) => setMarkerCategory(e.target.value as 'materials' | 'labor' | 'equipment' | 'other')}
              >
                <option value="labor">Работа</option>
                <option value="materials">Материалы</option>
                <option value="equipment">Оборудование</option>
                <option value="other">Прочее</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Объём *">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={markerQty}
                onChange={(e) => setMarkerQty(e.target.value)}
                required
              />
            </Field>
            <Field label="Ед. изм.">
              <Input
                value={markerUnit}
                onChange={(e) => setMarkerUnit(e.target.value)}
                placeholder="м², шт, компл"
                required
              />
            </Field>
            <Field label="Цена за ед. (₸) *">
              <Input
                type="number"
                min="0"
                value={markerUnitPrice}
                onChange={(e) => setMarkerUnitPrice(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="rounded-lg bg-amber-950/30 border border-amber-500/20 p-3 flex justify-between items-center text-sm">
            <span className="text-amber-200">Итого по позиции:</span>
            <span className="text-base font-bold text-amber-300">
              {formatMoney((parseFloat(markerQty) || 0) * (parseFloat(markerUnitPrice) || 0), projectCurrency)}
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}
