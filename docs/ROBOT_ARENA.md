# Obstacle robot arena — 8 October 2026

The `/3d-lab#robot-arena` section provides a first working robot control preview. It is independent of the movable breadboard branch; that branch has not been merged or overwritten.

## Available

- Seven assembly groups: Uno, chassis, geared motors, wheels/caster, L298N, HC-SR04, motor battery.
- Assembly and wiring-review checklists gate Start. Parts appear in the optional Three.js robot view as they are assembled.
- 200 × 200 cm arena with boundary collision protection, up to 20 obstacle blocks, click/touch positioning, coordinate inputs for keyboard placement, remove and clear controls.
- A forward ultrasonic ray detects the nearest block or wall. The robot moves forward or turns right at the selected threshold. Collision protection prevents penetration, including after long browser pauses.
- Start, Stop and Reset. Editing obstacles and assembly is disabled while running.
- Adjustable 15–50 cm avoidance distance; generated downloadable Uno `.ino` uses D9 trigger, D8 echo, D4–D7 driver inputs.
- Three.js loads only when Launch robot 3D is selected. The top view remains usable without WebGL. Closing releases scene resources.

## Boundaries

Assembly is a guided checklist, not draggable chassis assembly or electrical net validation. Reviewed wiring is not automatically measured. The arena executes its own control model, not arbitrary uploaded or edited Arduino code. The existing LED/button firmware emulator is separate. The simulation does not model driver voltage drop, motor current, battery sag, slip, sonar cone/reflections or servo scanning. The exported program stops on missing echo; the bounded virtual arena always supplies a geometric range. Firmware was not compiled or bench tested for this release.

Before a real build, match supply voltage/current to the motors, battery and driver; verify module regulator/jumper requirements; connect common ground; never power motors from GPIO. Verify motor direction with wheels lifted. Physical sensor and motor behaviour need bench validation.

## Next implementation stages

1. Integrate the movable breadboard branch after resolving overlap with main's lifecycle and save fixes.
2. Add actual component placement, chassis attachment points, pin-to-pin wires and validated robot power nets.
3. Connect AVR GPIO motor outputs and HC-SR04 echo timing to the arena so arbitrary compiled Uno firmware drives motion.
4. Add save/import/export of robot assemblies and arena layouts.
5. Expand validated components by family: passive parts, switches, ultrasonic/temperature/light sensors, servos/DC motors, motor drivers, buzzers/displays, then communications. Publish supported behaviour per component; catalog availability alone does not mean simulated.
6. Compare generated and arbitrary firmware against a physical Uno robot, then test affordable Android devices and intermittent network conditions.

## Checks

Unit coverage tests ray geometry, obstacle avoidance, collision/frame limits and generated code. Browser coverage verifies assembly gating, actual WebGL canvas creation using version-matched local Three.js, obstacle controls, moving coordinates, Stop/Reset and `.ino` download. Existing Lab suites remain included. Software rendering is not a physical phone performance benchmark.
