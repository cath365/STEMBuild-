# Full-window electronics workspaces

Circuit Builder and Robot Builder share a full-window workspace. Selecting a builder tab or using **Open full workspace** keeps the canvas and primary controls in the laptop viewport. **Back to lab page** or Escape restores the page without resetting the project. Keyboard focus stays inside the open workspace.

Long component, wiring and code panels scroll independently. Small phone screens use contained scrolling rather than promising every control will fit at once.

Robot assembly now uses hardware previews for the Uno, geared motors, wheels, motor driver, ultrasonic sensor and battery, with an original mechanical chassis drawing. The 3D robot has a shaped acrylic chassis, mounting holes, raised tyre treads and existing board, connector and sensor details. These are representative educational models, not manufacturer-certified engineering dimensions or photographs.

SVG pointer positions use the rendered SVG transformation, keeping dragging and obstacle placement accurate when the workspace resizes. Existing wiring validation, simulation gating, project storage, backups and opt-in alarm audio are preserved.

Validation: production build, 66 unit tests and 22 browser tests passed, including 1366 × 768 viewport checks, terminal cable dragging, alarm cleanup, robot assembly and motion, WebGL rendering, CAD editing and saved-project restoration.
