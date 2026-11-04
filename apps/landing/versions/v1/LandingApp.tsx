import { Building2, Ruler, Truck, UsersRound, ArrowUpRight, Check } from 'lucide-react';
import ConstructionSequence from './components/ConstructionSequence';
import DemoRequestForm from './components/DemoRequestForm';
import './LandingSections.css';
const features = [
  { icon: Building2, title: 'Obyektlar va jamoa', text: 'Har bir obyektning vazifalari, ish jarayoni va kunlik hisobotlari bitta ish maydonida.' },
  { icon: Ruler, title: 'Chizmalar va smeta', text: 'Rejalarni tahrirlang, ish hajmlarini hisoblang va smeta versiyalarini kelishib tasdiqlang.' },
  { icon: Truck, title: 'Ta’minot va xarajatlar', text: 'Materialga arizadan yetkazib berishgacha bo‘lgan jarayonni kuzating. Xarajatlarni obyektga bog‘lang.' },
  { icon: UsersRound, title: 'Sotuv va mijozlar', text: 'Mijozlar, xonadonlar, bitim bosqichlari va to‘lov jadvalini yagona CRM ichida boshqaring.' },
];
const plans = [
  { name: 'Start', audience: 'Kichik qurilish jamoalari uchun', price: '19 900', features: ['Obyektlar va vazifalar', 'Chizmalar va smetalar', 'Materiallar uchun arizalar'], featured: false },
  { name: 'Biznes', audience: 'Qurilish kompaniyalari uchun', price: '49 900', features: ['Start imkoniyatlari', 'Smeta va ta’minotni kelishish', 'Sotuv CRM va to‘lov jadvallari', 'Jamoa uchun rolli kirish'], featured: true },
  { name: 'Individual', audience: 'Kompaniyangiz ehtiyojlariga mos', price: null, features: ['Jamoa va obyektlar bo‘yicha shartlar', 'Ish jarayonlarini birga rejalash', 'Joriy etish talablarini muhokama qilish'], featured: false },
];
export default function LandingApp() {
  return <div className="imora-landing" lang="uz">
    <ConstructionSequence />
    <section className="imora-services" aria-labelledby="services-heading">
      <div className="imora-cloud imora-cloud-one" aria-hidden="true" /><div className="imora-cloud imora-cloud-two" aria-hidden="true" />
      <div className="imora-container">
        <p className="imora-eyebrow">IMORA IMKONIYATLARI</p>
        <h2 id="services-heading">Qurilishning har bir bosqichi.<br />Bitta ish maydoni.</h2>
        <p className="imora-intro">Chizmadan sotuvgacha — obyektlar, jamoa va mablag‘lar haqida aniq ma’lumot, bir joyda.</p>
        <div className="imora-feature-grid">{features.map(({icon:Icon,title,text})=><article className="imora-feature" key={title}><Icon size={35} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div>
    </section>
    <section className="imora-pricing" id="pricing" aria-labelledby="pricing-heading"><div className="imora-container">
      <div className="imora-pricing-heading"><div><p className="imora-eyebrow">TARIFLAR VA NARXLAR</p><h2 id="pricing-heading">Jamoangizga mos tarif.</h2></div><p>Oylik obuna. Jamoangiz ehtiyojlarini muhokama qilib, mos tarifni tanlaymiz.</p></div>
      <div className="imora-plan-grid">{plans.map(plan=><article className={`imora-plan ${plan.featured?'imora-plan-featured':''}`} key={plan.name}>
        <p className="imora-plan-audience">{plan.audience}</p><h3>{plan.name}</h3>
        <div className="imora-price">{plan.price?<><strong>{plan.price} ₽</strong><span>/ oy</span></>:<strong>Kelishuv asosida</strong>}</div>
        <ul>{plan.features.map(feature=><li key={feature}><Check size={18}/>{feature}</li>)}</ul>
        <a className="imora-cta" href={`#demo`} onClick={()=>window.dispatchEvent(new CustomEvent('imora-plan-select',{detail:plan.name}))}>{plan.price?'Tarif bo‘yicha so‘rov':'Shartlarni muhokama qilish'}<ArrowUpRight size={18}/></a>
      </article>)}</div>
      <div className="imora-payment-note"><span>To‘lov haqida</span><p>Narxlar Rossiya rublida (RUB) ko‘rsatilgan. To‘lov tartibi va kirish muddati ulanishdan oldin kelishiladi. Sayt orqali avtomatik karta to‘lovi hozircha mavjud emas.</p></div>
    </div></section>
    <DemoRequestForm />
  </div>;
}
