import { useState, useEffect, useRef } from 'react';
import { Ruler, Building, CheckCircle2, Sparkles, ArrowRight, Play, RotateCcw, Sliders, Compass, FileSpreadsheet, Cpu } from 'lucide-react';
import { Button } from '@/components/ui';

type ViewMode = 'stages' | 'slider';

const STAGES = [
  {
    id: 0,
    badge: 'Фаза 1: 2D Проектирование',
    title: 'Архитектурный чертёж этажа',
    desc: 'Точная привязка перегородок, экспликация помещений (1:100), автоматический подсчёт погонных метров стен.',
    image: '/images/blueprint-floorplan.jpg',
    metric: '38 000 мм по осям',
    submetric: '10 жилых зон',
    scale: 'scale-[1.15]',
  },
  {
    id: 1,
    badge: 'Фаза 2: 3D-BIM & Стройплощадка',
    title: 'Инженерная модель комплекса',
    desc: 'Генеральный план, привязка башенных кранов, поэтажные отметки высот и расчёт объёмов бетона в реальном времени.',
    image: '/images/blueprint-complex.jpg',
    metric: '78.50 м фронт застройки',
    submetric: '4 башенных крана',
    scale: 'scale-100',
  },
  {
    id: 2,
    badge: 'Фаза 3: Ввод в эксплуатацию',
    title: 'Реализованный жилой комплекс',
    desc: 'Объект сдан строго в срок и в рамках утверждённого бюджета. 0 кассовых разрывов, полная прозрачность для инвестора.',
    image: '/images/building-reality.jpg',
    metric: '100% сдача без замечаний',
    submetric: '-6.4% затрат на материалы',
    scale: 'scale-100',
  },
];

const HUD_PINS = [
  {
    top: '32%',
    left: '30%',
    title: 'Секция А-1 (Монолит)',
    value: 'Сдано технадзору',
    tag: 'Бетон B25',
    color: 'border-sky-400 bg-sky-500/20 text-sky-200',
  },
  {
    top: '46%',
    left: '52%',
    title: 'Вентилируемый фасад',
    value: '4 850 м² керамогранит',
    tag: 'Смета: 38.2 млн ₽',
    color: 'border-emerald-400 bg-emerald-500/20 text-emerald-200',
  },
  {
    top: '68%',
    left: '68%',
    title: 'Благоустройство & Паркинг',
    value: '142 машиноместа',
    tag: 'Асфальт + Озеленение',
    color: 'border-amber-400 bg-amber-500/20 text-amber-200',
  },
];

export default function HeroBlueprintVisualizer() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('stages');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [activePin, setActivePin] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Auto-cycle through stages
  useEffect(() => {
    if (!isPlaying || viewMode !== 'stages') return;
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % STAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlaying, viewMode]);

  // Handle slider drag
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  return (
    <section id="transformation" className="relative overflow-hidden pt-8 pb-20 lg:pt-14 lg:pb-32">
      {/* Background blueprint grid & radial glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.18),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Top Title & Statement */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-sky-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            Цифровая экосистема IMORA 2.0
          </div>

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            От архитектурного чертежа{' '}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent">
              до готового объекта
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-300">
            Единая среда, которая связывает 2D-планировки, сметный расчёт объёмов, закупку материалов
            и ежедневный стройконтроль. Без потерь бюджета и срывов сроков.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#demo">
              <Button variant="primary" className="h-11 px-6 text-base font-semibold shadow-lg shadow-sky-600/30 hover:shadow-sky-500/50">
                Запросить демо-доступ <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Button
              variant="secondary"
              onClick={() => {
                setViewMode(viewMode === 'stages' ? 'slider' : 'stages');
                setIsPlaying(false);
              }}
              className="h-11 px-5 border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800"
            >
              <Sliders className="h-4 w-4 text-sky-400" />
              {viewMode === 'stages' ? 'Режим сравнения (Слайдер)' : 'Пошаговая трансформация'}
            </Button>
          </div>
        </div>

        {/* Visualizer Canvas Container */}
        <div className="mt-12 rounded-2xl border border-sky-900/60 bg-gradient-to-b from-slate-900/90 to-slate-950 p-2 sm:p-4 shadow-2xl shadow-sky-950/50 ring-1 ring-white/10 backdrop-blur-xl">
          {/* Top Panel Controls */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 px-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-2 font-mono text-xs text-slate-400">
                IMORA-CAD // LIVE-TRANSFORMATION-ENGINE
              </span>
            </div>

            {/* Stage Selector Pills */}
            {viewMode === 'stages' ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-950/80 p-1 ring-1 ring-slate-800">
                {STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      setActiveStage(stage.id);
                      setIsPlaying(false);
                    }}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                      activeStage === stage.id
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {stage.badge.split(':')[0]}
                  </button>
                ))}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Пауза' : 'Авто-воспроизведение'}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  {isPlaying ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-sky-300 font-mono">
                <Sliders className="h-3.5 w-3.5" />
                <span>Двигайте ползунок: Чертёж (слева) ↔ Готовый объект (справа)</span>
              </div>
            )}
          </div>

          {/* MAIN INTERACTIVE DISPLAY */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-950 select-none">
            {viewMode === 'stages' ? (
              /* --- MODE 1: 3-STAGE TRANSFORMATION --- */
              <div className="relative h-full w-full overflow-hidden">
                {STAGES.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className={`absolute inset-0 transition-all duration-1000 ease-out ${
                      activeStage === idx
                        ? 'opacity-100 scale-100 z-10'
                        : 'opacity-0 scale-95 pointer-events-none z-0'
                    }`}
                  >
                    <img
                      src={stage.image}
                      alt={stage.title}
                      className={`h-full w-full object-cover transition-transform duration-1000 ${stage.scale}`}
                    />

                    {/* Blueprint grid overlay styling for stages 0 & 1 */}
                    {idx < 2 && (
                      <div className="absolute inset-0 bg-sky-900/10 mix-blend-overlay pointer-events-none" />
                    )}

                    {/* Gradient vignette */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none" />

                    {/* Architectural crosshairs on blueprint */}
                    {idx === 0 && (
                      <div className="absolute top-6 left-6 flex items-center gap-2 rounded bg-sky-950/80 px-2.5 py-1.5 font-mono text-xs text-sky-300 border border-sky-700/50 backdrop-blur">
                        <Compass className="h-4 w-4 animate-spin text-sky-400" />
                        <span>FIRST FLOOR PLAN // 1:100</span>
                      </div>
                    )}

                    {idx === 1 && (
                      <div className="absolute top-6 left-6 flex items-center gap-2 rounded bg-sky-950/80 px-2.5 py-1.5 font-mono text-xs text-sky-300 border border-sky-700/50 backdrop-blur">
                        <Building className="h-4 w-4 text-sky-400" />
                        <span>3D AXONOMETRIC BIM VIEW // SHEET A1</span>
                      </div>
                    )}

                    {idx === 2 && (
                      <div className="absolute top-6 left-6 flex items-center gap-2 rounded bg-emerald-950/80 px-2.5 py-1.5 font-mono text-xs text-emerald-300 border border-emerald-700/50 backdrop-blur">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>COMPLETED RESIDENTIAL COMPLEX // OBJECT VERIFIED</span>
                      </div>
                    )}

                    {/* Stage Info Card Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md rounded-xl border border-sky-500/30 bg-slate-950/85 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
                      <span className="inline-block rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-sky-300">
                        {stage.badge}
                      </span>
                      <h3 className="mt-1 text-lg sm:text-xl font-bold text-white">{stage.title}</h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-snug">{stage.desc}</p>
                      
                      <div className="mt-3 flex items-center gap-4 border-t border-slate-800 pt-2.5 font-mono text-xs">
                        <div>
                          <span className="text-slate-400">Метрика: </span>
                          <span className="font-bold text-sky-400">{stage.metric}</span>
                        </div>
                        <div className="text-slate-400">•</div>
                        <div>
                          <span className="text-slate-400">Статус: </span>
                          <span className="font-bold text-emerald-400">{stage.submetric}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* --- MODE 2: BEFORE/AFTER INTERACTIVE SLIDER --- */
              <div
                ref={sliderRef}
                onMouseDown={() => { isDragging.current = true; }}
                onMouseUp={() => { isDragging.current = false; }}
                onMouseLeave={() => { isDragging.current = false; }}
                onMouseMove={(e) => {
                  if (isDragging.current) handleSliderMove(e.clientX);
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) handleSliderMove(e.touches[0].clientX);
                }}
                onClick={(e) => handleSliderMove(e.clientX)}
                className="relative h-full w-full cursor-ew-resize overflow-hidden"
              >
                {/* Underneath Image: Realistic Completed Building */}
                <img
                  src="/images/building-reality.jpg"
                  alt="Готовый объект"
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Overlaid Image: 3D Technical Blueprint, clipped by sliderPosition */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src="/images/blueprint-complex.jpg"
                    alt="Архитектурный чертёж"
                    className="absolute inset-0 h-full w-full object-cover max-w-none"
                    style={{ width: sliderRef.current?.clientWidth ?? '100%' }}
                  />
                  <div className="absolute inset-0 bg-sky-950/20 mix-blend-color-dodge pointer-events-none" />
                </div>

                {/* Divider Line & Handle */}
                <div
                  className="absolute top-0 bottom-0 z-20 w-0.5 bg-gradient-to-b from-sky-300 via-cyan-400 to-sky-500 shadow-[0_0_12px_#38bdf8]"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -left-4 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-white shadow-xl shadow-sky-500/50">
                    <Sliders className="h-4 w-4" />
                  </div>
                </div>

                {/* Badges on left and right */}
                <div className="pointer-events-none absolute top-4 left-4 rounded-md border border-sky-500/50 bg-sky-950/80 px-2.5 py-1 text-xs font-mono text-sky-300 backdrop-blur">
                  📐 АРХИТЕКТУРНЫЙ ЧЕРТЁЖ
                </div>
                <div className="pointer-events-none absolute top-4 right-4 rounded-md border border-emerald-500/50 bg-emerald-950/80 px-2.5 py-1 text-xs font-mono text-emerald-300 backdrop-blur">
                  🏢 ГОТОВЫЙ ОБЪЕКТ
                </div>

                {/* Interactive HUD Data Pins */}
                {HUD_PINS.map((pin, i) => (
                  <div
                    key={i}
                    style={{ top: pin.top, left: pin.left }}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePin(activePin === i ? null : i);
                      }}
                      className="group relative flex h-7 w-7 items-center justify-center rounded-full border border-white/80 bg-sky-600 shadow-lg shadow-sky-500/60 transition hover:scale-110"
                    >
                      <span className="absolute -inset-1 animate-ping rounded-full bg-sky-400 opacity-60" />
                      <span className="font-mono text-xs font-bold text-white">{i + 1}</span>
                    </button>

                    {activePin === i && (
                      <div className="absolute bottom-9 left-1/2 z-30 -translate-x-1/2 w-52 rounded-lg border border-slate-700 bg-slate-950/95 p-2.5 shadow-2xl backdrop-blur-md">
                        <div className="text-xs font-bold text-white">{pin.title}</div>
                        <div className="text-[11px] text-slate-300">{pin.value}</div>
                        <span className="mt-1 inline-block rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-sky-300">
                          {pin.tag}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Under-canvas fast stats */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-4 px-2">
            <div className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
                <Ruler className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Авторасчёт по чертежу</div>
                <div className="text-sm font-bold text-white">Точные объёмы без погрешностей</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Версионность смет</div>
                <div className="text-sm font-bold text-white">Фиксация цен и согласование</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Контроль закупок</div>
                <div className="text-sm font-bold text-white">Черновик → Заказ → Доставка</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
