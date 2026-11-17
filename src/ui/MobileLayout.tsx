import { VEHICLE_REG } from '../demoDetails';
import { CameraPresets } from './CameraPresets';
import { ConditionPanel } from './ConditionPanel';
import { PartsList } from './PartsList';
import { ProgressBar } from './ProgressBar';
import { VehicleTypeSwitch } from './VehicleTypeSwitch';
import { Viewer } from './Viewer';
import { ZoneNav } from './ZoneNav';

/**
 * Phone layout, following the design artboard "Parts selector · mobile" (390 × 844): header,
 * body style, the car with camera presets over it, zone pills, then a bottom sheet with the
 * selected part's condition, the parts list and a progress + "Pass the rest" footer. The page
 * scrolls when the list is long; the footer stays pinned to the bottom of the screen.
 */
export function MobileLayout() {
  return (
    <div className="m-app">
      <header className="m-header">
        <h1 className="m-title">Inspection</h1>
        <span className="reg" aria-label={`Registration ${VEHICLE_REG}`}>
          {VEHICLE_REG}
        </span>
      </header>
      <div className="m-types">
        <VehicleTypeSwitch variant="mobile" />
      </div>
      <section aria-label="3D vehicle" className="m-viewer">
        <Viewer variant="mobile" overlay={<CameraPresets variant="mobile" />} />
      </section>
      <nav aria-label="Inspection areas" className="m-zones">
        <ZoneNav variant="mobile" />
      </nav>
      <section aria-label="Parts" className="m-sheet">
        <div className="m-grabber" aria-hidden="true" />
        <ConditionPanel variant="mobile" />
        <PartsList variant="mobile" />
        <ProgressBar variant="mobile" />
      </section>
    </div>
  );
}
