# Obstacle robot arena — 8 October 2026

The `/3d-lab#robot-arena` section provides a first working robot control preview. It is independent of the movable breadboard branch; that branch has not been merged or overwritten.

## Available

- Seven assembly groups: Uno, chassis, geared motors, wheels/caster, L298N, HC-SR04, motor battery.
- A visual parts tray, snap mounting zones and terminal connections gate Start. Correctly mounted parts appear in the optional Three.js robot view.
- 200 × 200 cm arena with boundary collision protection, up to 20 obstacle blocks, click/touch positioning, coordinate inputs for keyboard placement, remove and clear controls.
- A forward ultrasonic ray detects the nearest block or wall. The robot moves forward or turns right at the selected threshold. Collision protection prevents penetration, including after long browser pauses.
- Start, Stop and Reset. Editing obstacles and assembly is disabled while running.
- Adjustable 15–50 cm avoidance distance; generated downloadable Uno `.ino` uses D9 trigger, D8 echo, D4–D7 driver inputs.
- Three.js loads only when Launch robot 3D is selected. The top view remains usable without WebGL. Closing releases scene resources.

## Boundaries

Assembly uses a draggable top-view mounting plan with snap zones and rotation checks. Wire continuity is checked against the supported fixed-speed Uno robot netlist, including shorts, wrong connections and missing shared ground. Routing lines are schematic overlays, not exact physical cable placement. Voltage/current, component tolerances and battery ratings are not simulated. The arena executes its own control model, not arbitrary uploaded or edited Arduino code. The existing LED/button firmware emulator is separate. The simulation does not model driver voltage drop, motor current, battery sag, slip, sonar cone/reflections or servo scanning. The exported program stops on missing echo; the bounded virtual arena always supplies a geometric range. Firmware was not compiled or bench tested for this release.

Before a real build, match supply voltage/current to the motors, battery and driver; verify module regulator/jumper requirements; connect common ground; never power motors from GPIO. Verify motor direction with wheels lifted. Physical sensor and motor behaviour need bench validation.

## Next implementation stages

1. Integrate the movable breadboard branch after resolving overlap with main's lifecycle and save fixes.
2. Extend the visual mounting plan and topology validator into direct 3D placement, manufacturing-specific attachment points and module power-rating checks.
3. Connect AVR GPIO motor outputs and HC-SR04 echo timing to the arena so arbitrary compiled Uno firmware drives motion.
4. Add save/import/export of robot assemblies and arena layouts.
5. Expand validated components by family: passive parts, switches, ultrasonic/temperature/light sensors, servos/DC motors, motor drivers, buzzers/displays, then communications. Publish supported behaviour per component; catalog availability alone does not mean simulated.
6. Compare generated and arbitrary firmware against a physical Uno robot, then test affordable Android devices and intermittent network conditions.

## Checks

Unit coverage tests ray geometry, obstacle avoidance, collision/frame limits and generated code. Browser coverage verifies assembly gating, actual WebGL canvas creation using version-matched local Three.js, obstacle controls, moving coordinates, Stop/Reset and `.ino` download. Existing Lab suites remain included. Software rendering is not a physical phone performance benchmark.

## Recognisable hardware models

The robot now uses detailed procedural models with USB/DC connectors and headers on Uno, a heatsink and screw terminals on the driver, twin ultrasonic transducers, TT-style geared motors, wheel hubs/caster and a generic battery holder. Labels identify the firmware's pins. Inspect robot parts changes the camera to a close view; orbit/zoom remains available. Textures are released with scene cleanup.

Uno's PCB footprint is based on Arduino's published 68.6 × 53.4 mm specification: https://store.arduino.cc/products/arduino-uno-rev3-smd . The ST L298 datasheet describes the IC, not a standardised breakout board: https://www.st.com/resource/en/datasheet/l298.pdf . Breakout, sensor, motor, battery and chassis geometry is illustrative. Pin positions, hole spacing, motor ratings and module variants are not manufacturing CAD or bench-validated electrical twins.

## Visual assembly and validated wiring

Checklist assembly has been replaced by seven selectable/draggable part groups, matching snap targets, quarter-turn rotation, remove controls and labelled terminal buttons. Terminal pairs create removable wires. The validator traces electrical continuity so shared ground can pass through intermediate ground terminals. It rejects unknown terminals, Uno 5V-to-ground, motor positive-to-ground, motor supply-to-Uno 5V and other cross-net links, and reports missing required paths. Start requires seven correctly mounted parts and a passing supported circuit. Removing a part also removes its wires. Keyboard and touch users can select and attach parts without dragging. Driver ENA/ENB are assumed enabled and Uno separately regulated; these assumptions are visible.
