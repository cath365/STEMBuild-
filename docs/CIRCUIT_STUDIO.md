# Circuit Studio

The Circuit Builder retains the existing hole-level breadboard workshop and adds five distinct direct-terminal kits: LED blink, push-button light, traffic lights, a button alarm and a 3 V battery LED. Each starts empty. Learners add components, reposition them, connect named pins, check the circuit and run a supported logic preview. Optional examples, undo, per-project device saves, validated JSON import/export and downloadable Arduino sketches support classroom work.

Component images use the original compact CAD model renders already included with STEMBuild. They represent recognisable hardware, not manufacturer-certified models or photographs. Labelled terminals in this direct-terminal layout are connection controls, not exact physical pin positions. The breadboard workshop remains available for physical hole and bus practice.

Validation compares complete electrical nets against each supported circuit and rejects open paths, incorrect polarity, bypassed resistors, output-to-ground shorts and extra connections. Code previews accept only the supplied sketch structure, with numeric delay edits from 50 to 60000 ms. No arbitrary firmware, analogue voltage/current calculation, heat calculation is implemented here. The button alarm includes optional browser-generated 1 kHz audio for a low-current piezo; unknown or high-current sounders need a suitable driver.

Projects use a separate versioned `stembuild-circuit-studio-v1` device save. Existing breadboard, guided lessons, robot and CAD saves are unaffected. Malformed saves are retained and automatic overwriting is disabled. Backups are validated for project identity, known parts and pins, finite bounded positions and file size. Edits and mode changes stop previews. Keyboard pin selection and position buttons complement pointer dragging. Phone canvas scrolling stays contained within the workbench.

## Cable interaction and laptop layout

Drag from a labelled terminal to another terminal to plug in a cable. A live cable follows the pointer, and a nearby destination highlights before release. Empty-space drops cancel; duplicate and self-connections do not add wires. Tap-to-connect and keyboard Enter/Space remain available. Part bodies continue to drag for repositioning. Pointer capture and SVG coordinate transforms preserve accuracy when the viewport changes. Blue, teal, orange and navy cable colours are saved as an optional validated v1 wire field, so older backups still open.

The laptop workbench uses available width up to 1600 px. At 1280 px and wider, check/test and sketch controls move into a right sidebar beside the component and wiring panels. Phone layouts stay stacked with contained canvas scrolling.

Alarm audio starts muted. The learner must explicitly enable sound to create/resume an AudioContext. A low-volume square-wave oscillator runs only while a validated alarm preview is active and its button is pressed. Mute, Stop, edits, project/mode changes and unmount stop/disconnect the tone. The volume control caps output gain at 0.08. Audio is synthesised feedback, not a physical acoustic model. LEDs remain silent.

The battery LED kit uses two AA cells (approximately 3 V), a 330 Ω series resistor and a red LED. Its preview checks steady-light topology without executing firmware or calculating electrical load. The notes download as text rather than an Arduino sketch. Power-terminal shorts and resistor bypasses block running.
