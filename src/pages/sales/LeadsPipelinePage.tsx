import { useState, useEffect } from 'react';
import { useAuth } from '@/context/useAuth';
import { navigate } from '@/lib/router';
import { canAccessSalesCRM } from '@/lib/types';
import { DEAL_STAGE_LABELS } from '@/lib/labels';
import { Plus, Phone, Home, User, ChevronDown, X, Check } from 'lucide-react';

type DealStage = 'new' | 'qualification' | 'showing' | 'negotiation' | 'reservation' | 'contract' | 'payment' | 'lost';
type PurchaseMethod = 'cash' | 'mortgage' | 'installment' | 'exchange';

interface Lead {
  id: string;
  clientName: string;
  phone: string;
  interestedUnit?: string;
  budget?: number;
  stage: DealStage;
  manager: string;
  source: string;
  purchaseMethod?: PurchaseMethod;
  createdAt: string;
  notes?: string;
}

const STAGES: DealStage[] = ['new','qualification','showing','negotiation','reservation','contract','payment','lost'];

const STAGE_COLORS: Record<DealStage, string> = {
  new:          'border-slate-500 bg-slate-800',
  qualification:'border-sky-500/50 bg-sky-950/40',
  showing:      'border-violet-500/50 bg-violet-950/40',
  negotiation:  'border-amber-500/50 bg-amber-950/40',
  reservation:  'border-orange-500/50 bg-orange-950/40',
  contract:     'border-emerald-500/50 bg-emerald-950/40',
  payment:      'border-teal-500/50 bg-teal-950/40',
  lost:         'border-rose-500/50 bg-rose-950/30',
};

const STAGE_HEADER: Record<DealStage, string> = {
  new:          'bg-slate-700 text-slate-200',
  qualification:'bg-sky-600/30 text-sky-300',
  showing:      'bg-violet-600/30 text-violet-300',
  negotiation:  'bg-amber-600/30 text-amber-300',
  reservation:  'bg-orange-600/30 text-orange-300',
  contract:     'bg-emerald-600/30 text-emerald-300',
  payment:      'bg-teal-600/30 text-teal-300',
  lost:         'bg-rose-600/20 text-rose-400',
};

const PURCHASE_LABELS: Record<PurchaseMethod, string> = {
  cash: 'Наличные', mortgage: 'Ипотека', installment: 'Рассрочка', exchange: 'Обмен'
};

const MANAGERS = ['М. Иванова', 'К. Асанов', 'Б. Жаксыбеков'];
const SOURCES = ['Сайт', 'Звонок', 'Рекомендация', 'Instagram', 'Kaspi'];

// TODO: fetch from leads Supabase table
const MOCK_LEADS: Lead[] = [
  { id: '1', clientName: 'Алибек Сейтов', phone: '+7 701 234 5678', interestedUnit: 'A0304', budget: 52_000_000, stage: 'new', manager: 'М. Иванова', source: 'Сайт', purchaseMethod: 'mortgage', createdAt: '2026-11-01' },
  { id: '2', clientName: 'Дана Нурова', phone: '+7 777 111 2233', interestedUnit: 'B0205', budget: 38_000_000, stage: 'qualification', manager: 'К. Асанов', source: 'Instagram', purchaseMethod: 'cash', createdAt: '2026-10-28' },
  { id: '3', clientName: 'Рустам Каримов', phone: '+7 702 999 8877', interestedUnit: 'A0108', budget: 65_000_000, stage: 'negotiation', manager: 'М. Иванова', source: 'Рекомендация', purchaseMethod: 'installment', createdAt: '2026-10-20' },
  { id: '4', clientName: 'Айгерим Бекова', phone: '+7 705 444 3311', interestedUnit: 'C0502', budget: 42_000_000, stage: 'showing', manager: 'К. Асанов', source: 'Kaspi', createdAt: '2026-10-29' },
  { id: '5', clientName: 'Сергей Попов', phone: '+7 708 321 6655', interestedUnit: 'B0301', budget: 58_000_000, stage: 'contract', manager: 'М. Иванова', source: 'Звонок', purchaseMethod: 'mortgage', createdAt: '2026-10-15' },
  { id: '6', clientName: 'Марат Дюсенов', phone: '+7 701 800 7766', budget: 30_000_000, stage: 'lost', manager: 'Б. Жаксыбеков', source: 'Сайт', createdAt: '2026-10-10', notes: 'Ушёл к конкуренту' },
  { id: '7', clientName: 'Зарина Мусина', phone: '+7 747 222 5544', interestedUnit: 'A0705', budget: 71_000_000, stage: 'payment', manager: 'К. Асанов', source: 'Рекомендация', purchaseMethod: 'installment', createdAt: '2026-10-05' },
  { id: '8', clientName: 'Ержан Омаров', phone: '+7 771 333 8899', stage: 'new', manager: 'Б. Жаксыбеков', source: 'Instagram', createdAt: '2026-11-03' },
];

function fmt(n: number) { return `${(n / 1_000_000).toFixed(1)} млн ₸`; }

function LeadCard({ lead, onOpen, onMove }: { lead: Lead; onOpen: () => void; onMove: (stage: DealStage) => void }) {
  const [moveOpen, setMoveOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-800 p-3 space-y-2 hover:border-sky-500/40 transition cursor-pointer" onClick={onOpen}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-white truncate">{lead.clientName}</p>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMoveOpen(!moveOpen)}
            className="text-slate-500 hover:text-sky-400 transition"
            title="Переместить"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          {moveOpen && (
            <div className="absolute right-0 top-6 z-20 min-w-[160px] rounded-lg bg-slate-700 border border-slate-600 shadow-xl py-1">
              {STAGES.filter(s => s !== lead.stage).map(s => (
                <button key={s} onClick={() => { onMove(s); setMoveOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600 hover:text-white">
                  → {DEAL_STAGE_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-400">
        <Phone className="h-3 w-3" />{lead.phone}
      </div>
      {lead.interestedUnit && (
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Home className="h-3 w-3" />Кв. {lead.interestedUnit}
        </div>
      )}
      {lead.budget && (
        <div className="text-xs text-sky-400 font-medium">{fmt(lead.budget)}</div>
      )}
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <User className="h-3 w-3" />{lead.manager}
      </div>
      {lead.purchaseMethod && (
        <span className="inline-block rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
          {PURCHASE_LABELS[lead.purchaseMethod]}
        </span>
      )}
    </div>
  );
}

// Add Lead Modal
function AddLeadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (lead: Lead) => void }) {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [unit, setUnit] = useState('');
  const [budget, setBudget] = useState('');
  const [manager, setManager] = useState(MANAGERS[0]);
  const [source, setSource] = useState(SOURCES[0]);
  const [method, setMethod] = useState<PurchaseMethod>('cash');

  function submit() {
    if (!clientName.trim() || !phone.trim()) return;
    onAdd({
      id: Date.now().toString(),
      clientName: clientName.trim(),
      phone: phone.trim(),
      interestedUnit: unit.trim() || undefined,
      budget: budget ? Number(budget) * 1_000_000 : undefined,
      stage: 'new',
      manager,
      source,
      purchaseMethod: method,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white">Новый лид</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Имя клиента *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="Фамилия Имя" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Телефон *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="+7 ..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Квартира</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="A0304" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Бюджет (млн ₸)</label>
              <input type="number" value={budget} onChange={e => setBudget(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500" placeholder="45" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Менеджер</label>
              <select value={manager} onChange={e => setManager(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Источник</label>
              <select value={source} onChange={e => setSource(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Способ покупки</label>
            <select value={method} onChange={e => setMethod(e.target.value as PurchaseMethod)} className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500">
              {Object.entries(PURCHASE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-700">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-600 py-2 text-sm text-slate-400 hover:bg-slate-800 transition">Отмена</button>
          <button onClick={submit} disabled={!clientName || !phone} className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 py-2 text-sm font-medium text-white transition flex items-center justify-center gap-2">
            <Check className="h-4 w-4" /> Создать лид
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeadsPipelinePage() {
  const { access } = useAuth();
  const role = access?.role;
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [addOpen, setAddOpen] = useState(false);
  const [managerFilter, setManagerFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  useEffect(() => {
    if (role && !canAccessSalesCRM(role)) navigate('/app');
  }, [role]);

  if (!role || !canAccessSalesCRM(role)) return null;

  const filtered = leads.filter(l => {
    if (managerFilter !== 'all' && l.manager !== managerFilter) return false;
    if (methodFilter !== 'all' && l.purchaseMethod !== methodFilter) return false;
    return true;
  });

  function moveStage(leadId: string, newStage: DealStage) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
  }

  function addLead(lead: Lead) {
    setLeads(prev => [lead, ...prev]);
  }

  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Воронка продаж</h1>
          <p className="text-sm text-slate-400 mt-0.5">{leads.filter(l => l.stage !== 'lost').length} активных сделок</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={managerFilter} onChange={e => setManagerFilter(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 px-3 py-1.5 focus:outline-none focus:border-sky-500">
            <option value="all">Все менеджеры</option>
            {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 px-3 py-1.5 focus:outline-none focus:border-sky-500">
            <option value="all">Все способы</option>
            {Object.entries(PURCHASE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-medium text-white transition"
          >
            <Plus className="h-4 w-4" /> Добавить лид
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage);
            return (
              <div key={stage} className={`w-64 rounded-xl border ${STAGE_COLORS[stage]} flex flex-col`}>
                {/* Column header */}
                <div className={`rounded-t-xl px-3 py-2.5 ${STAGE_HEADER[stage]}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage] ?? stage}</span>
                    <span className="text-xs font-bold bg-black/20 rounded-full px-2 py-0.5">{stageLeads.length}</span>
                  </div>
                </div>
                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 min-h-[200px]">
                  {stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onOpen={() => navigate(`/sales/leads/${lead.id}`)}
                      onMove={(s) => moveStage(lead.id, s)}
                    />
                  ))}
                  {stageLeads.length === 0 && (
                    <div className="text-center text-xs text-slate-600 py-6">Нет сделок</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {addOpen && <AddLeadModal onClose={() => setAddOpen(false)} onAdd={addLead} />}
    </div>
  );
}
