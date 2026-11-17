# Feature Specification: 3D Car Parts Selector

**Feature Branch**: `001-car-parts-selector`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "I want to build a demo 3d model car selector. We'll use vite. Use this for inspiration to build it: https://claude.ai/artifact/YApk1YhnPYtpmXKZ9V9YZe#artboard-15dd8cd198dd"

**Inspiration summary**: The referenced design ("3D Car Parts Selector · Parts selector ·
inspection") is a vehicle-inspection workspace. It has a rotatable 3D vehicle and a vehicle-type
switch (SUV, Saloon, Hatch, Pickup, Van). Camera presets cover 3/4, Front, Right, Rear, Left and
Top. A sidebar groups parts into zones, and a parts list sits beside the model. Each part can be
marked Pass, Advisory or Damage, with notes. A progress bar, a "Pass the rest" shortcut and a
Save action finish the screen. This spec follows that design.

## Clarifications

### Session 2026-11-18

- Q: Should the demo be a parts-inspection tool, a car picker, or both? → A: A parts-inspection
  tool, as in the linked design. Choosing a vehicle type (User Story 5) is the only "picking"
  in scope; browsing or comparing cars is out of scope.
- Q: Should the cars be app-drawn stylised shapes or detailed 3D model files? → A: App-drawn,
  stylised shapes for all five body styles, with nothing to download. The plan must record this
  as an exception to constitution Principle V (glTF/GLB models).
- Update (2026-11-18, requested after implementation): the **SUV** and **Van** now use real
  3D models supplied by the owner: a BMW X1 (F48) STL and a "Van Car 1" OBJ. They are converted
  to compressed GLB by `scripts/build-model.mjs` and split into the same inspection parts at
  load time. Saloon, Hatch and Pickup stay app-drawn. This supersedes the "app-drawn for all
  five" answer below for those two body styles.
- Update (2026-11-18): the **Saloon** uses a real Mercedes-Benz W222 model. **Hatch and Pickup
  are removed** at the owner's request, so the body styles are SUV, Saloon and Van, each a
  real model. Wherever this spec still mentions Hatch or Pickup (User Story 5, FR-017), read it
  as these three styles. Saved inspections for a removed style start fresh.
- Update (2026-11-18, owner): **nothing is saved — it's a demo.** No automatic saving, no Save
  button and no "finished" state; every visit or reload starts a fresh inspection. This
  supersedes the autosave answer below, FR-015, SC-007 and User Story 3's saving scenarios.
  "Pass the rest" is also on the phone layout's footer.
- Q: If the page is reloaded without pressing Save, should the inspection survive? → A: Yes.
  Every change saves automatically on the device; Save marks the inspection as finished.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select a part on the 3D car (Priority: P1)

An inspector sees a 3D car, rotates it by dragging, and taps a body panel, glass or wheel to
select it. The selected part is highlighted on the model, and a callout label points at it with
the part's name and current condition. The same part is highlighted in the parts list.

**Why this priority**: Picking parts directly on a 3D model is the core of the demo. Without
it, the product is just a checklist.

**Independent Test**: Load the app, drag to rotate the car, and tap the front-left door. The
door highlights, the callout reads "Front left door · Not checked", and the list row for that
door is selected.

**Acceptance Scenarios**:

1. **Given** the app has loaded, **When** the user drags across the car, **Then** the car
   rotates around its vertical axis and tilts within limits, never flipping upside down.
2. **Given** the car is shown, **When** the user taps a part without dragging, **Then** that
   part becomes selected and is highlighted on the model and in the list.
3. **Given** a pointer hovers over a part (mouse users), **When** it moves across the model,
   **Then** the hovered part is subtly lightened and its name shows in the hint line.
4. **Given** a part is selected, **When** the user picks it from the parts list instead,
   **Then** the camera animates to a view where that part is visible.
5. **Given** the user taps empty space, **When** no part is under the pointer, **Then** the
   current selection is unchanged.

---

### User Story 2 - Record a condition and notes for each part (Priority: P1)

With a part selected, the inspector marks it Pass, Advisory or Damage and optionally types a
note, such as where a scratch is. The part is tinted on the model by its condition: green for
Pass, amber for Advisory, red for Damage. The list shows the condition label beside the part.

**Why this priority**: Recording a condition is what turns selecting into inspecting. It is the
value the screen delivers.

**Independent Test**: Select the bonnet and mark it Damage with the note "Stone chip, centre".
The bonnet turns red on the model, the list row shows "Damage", and the note is still there
after selecting another part and returning.

**Acceptance Scenarios**:

1. **Given** a part is selected, **When** the user picks a condition, **Then** the part is
   tinted with that condition's color and the list and callout show its label.
2. **Given** a part already has a condition, **When** the user picks the same condition again,
   **Then** the condition is removed and the part returns to "Not checked".
3. **Given** a part is selected, **When** the user types a note, **Then** the note is kept for
   that part only.
4. **Given** a part has a condition and a note, **When** the user chooses Clear, **Then** both
   are removed for that part.
5. **Given** no part is selected, **Then** the condition controls are replaced with a prompt
   to tap a part on the car or in the list.

---

### User Story 3 - Track progress and finish the inspection (Priority: P2)

The inspector sees how many parts have been checked, with counts per condition. They can mark
every unchecked part as Pass in one action and save the inspection.

**Why this priority**: Progress and completion make the demo feel like a whole workflow, but
they depend on Stories 1 and 2.

**Independent Test**: Mark two parts, then use "Pass the rest". Progress shows all parts done
and the summary counts are correct. After saving and reloading, the recorded conditions and
notes are still there.

**Acceptance Scenarios**:

1. **Given** some parts have conditions, **Then** the progress bar and "done/total" count
   reflect how many parts are checked, alongside "N pass · N advisory · N damage".
2. **Given** some parts are unchecked, **When** the user chooses "Pass the rest", **Then**
   every unchecked part becomes Pass and parts that already have a condition keep it.
3. **Given** an inspection is in progress, **When** the user reloads or reopens the app
   without pressing Save, **Then** every condition, note, the vehicle type and the paint
   color are restored as they were.
4. **Given** an inspection is in progress, **When** the user chooses Save, **Then** the user
   sees a confirmation and the inspection is shown as finished. Making any further change
   returns it to in progress.

---

### User Story 4 - Navigate by zone and camera preset (Priority: P2)

The inspector filters the parts list by zone: All parts, Front, Top, Right side, Left side,
Rear or Wheels. Each zone shows how many of its parts are checked. Camera preset buttons (3/4,
Front, Right, Rear, Left, Top) swing the view to standard angles.

**Why this priority**: These make a full walk-around fast and orderly. They are conveniences on
top of direct picking.

**Independent Test**: Choose the "Wheels" zone. The list shows only the four wheels and the
zone shows "0/4". Choosing the "Rear" camera preset animates the car to a rear view.

**Acceptance Scenarios**:

1. **Given** a zone is chosen, **Then** the parts list shows only that zone's parts under the
   heading "<Zone> parts".
2. **Given** parts in a zone get conditions, **Then** that zone's "checked/total" count
   updates immediately.
3. **Given** any camera preset is chosen, **Then** the view animates smoothly to that angle,
   or jumps straight there when the user prefers reduced motion.

---

### User Story 5 - Switch vehicle type (Priority: P3)

The inspector picks the body style that matches the vehicle: SUV, Saloon, Hatch, Pickup or Van.
The 3D shape changes, and so does the parts list. For example, a Pickup has a load bed and cab
window and no rear quarter windows. A Van has sliding side doors and rear doors. A Saloon has a
boot lid instead of a tailgate.

**Why this priority**: This shows off the 3D model's range. It is the "car selector" part of
the demo, but one vehicle type already delivers a usable inspection.

**Independent Test**: Switch to Pickup. The model shows a cab and an open load bed, and the
list contains "Load bed" and "Rear cab window" but no quarter windows.

**Acceptance Scenarios**:

1. **Given** a vehicle type is chosen, **Then** the 3D model, part names and part count match
   that body style.
2. **Given** an inspection has recorded conditions, **When** the user switches vehicle type,
   **Then** the user is warned that the current inspection will be cleared and can cancel.
   If they confirm, the selection, conditions and notes reset.

---

### Edge Cases

- **No 3D support**: if the device or browser cannot render 3D, the model area shows a plain
  message ("3D view is not available here. Use the list.") and the inspection still works
  fully from the list.
- **3D context lost** (for example the GPU resets): the model recovers and redraws without
  losing the recorded conditions.
- **Drag versus tap**: a press that moves fewer than a few pixels counts as a tap. A longer
  movement rotates and does not select.
- **Hidden or obscured parts**: tapping selects the frontmost visible part. Parts that cannot
  be seen from the current angle can always be reached from the list.
- **Narrow screens** (phone width): the sidebar, model and parts panel stack vertically,
  nothing scrolls sideways, and vertical page scrolling still works over the model.
- **Every part already checked**: "Pass the rest" makes no changes.
- **Saved data unreadable or missing**: the app starts a fresh inspection without errors.
- **Callout near an edge**: the callout label flips to whichever side of the model gives it
  room.

## Requirements *(mandatory)*

### Functional Requirements

**3D model and interaction**

- **FR-001**: The app MUST display an interactive 3D car model made up of individually
  selectable parts. The SUV and Van use real models split into parts. The other body styles are
  drawn by the app as stylised shapes. The parts are: bumpers, grille and headlights, bonnet, windscreens, roof, wings, doors,
  side windows, quarter panels, tailgate or equivalent, and four wheels.
- **FR-002**: Users MUST be able to rotate the model by dragging with mouse, touch or pen. Tilt
  MUST be limited so the car never goes below ground level or past a top-down view.
- **FR-003**: Users MUST be able to select a part by tapping or clicking it on the model. The
  frontmost part under the pointer is selected.
- **FR-004**: The selected part MUST be visibly highlighted on the model, including an outline
  along its edges, and a callout label MUST show its name and condition.
- **FR-005**: With a mouse, the part under the pointer MUST be highlighted on hover and named in
  a hint line. Otherwise the hint line reads "Drag to rotate · Tap a part".
- **FR-006**: The app MUST provide six camera presets (3/4, Front, Right, Rear, Left, Top) that
  animate the view to that angle.
- **FR-007**: Selecting a part from the list MUST turn the camera to a view where that part is
  visible.
- **FR-008**: On load, the model MUST settle into a 3/4 view with a short introductory
  movement, which is skipped when the user prefers reduced motion.

**Inspection**

- **FR-009**: Users MUST be able to set a selected part's condition to Pass, Advisory or Damage.
  Choosing the active condition again MUST clear it.
- **FR-010**: Each part's condition MUST be shown on the model as a color tint, and in the list
  as a colored label and dot. Conditions MUST also be told apart by their text labels, not by
  color alone.
- **FR-011**: Users MUST be able to enter a free-text note for the selected part. Notes are kept
  per part.
- **FR-012**: Users MUST be able to clear the selected part's condition and note in one action.
- **FR-013**: The app MUST show overall progress as checked/total, a progress bar, and counts of
  Pass, Advisory and Damage.
- **FR-014**: Users MUST be able to mark all unchecked parts as Pass in one action ("Pass the
  rest") without changing parts already checked.
- **FR-015**: (Removed — demo.) The inspection is held in memory only; a reload starts fresh.

**Navigation and vehicles**

- **FR-016**: The sidebar MUST list zones (All parts, Front, Top, Right side, Left side, Rear,
  Wheels), each showing checked/total for its parts. Choosing a zone MUST filter the parts list.
- **FR-017**: Users MUST be able to choose among three vehicle types: SUV, Saloon and Van. Each has its own body shape and the parts that fit it (see User Story 5).
- **FR-018**: Switching vehicle type while an inspection holds data MUST ask for confirmation
  before clearing it.
- **FR-019**: The car's paint color MUST be configurable from a small preset set (grey, white,
  black). Grey is the default.
- **FR-020**: The header MUST show the vehicle registration, as a fictional demo value
  ("AB12 CDE") set in `src/demoDetails.ts` until a real one is supplied. No workshop name is
  shown (removed at the owner's request).

**Accessibility and resilience**

- **FR-021**: Everything that can be done on the model MUST also be possible with a keyboard
  through the zone list, parts list, camera presets and condition controls, with visible focus
  indicators.
- **FR-022**: The model area MUST have an accessible description explaining that it can be
  rotated and that every part is also in the list. Selection changes MUST be announced to
  assistive technology.
- **FR-023**: When 3D rendering is unavailable or fails, the app MUST show a fallback message
  and keep every list-based function working.
- **FR-024**: The layout MUST adapt from wide desktop (sidebar, model and parts panel side by
  side) to phone width (stacked), with no sideways scrolling and touch targets at least 44 px.

### Key Entities

- **Vehicle type**: a body style (SUV, Saloon, Hatch, Pickup, Van) that defines the model's
  shape, which parts exist, and any style-specific part names (Boot lid, Load bed, Sliding
  door).
- **Part**: one selectable region of the vehicle. It has a name, a zone, and a preferred camera
  angle for showing it.
- **Zone**: a grouping of parts (Front, Top, Right side, Left side, Rear, Wheels) used for
  filtering and progress.
- **Part condition**: the inspection state of one part: Not checked, Pass, Advisory or Damage.
- **Note**: free text attached to one part.
- **Inspection**: the set of conditions and notes for every part of one chosen vehicle type,
  plus the paint color, header details and a status (in progress or finished). It is the unit
  that is saved automatically and restored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can select a specific named part on the 3D model and record its
  condition within 30 seconds, without instructions.
- **SC-002**: A user can complete a full inspection of every part, using "Pass the rest" for
  the remainder, in under 3 minutes.
- **SC-003**: Rotation and camera transitions feel smooth on a typical laptop and a mid-range
  phone, with no visible stutter while dragging.
- **SC-004**: The interactive model is usable within 3 seconds of opening the app on a typical
  broadband connection.
- **SC-005**: From each of the six camera presets, tapping the on-screen centre of any part
  that is visible there selects that part.
- **SC-006**: The whole inspection can be completed with keyboard only, and with 3D disabled.
- **SC-007**: (Removed — nothing is saved in the demo.)

## Assumptions

- **Demo scope**: this is a single-user, front-end-only demo. There is no login, no server and
  no sharing of inspections. The inspection is stored only on the user's device. Exporting or
  printing reports is out of scope. So is a car showroom or picker for browsing, comparing or
  configuring cars.
- **Procedural vehicles**: the vehicles are simplified, stylised 3D shapes generated by the
  app, as in the inspiration. They are not licensed manufacturer models and need no downloaded
  model files.
- **One inspection at a time**: there is one current inspection, saved over itself as it
  changes. Inspection history is out of scope.
- **Placeholders**: the workshop name and vehicle registration show as placeholders, and
  editing them is out of scope for this feature. The "Guide" link in the sidebar is a
  placeholder that leads nowhere yet.
- **Language and terms**: the interface is in English and uses UK vehicle terms (bonnet, boot,
  windscreen, wing), as in the inspiration.
- **Visual style**: the light, neutral grey interface with a single blue accent, Inter type and
  segmented controls follows the inspiration.
- **Browsers**: current versions of the major desktop and mobile browsers.
- **Vehicle switch**: the inspiration resets an inspection silently when the vehicle type
  changes. This spec adds a confirmation step (FR-018) to avoid losing work by accident.
