import { useEffect, useRef } from 'react';
import './ConstructionSequence.css';
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const phase = (n: number, a: number, b: number) => { const t = clamp((n-a)/(b-a)); return t*t*(3-2*t); };
const assets = '/landing/';
export default function ConstructionSequence() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, current = 0, target = 0;
    const floors = el.querySelectorAll<HTMLElement>('[data-floor]');
    const buildings = el.querySelectorAll<HTMLElement>('[data-building]');
    const buttons = el.querySelectorAll<HTMLButtonElement>('[data-stage]');
    const paint = () => {
      current = motion.matches ? target : current + (target-current)*0.12;
      if (Math.abs(current-target)<0.0001) current = target;
      const p = current, tilt = phase(p,.06,.29), reality = phase(p,.62,.94);
      const values: Record<string,string|number> = {
        progress:p, 'plan-opacity':1-phase(p,.27,.43), 'plan-scale':1-tilt*.65,
        'plan-tilt':`${motion.matches?0:tilt*57}deg`, 'plan-turn':`${motion.matches?0:tilt*-24}deg`,
        'plan-y':`${tilt*20}%`, build:phase(p,.22,.57), 'blueprint-opacity':phase(p,.23,.42),
        'scene-scale':motion.matches?1:1.22-phase(p,.25,1)*.22,
        reality, reveal:`${(1-reality)*100}%`, hint:1-phase(p,.015,.09)
      };
      Object.entries(values).forEach(([key,value])=>el.style.setProperty(`--${key}`,String(value)));
      floors.forEach((floor,i)=>{
        const appear=phase(p,.13+i*.012,.23+i*.012);
        floor.style.opacity=String(appear*(1-phase(p,.28,.40))*.42);
        floor.style.transform=`translateY(${-i*15*appear}px)`;
      });
      buildings.forEach((building,i)=>{
        const rise=phase(p,.28+i*.025,.44+i*.025);
        building.style.clipPath=`inset(${(1-rise)*100}% 0 0 0)`;
        building.style.transform=`translateY(${motion.matches?0:(1-rise)*60}px)`;
      });
      buttons.forEach((button,i)=>button.setAttribute('aria-current',String(i===(p<.36?0:p<.72?1:2))));
      frame=current!==target?requestAnimationFrame(paint):0;
    };
    const update=()=>{
      target=clamp(-el.getBoundingClientRect().top/Math.max(1,el.offsetHeight-window.innerHeight));
      if (!frame) frame=requestAnimationFrame(paint);
    };
    window.addEventListener('scroll',update,{passive:true});
    window.addEventListener('resize',update);
    motion.addEventListener('change',update);
    update();
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update);motion.removeEventListener('change',update);};
  },[]);
  const goTo=(progress:number)=>{
    if(!root.current)return;
    const top=root.current.getBoundingClientRect().top+window.scrollY;
    window.scrollTo({top:top+progress*(root.current.offsetHeight-window.innerHeight),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  };
  return <main ref={root} className="construction-sequence" aria-label="От плана этажа до строительства жилого комплекса">
    <div className="construction-viewport">
      <div className="construction-grid" aria-hidden="true" />
      <div className="construction-scene" aria-hidden="true">
        <div className="construction-complex">
          <img className="complex-underlay" src={`${assets}complex-blueprint.png`} alt="" />
          <div className="complex-buildings">{[0,1,2,3,4,5].map(i=><div className="building-strip" data-building key={i} style={{left:`${i*100/6}%`,width:`${100/6+.05}%`}}><img src={`${assets}complex-blueprint.png`} alt="" style={{width:'600%',maxWidth:'none',left:`${-i*100}%`}} /></div>)}</div>
        </div>
        <div className="construction-real"><img src={`${assets}construction.png`} alt="" /></div>
      </div>
      <div className="construction-plan" aria-hidden="true">
        <img src={`${assets}floor-plan.png`} alt="" fetchPriority="high" />
        {Array.from({length:7},(_,i)=><img data-floor className="plan-floor" key={i} src={`${assets}floor-plan.png`} alt="" />)}
      </div>
      <button className="construction-scroll" onClick={()=>goTo(.58)} aria-label="Прокрутить к строительству"><svg width="20" height="34" viewBox="0 0 20 34" fill="none" aria-hidden="true"><path d="M10 1v29m-7-7 7 7 7-7" stroke="currentColor" strokeWidth="1.5" /></svg></button>
      <nav className="construction-stages" aria-label="Этапы строительства">{['План этажа','Чертёж комплекса','Стройка'].map((label,i)=><button key={label} data-stage aria-label={label} title={label} onClick={()=>goTo([0,.58,1][i])}><span /></button>)}</nav>
      <div className="construction-progress" aria-hidden="true" />
    </div>
  </main>;
}
