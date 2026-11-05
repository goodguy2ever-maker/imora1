import { useEffect, useState } from 'react';
import { LayoutDashboard, Calculator, CheckSquare, RotateCcw, ArrowUpRight, Building2 } from 'lucide-react';
import './WorkspaceDemo.css';

type Role = 'director' | 'engineer' | 'foreman';
type Tab = 'overview' | 'estimate' | 'tasks';
type DemoState = { quantities: number[]; prices: number[]; completed: boolean[]; approved: boolean };
const INITIAL: DemoState = { quantities: [120, 85, 34], prices: [85000, 60000, 120000], completed: [true, false, false], approved: false };
const KEY = 'imora-workspace-demo-v1';
const money = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(n)} so‘m`;
const items = ['Devorlarni suvoq qilish', 'Polga styajka quyish', 'Plitka yotqizish'];
const tasks = ['Obyekt o‘lchamlarini tekshirish', 'Devorlarni tayyorlash', 'Materiallarni qabul qilish'];
function restore(): DemoState {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (value && ['quantities','prices'].every(key => Array.isArray(value[key]) && value[key].length === 3 && value[key].every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000000)) && Array.isArray(value.completed) && value.completed.length === 3 && value.completed.every((v: unknown) => typeof v === 'boolean') && typeof value.approved === 'boolean') return value;
  } catch { /* Storage may be unavailable or contain an older demo. */ }
  return { ...INITIAL, quantities: [...INITIAL.quantities], prices: [...INITIAL.prices], completed: [...INITIAL.completed] };
}
export default function WorkspaceDemo() {
  const [state, setState] = useState(restore);
  const [role, setRole] = useState<Role>('director');
  const [tab, setTab] = useState<Tab>('overview');
  const [notice, setNotice] = useState('');
  const [interacted, setInteracted] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); setStorageError(false); } catch { setStorageError(true); } }, [state]);
  const total = state.quantities.reduce((sum, quantity, i) => sum + quantity * state.prices[i], 0);
  const completed = state.completed.filter(Boolean).length;
  const change = (next: DemoState, message: string) => { setState(next); setNotice(message); setInteracted(true); };
  const edit = (index: number, field: 'quantities' | 'prices', raw: string) => {
    if (role === 'foreman' || state.approved) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100000000) return;
    change({ ...state, [field]: state[field].map((n, i) => i === index ? value : n) }, 'Smeta qayta hisoblandi.');
  };
  return <section id="workspace-demo" className="workspace-demo" aria-labelledby="demo-workspace-heading">
    <div className="wrap">
      <div className="section-head"><div className="eyebrow">O‘ZINGIZ SINAB KO‘RING</div><h2 id="demo-workspace-heading">Bir daqiqaga<br />jamoangiz ish maydonida.</h2><p>Rolni tanlang, smetani hisoblang va vazifani yakunlang. Ro‘yxatdan o‘tish shart emas.</p></div>
      <div className="demo-sandbox">
        <div className="demo-top"><span className="demo-label">DEMO · Namunaviy ma’lumotlar</span><button className="demo-reset" onClick={() => { setState(restoreInitial()); setNotice('Demo boshlang‘ich holatga qaytarildi.'); setInteracted(false); }}><RotateCcw size={14}/> Qayta boshlash</button></div>
        <div className="demo-role-row"><span>Kim sifatida ishlaysiz?</span><div className="demo-role-buttons">{([['director','Rahbar'],['engineer','Muhandis'],['foreman','Prorab']] as const).map(([value,label]) => <button key={value} aria-pressed={role === value} onClick={() => {setRole(value);setNotice('');}}>{label}</button>)}</div></div>
        <div className="demo-layout">
          <nav className="demo-sidebar" aria-label="Demo bo‘limlari"><div className="demo-project"><Building2 size={23}/><div><strong>Navro‘z Residence</strong><small>1-blok · Ichki pardozlash</small></div></div>{([{key:'overview',label:'Umumiy ko‘rinish',icon:LayoutDashboard},{key:'estimate',label:'Smeta',icon:Calculator},{key:'tasks',label:'Vazifalar',icon:CheckSquare}] as const).map(({key,label,icon:Icon}) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}><Icon size={17}/>{label}</button>)}<p>O‘zgarishlar faqat shu brauzerdagi demoga ta’sir qiladi.</p></nav>
          <div className="demo-content"><p className="demo-role-hint">{role === 'director' ? 'Rahbar: budjetni ko‘ring, smetani tasdiqlang va vazifalarni kuzating.' : role === 'engineer' ? 'Muhandis: hajm va narxlarni kiriting. Smetani rahbar tasdiqlaydi.' : 'Prorab: vazifalarni bajaring va ish holatini yangilang. Bu demoda smeta faqat ko‘rish uchun.'}</p>
          {tab === 'overview' && <><div className="demo-heading"><h3>Obyektning bugungi holati</h3><span>Namunaviy obyekt</span></div><div className="demo-stats"><div><small>Smeta summasi</small><strong>{money(total)}</strong><span>{state.approved?'Tasdiqlangan':'Qoralama'}</span></div><div><small>Namunaviy xarajat</small><strong>{money(4200000)}</strong><span>Demo uchun belgilangan qiymat</span></div><div><small>Bajarilgan vazifalar</small><strong>{completed} / 3</strong><progress value={completed} max={3} aria-label="Bajarilgan vazifalar"/></div></div><div className="demo-next"><div><span>KEYINGI QADAM</span><h4>{role === 'foreman'?'Bugungi ishni yakunlang':'Smeta qanday o‘zgarishini ko‘ring'}</h4><p>{role === 'foreman'?'Vazifalar bo‘limida bajarilgan ishni belgilang.':'Smetada miqdorni o‘zgartiring — umumiy summa darhol yangilanadi.'}</p></div><button onClick={() => setTab(role === 'foreman'?'tasks':'estimate')}>Sinab ko‘rish <ArrowUpRight size={17}/></button></div></>}
          {tab === 'estimate' && <><div className="demo-heading"><h3>Pardozlash smetasi</h3><span>{state.approved?'Tasdiqlangan':'Qoralama'}</span></div><div className="demo-table-scroll"><table><caption className="sr-only">Namunaviy narxlar, bozor taklifi emas. Barcha summalar so‘mda.</caption><thead><tr><th>Ish nomi</th><th>Miqdor, m²</th><th>Narx, so‘m/m²</th><th>Jami, so‘m</th></tr></thead><tbody>{items.map((name,i) => <tr key={name}><td>{name}</td><td><input aria-label={`${name}: miqdor`} type="number" min="0" max="100000000" step="0.01" value={state.quantities[i]} disabled={role==='foreman'||state.approved} onChange={e => edit(i,'quantities',e.target.value)}/></td><td><input aria-label={`${name}: narx`} type="number" min="0" max="100000000" step="1" value={state.prices[i]} disabled={role==='foreman'||state.approved} onChange={e => edit(i,'prices',e.target.value)}/></td><td>{money(state.quantities[i]*state.prices[i])}</td></tr>)}</tbody></table></div><div className="demo-total"><span>Jami <strong>{money(total)}</strong></span>{role==='director' && <button disabled={state.approved || state.quantities.some(n => n <= 0)} onClick={() => change({...state,approved:true},'Demo smetasi tasdiqlandi. Tahrirlash bloklandi.')}>{state.approved?'Tasdiqlangan':'Smetani tasdiqlash'}</button>}</div><p className="demo-footnote">Narxlar namunaviy. {state.approved?'Tahrirlashni qayta sinash uchun demoni boshlang‘ich holatga qaytaring.':'Miqdor va narxlarni o‘zgartirib hisobni sinang.'}</p></>}
          {tab === 'tasks' && <><div className="demo-heading"><h3>Obyekt vazifalari</h3><span>{completed} / 3 bajarildi</span></div><div className="demo-task-list">{tasks.map((task,i) => <label key={task}><input type="checkbox" checked={state.completed[i]} onChange={e => change({...state,completed:state.completed.map((v,j)=>j===i?e.target.checked:v)},'Vazifa holati yangilandi.')}/><span><strong>{task}</strong><small>{i===0?'Muhandis':'Prorab'} · Namunaviy vazifa</small></span><em>{state.completed[i]?'Bajarildi':'Jarayonda'}</em></label>)}</div></>}
          <div className="demo-notice" role="status">{notice}</div>{storageError && <p className="demo-footnote">Brauzer saqlashga ruxsat bermadi. Yangilansa, demo o‘zgarishlari yo‘qoladi.</p>}
          </div>
        </div>
      </div>
      {interacted && <div className="demo-conversion"><p>Endi o‘z kompaniyangiz jarayonlarini birlashtiring.</p><a className="btn btn-primary" href="#demo">Kompaniyangiz uchun demo so‘rang <ArrowUpRight size={16}/></a></div>}
    </div>
  </section>;
}
function restoreInitial(): DemoState { return {quantities:[...INITIAL.quantities],prices:[...INITIAL.prices],completed:[...INITIAL.completed],approved:false}; }
