import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import body from './landing-v2-body.html?raw';
import footer from './landing-v2-footer.html?raw';
import DemoRequestForm from './components/DemoRequestForm';
import WorkspaceDemo from './components/WorkspaceDemo';
import './LandingSections.css';
import './LandingV2.css';
export default function LandingApp() {
  const content = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => { setSlot(content.current?.querySelector('#workspace-demo-slot') ?? null); }, []);
  return <div className="landing-v2" lang="uz"><div ref={content} dangerouslySetInnerHTML={{ __html: body }} />{slot && createPortal(<WorkspaceDemo />, slot)}<DemoRequestForm /><div dangerouslySetInnerHTML={{ __html: footer }} /></div>;
}
