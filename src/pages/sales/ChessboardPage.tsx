import { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { navigate } from '@/lib/router';
import { canAccessSalesCRM } from '@/lib/types';
import { X, Home, Search, Filter, Plus } from 'lucide-react';

type UnitStatus = 'free' | 'reserved' | 'sold' | 'not_for_sale';
type UnitType = 'studio' | '1room' | '2room' | '3room' | 'commercial';

interface Unit {
  id: string;
  section: string;
  floor: number;
  number: string;
  type: UnitType;
  area: number;       // м²
  pricePerM2: number; // ₸
  status: UnitStatus;
  clientName?: string;
  reservedUntil?: string;
}

// TODO: fetch from real_estate_units Supabase table
function generateMockUnits(): Unit[] {
  const sections = ['A', 'B', 'C'];
  const floors = 10;
  const unitsPerFloor = 4;
  const types: UnitType[] = ['studio', '1room', '2room', '3room'];
  const statuses: UnitStatus[] = ['free', 'free', 'free', 'reserved', 'sold'];
  const areas: Record<UnitType, number> = { studio: 35, '1room': 48, '2room': 68, '3room': 90, commercial: 55 };

  const units: Unit[] = [];
  sections.forEach(sec => {
    for (let fl = 1; fl <= floors; fl++) {
      for (let u = 1; u <= unitsPerFloor; u++) {
        const type = types[(u - 1) % types.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        units.push({
          id: `${sec}${fl}-${u}`,
          section: sec,
          floor: fl,
          number: `${sec}${String(fl).padStart(2,'0')}${u}`,
          type,
          area: areas[type] + Math.round(Math.random() * 8),
          pricePerM2: 380_000 + Math.round(Math.random() * 40_000),
          status,
          clientName: status === 'reserved' ? 'Алибек Сейтов' : status === 'sold' ? 'Дана Нурова' : undefined,
          reservedUntil: status === 'reserved' ? '2026-11-10' : undefined,
        });
      }
    }
  });
  return units;
}

const ALL_UNITS = generateMockUnits();

const STATUS_CONFIG: Record<UnitStatus, { label: string; bg: string; border: string; text: string }> = {
  free:        { label: 'Свободна',    bg: 'bg-emerald-500/20 hover:bg-emerald-500/40', border: 'border-emerald-500/40', text: 'text-emerald-300' },
  reserved:    { label: 'Резерв',      bg: 'bg-amber-500/20 hover:bg-amber-500/40',     border: 'border-amber-500/40',   text: 'text-amber-300' },
  sold:        { label: 'Продана',     bg: 'bg-rose-500/20',                            border: 'border-rose-500/40',    text: 'text-rose-300' },
  not_for_sale:{ label: 'Не в продаже',bg: 'bg-slate-700/50',                          border: 'border-slate-600',      text: 'text-slate-500' },
};

const TYPE_LABELS: Record<UnitType, string> = {
  studio: 'Студия', '1room': '1-комн', '2room': '2-комн', '3room': '3-комн', commercial: 'Коммерч.'
};

function fmt(n: number) { return n.toLocaleString('ru-RU'); }

export default function ChessboardPage() {
  const { access } = useAuth();
  const role = access?.role;

  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Unit | null>(null);

  useEffect(() => {
    if (role && !canAccessSalesCRM(role)) navigate('/app');
  }, [role]);

  if (!role || !canAccessSalesCRM(role)) return null;

  const filtered = ALL_UNITS.filter(u => {
    if (sectionFilter !== 'all' && u.section !== sectionFilter) return false;
    if (typeFilter !== 'all' && u.type !== typeFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (search && !u.number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sections = [...new Set(ALL_UNITS.map(u => u.section))].sort();
  const activeSection = sectionFilter === 'all' ? sections[0] : sectionFilter;
  const sectionUnits = filtered.filter(u => u.section === activeSection);
  const floors = [...new Set(sectionUnits.map(u => u.floor))].sort((a, b) => b - a);

  const stats = {
    free: ALL_UNITS.filter(u => u.status === 'free').length,
    reserved: ALL_UNITS.filter(u => u.status === 'reserved').length,
    sold: ALL_UNITS.filter(u => u.status === 'sold').length,
    total: ALL_UNITS.length,
  };

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Home className="h-6 w-6 text-sky-400" /> Шахматка квартир
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">ЖК IMORA 2.0 · {stats.free} свободных из {stats.total}</p>
        </div>
        <button
          onClick={() => navigate('/sales/leads/new')}
          className="flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white transition"
        >
          <Plus className="h-4 w-4" /> Добавить лид
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 flex-wrap">
        {(['free','reserved','sold'] as const).map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-sm inline-block ${s === 'free' ? 'bg-emerald-500' : s === 'reserved' ? 'bg-amber-400' : 'bg-rose-500'}`} />
            <span className="text-sm text-slate-300">{STATUS_CONFIG[s].label}: <strong className="text-white">{stats[s]}</strong></span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="h-4 w-4" /><span className="text-sm">Фильтр:</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Номер квартиры…"
            className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44"
          />
        </div>
        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="rounded-lg bg-slate-700 border border-slate-600 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-sky-500">
          <option value="all">Все секции</option>
          {sections.map(s => <option key={s} value={s}>Секция {s}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-lg bg-slate-700 border border-slate-600 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-sky-500">
          <option value="all">Все типы</option>
          {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg bg-slate-700 border border-slate-600 text-sm text-white px-3 py-1.5 focus:outline-none focus:border-sky-500">
          <option value="all">Все статусы</option>
          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        {sections.map(s => (
          <button
            key={s}
            onClick={() => setSectionFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              activeSection === s
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            Секция {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 overflow-x-auto">
        <div className="space-y-2 min-w-[400px]">
          {floors.map(floor => {
            const floorUnits = sectionUnits.filter(u => u.floor === floor);
            return (
              <div key={floor} className="flex items-stretch gap-2">
                <div className="flex items-center justify-end w-10 shrink-0 text-xs text-slate-500 font-mono">
                  {floor}Э
                </div>
                {floorUnits.map(unit => {
                  const cfg = STATUS_CONFIG[unit.status];
                  return (
                    <button
                      key={unit.id}
                      onClick={() => unit.status !== 'not_for_sale' ? setSelected(unit) : undefined}
                      className={`flex-1 min-w-[80px] rounded-lg border ${cfg.bg} ${cfg.border} p-2 text-left transition cursor-pointer`}
                    >
                      <div className="text-xs font-bold text-white">{unit.number}</div>
                      <div className="text-xs text-slate-400">{TYPE_LABELS[unit.type]}</div>
                      <div className="text-xs text-slate-300">{unit.area} м²</div>
                      <div className={`text-xs font-medium mt-1 ${cfg.text}`}>{cfg.label}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-white">Кв. {selected.number}</h2>
              <p className="text-sm text-slate-400">{TYPE_LABELS[selected.type]} · {selected.area} м²</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Status badge */}
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium ${STATUS_CONFIG[selected.status].bg} ${STATUS_CONFIG[selected.status].text}`}>
              {STATUS_CONFIG[selected.status].label}
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Секция</span>
                <span className="text-white">{selected.section}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Этаж</span>
                <span className="text-white">{selected.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Площадь</span>
                <span className="text-white">{selected.area} м²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Цена за м²</span>
                <span className="text-white">{fmt(selected.pricePerM2)} ₸</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-3">
                <span className="text-slate-400 font-medium">Итого</span>
                <span className="text-sky-400 font-bold">{fmt(selected.area * selected.pricePerM2)} ₸</span>
              </div>
              {selected.clientName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Клиент</span>
                  <span className="text-white">{selected.clientName}</span>
                </div>
              )}
              {selected.reservedUntil && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Резерв до</span>
                  <span className="text-amber-300">{selected.reservedUntil}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-slate-700 space-y-2">
            {selected.status === 'free' && (
              <>
                <button
                  onClick={() => { navigate('/sales/pipeline'); setSelected(null); }}
                  className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2 text-sm font-medium text-white transition"
                >
                  Создать лид для этой квартиры
                </button>
                <button className="w-full rounded-lg border border-amber-500/50 hover:bg-amber-500/10 py-2 text-sm font-medium text-amber-300 transition">
                  Зарезервировать
                </button>
              </>
            )}
            {selected.status === 'reserved' && (
              <button
                onClick={() => navigate('/sales/pipeline')}
                className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 py-2 text-sm font-medium text-white transition"
              >
                Открыть сделку
              </button>
            )}
            <button className="w-full rounded-lg border border-slate-600 hover:bg-slate-800 py-2 text-sm text-slate-400 transition">
              Изменить цену / параметры
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
