import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
export default function DemoRequestForm() {
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (fullName.trim().length < 2 || companyName.trim().length < 2 || contact.trim().length < 5 || !position.trim()) {
      setError('Ism, kompaniya va aloqa ma’lumotlarini to‘liq kiriting.');
      return;
    }
    setLoading(true);

    try {
      const { error: rpcError } = await supabase.from('demo_requests').insert({
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        position: position.trim(),
        contact: contact.trim(),
        message: message.trim() || null,
      });

      if (rpcError) throw rpcError;
      setDone(true);
    } catch (err) {
      const limited = typeof err === 'object' && err !== null && 'code' in err && err.code === 'P0001';
      setError(limited ? 'Bu kontakt uchun so‘rovlar chegarasiga yetdingiz. Bir soatdan keyin qayta urinib ko‘ring.' : 'So‘rov yuborilmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const selectPlan = (event: Event) => {
      const plan = (event as CustomEvent<string>).detail;
      if (['Start', 'Biznes', 'Individual'].includes(plan)) setMessage(`Tarif: ${plan}`);
    };
    window.addEventListener('imora-plan-select', selectPlan);
    return () => window.removeEventListener('imora-plan-select', selectPlan);
  }, []);
  return <section className="imora-contact" id="demo" aria-labelledby="contact-heading">
    <div className="imora-container imora-contact-grid">
      <div className="imora-contact-copy">
        <p className="imora-eyebrow">HAMKORLIKNI BOSHLAYMIZ</p>
        <h2 id="contact-heading">Keyingi loyihangizni birga boshqaramiz.</h2>
        <p>Jamoangiz haqida qisqacha ma’lumot qoldiring. IMORA imkoniyatlarini ko‘rsatib, sizga mos ish maydonini muhokama qilamiz.</p>
        <p>IMORA — qurilishdagi jarayonlar uchun yagona ish maydoni. Kirish huquqi administrator tomonidan beriladi.</p>
      </div>
      {done ? <div className="imora-form imora-form-success" role="status"><CheckCircle2 size={44} color="#90e8f6"/><h3>So‘rovingiz qabul qilindi.</h3><p>Jamoamiz ko‘rsatgan kontaktingiz orqali siz bilan bog‘lanadi.</p></div> :
      <form className="imora-form" onSubmit={submit}>
        {error && <div className="imora-form-error" role="alert">{error}</div>}
        <label htmlFor="demo-name">Ism va familiya<input id="demo-name" autoComplete="name" required maxLength={120} placeholder="Ismingiz" value={fullName} onChange={e=>setFullName(e.target.value)} /></label>
        <label htmlFor="demo-contact">Telefon yoki email<input id="demo-contact" required maxLength={160} placeholder="+998 90 123 45 67" value={contact} onChange={e=>setContact(e.target.value)} /></label>
        <label htmlFor="demo-company">Kompaniya nomi<input id="demo-company" autoComplete="organization" required maxLength={160} placeholder="Kompaniyangiz" value={companyName} onChange={e=>setCompanyName(e.target.value)} /></label>
        <label htmlFor="demo-position">Lavozimingiz<select id="demo-position" required value={position} onChange={e=>setPosition(e.target.value)}><option value="">Tanlang</option><option>Rahbar / kompaniya egasi</option><option>Muhandis / smetachi</option><option>Prorab / loyiha rahbari</option><option>Ta’minot bo‘yicha mutaxassis</option><option>Sotuv bo‘yicha mutaxassis</option><option>Boshqa</option></select></label>
        <label htmlFor="demo-message">Qaysi masalada yordam kerak? <span>(ixtiyoriy)</span><textarea id="demo-message" rows={2} maxLength={2000} placeholder="Tarif, obyektlar yoki jamoangiz haqida…" value={message} onChange={e=>setMessage(e.target.value)} /></label>
        <button className="imora-submit" type="submit" disabled={loading}>{loading?'Yuborilmoqda…':'So‘rov yuborish'}<ArrowUpRight size={20}/></button>
        <p className="imora-form-note">Yuborish orqali ushbu ma’lumotlar yordamida siz bilan bog‘lanishimizga rozilik bildirasiz.</p>
      </form>}
    </div>
  </section>;
}
