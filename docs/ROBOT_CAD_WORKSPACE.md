# Robotics CAD assembly workspace

The `/3d-lab#robot-cad` section adds a mechanical assembly editor separate from the obstacle arena. Launch CAD workspace loads Three.js, OrbitControls and TransformControls only when requested. If WebGL or CDN access fails, numeric editing, device saving and assembly import/export remain available.

## Editing

- Select a model from the assembly tree or click its mesh in the 3D scene.
- Move it with X/Y/Z translation handles; rotate with the rotation gizmo.
- Enter position offsets in centimetres and rotations in degrees.
- Optional 0.5 cm translation and 15-degree rotation snapping.
- Top, front, side and perspective camera positions; orbit and zoom.
- Snap to reference mount restores the model's default mounting pose. It does not find physical mounting holes or validate fasteners.
- Hide/show parts, undo/redo up to 50 edits.
- Save/load on the device, export/import a validated version-1 STEMBuild assembly JSON file. Import rejects malformed parts, nonfinite numbers, unsupported versions and coordinates outside ±360.
- Rendered model bounding dimensions omit labels. Electronics overlap checks use bounding boxes for Uno, driver, battery holder and sensor, omitting chassis/wheels/motors because their reference assemblies intentionally contact.

## Accuracy boundaries

This is a focused component assembly editor, not an AutoCAD replacement. Models, transforms and measurement units are real scene data, but generic kit shapes are illustrative. Camera presets use a perspective camera. There is no custom solid modelling, manufacturing constraint solver, shaft/hole attachment solver, precise collision mesh, DWG/STEP export or firmware-controlled CAD simulation. Electrical validation and robot-control testing remain in the separate builder/arena. CAD edits do not modify that arena's model or certify a physical assembly.

The Uno PCB footprint follows published dimensions. Component envelopes include ports/headers and other geometry, so rendered bounds differ from PCB-only measurements. Exact physical twins require the chosen kit's datasheets, dimensions and bench checks.

## Verification

Unit checks exercise immutable edits and invalid import rejection. Browser checks use actual Three.js and TransformControls with matching local bundles and software WebGL: numeric edits alter the actual selected model position, undo/redo restore it, device saves load correctly, camera views and overlap checks work, and closing releases the canvas. Existing robot wiring/movement and LED/firmware lifecycle suites remain included. Physical mobile performance and manufacturing fit have not been validated.

## Expandable component library

The CAD editor now supports 22 searchable generic component types, repeated instances, labelled terminal pairs and removable assembly wires. Saved legacy seven-part assemblies remain valid. Library instances append to the assembly; files and autosaves retain each type, transform and wire endpoint. The renderer adds/releases instance geometry when undo/redo or imports change the list.

The library covers controllers, prototyping, passive parts, inputs, sensors, actuators, drivers, outputs, displays, communications and power. Pin lists are a selected educational subset, not full pinouts. Models are illustrative generic envelopes. Breadboard layout models expose rail labels only; the separate hole workshop provides its supported electrical hole topology. CAD wire curves route between model origins, not precise physical connector positions. Colours identify layout routes; these new wires have no electrical solver or firmware behaviour. The existing guided LED and obstacle robot simulations remain separate.

An assembly supports 100 total parts and 300 wires to bound import size and rendering work on phones. This is an expandable catalogue, not a claim of unlimited components or universal simulation. Add a catalogue definition and model adapter for further types, followed by manufacturer pinout review, physical validation and simulation implementation as required.
