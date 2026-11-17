import { VEHICLE_REG } from './demoDetails';
import { CameraPresets } from './ui/CameraPresets';
import { ConditionPanel } from './ui/ConditionPanel';
import { LiveAnnouncer } from './ui/LiveAnnouncer';
import { MobileLayout } from './ui/MobileLayout';
import { PaintPicker } from './ui/PaintPicker';
import { PartsList } from './ui/PartsList';
import { ProgressBar } from './ui/ProgressBar';
import { VehicleTypeSwitch } from './ui/VehicleTypeSwitch';
import { MOBILE_QUERY, useMediaQuery } from './ui/useMediaQuery';
import { Viewer } from './ui/Viewer';
import { ZoneNav } from './ui/ZoneNav';

function GuideIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2zM22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function App() {
  const mobile = useMediaQuery(MOBILE_QUERY);
  return (
    <>
      {mobile ? <MobileLayout /> : <DesktopLayout />}
      <LiveAnnouncer />
    </>
  );
}

function DesktopLayout() {
  return (
    <div className="page">
      <div className="shell">
        <nav aria-label="Inspection areas" className="sidebar">
          <div className="sidebar-head">
            <span className="reg" aria-label={`Registration ${VEHICLE_REG}`}>
              {VEHICLE_REG}
            </span>
          </div>
          <ZoneNav />
          <div className="sidebar-spacer" />
          {/* Placeholder until a guide exists (spec Assumptions). */}
          <a href="#guide" className="guide-link caps">
            <GuideIcon />
            Guide
          </a>
        </nav>

        <main className="main">
          <div className="toolbar">
            <VehicleTypeSwitch />
            <CameraPresets />
            <PaintPicker />
          </div>
          <div className="stage">
            <section aria-label="3D vehicle" className="viewer">
              <Viewer />
            </section>
            <aside aria-label="Parts" className="parts">
              <PartsList />
              <ConditionPanel />
            </aside>
          </div>
          <ProgressBar />
        </main>
      </div>
    </div>
  );
}
