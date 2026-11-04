import LandingHeader from './components/LandingHeader';
import HeroBlueprintVisualizer from './components/HeroBlueprintVisualizer';
import EcosystemBreakdown from './components/EcosystemBreakdown';
import RoiCalculator from './components/RoiCalculator';
import PricingPlans from './components/PricingPlans';
import DemoRequestForm from './components/DemoRequestForm';
import LandingFooter from './components/LandingFooter';

export default function LandingApp() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-white">
      {/* Header with Navigation and Logo */}
      <LandingHeader />

      {/* Main Experience */}
      <main>
        {/* Hero with interactive Blueprint-to-Reality transformation and slider */}
        <HeroBlueprintVisualizer />

        {/* 3 Core Pillars of Imora 2.0 */}
        <EcosystemBreakdown />

        {/* Interactive Savings / ROI Calculator */}
        <RoiCalculator />

        {/* Tariff / Pricing plans ready for Part 2 billing */}
        <PricingPlans />

        {/* Demo capture form with direct Supabase connection */}
        <DemoRequestForm />
      </main>

      {/* Brand Footer */}
      <LandingFooter />
    </div>
  );
}
