import body from './landing-v2-body.html?raw';
import footer from './landing-v2-footer.html?raw';
import DemoRequestForm from './components/DemoRequestForm';
import './LandingSections.css';
import './LandingV2.css';
export default function LandingApp() {
  return <div className="landing-v2" lang="uz"><div dangerouslySetInnerHTML={{ __html: body }} /><DemoRequestForm /><div dangerouslySetInnerHTML={{ __html: footer }} /></div>;
}
