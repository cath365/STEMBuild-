# STEMBuild 3D Lab — Real Engine

This document describes the first real-engine layer behind STEMBuild 3D Lab.

## Two execution modes

### Fast Simulation

Fast Simulation is the low-data educational mode. It validates the current project assembly, reviewed wiring graph and the subset of Arduino source needed by the activity. It stays available for learners on slower or more expensive connections.

### Full Firmware Mode

Full Firmware Mode is opt-in. For the current Arduino Uno projects it:

1. Takes the learner's Arduino source.
2. Mirrors Arduino's standard `Arduino.h` include step when it is absent.
3. Compiles the source in the browser with AVR GCC/binutils WebAssembly.
4. Produces real Intel HEX for an ATmega328P / Arduino Uno target.
5. Loads that HEX into AVR8js.
6. Runs the ATmega328P machine code with AVR timers and GPIO simulation.
7. Maps Arduino D8 (PB0) to the virtual LED.
8. Maps Arduino D2 (PD2) to the virtual push button for the button project.

The learner's exported `.ino` is not replaced with a different STEMBuild language.

## Bandwidth

The browser AVR compiler is deliberately not part of the normal STEMBuild bundle. Its upstream compiler + Arduino assets are large (roughly 55 MB before normal HTTP caching/compression effects). They load only when a learner explicitly chooses Full Firmware Mode.

This protects the normal learner experience and keeps Fast Simulation suitable for lower-bandwidth use.

## 3D rendering

The default lab workbench uses Three.js/WebGL.

Current physical representations:

- **Arduino Uno R3:** glTF educational model using the official 68.6 mm × 53.4 mm board footprint. Major physical features are represented so the board is recognisable.
- **Breadboard:** reusable glTF educational model with representative full-size breadboard dimensions.
- **330 Ω axial resistor:** dimensioned procedural 3D geometry with colour bands.
- **5 mm LED:** dimensioned procedural 3D geometry with unequal leads.
- **6 mm tactile button:** dimensioned procedural 3D geometry.

These models are for learning and assembly recognition. A generic model is not a claim that every manufacturer, clone, header, button or breadboard has identical mechanical geometry.

## Wiring in 3D

Reviewed terminals are rendered as clickable 3D nodes. Selecting two valid nodes creates the reviewed electrical connection as a 3D wire. Invalid terminal pairs are rejected by the same project connection graph used by the guided wiring list.

## External runtime libraries

The real-engine preview intentionally lazy-loads the following only in the browser:

- Three.js — MIT licensed
  - https://github.com/mrdoob/three.js
- AVR8js — MIT licensed
  - https://github.com/wokwi/avr8js
- @horang-corp/avr-gcc-wasm — browser AVR GCC/binutils toolchain
  - https://github.com/horang-corp/avr-gcc-wasm
  - Its third-party notice identifies GCC/binutils WebAssembly artifacts as GPLv3-or-later and includes avr-libc / Arduino upstream notices.

STEMBuild does not modify those remote toolchains in this integration. The toolchain is requested only when Full Firmware Mode is selected.

## What “simulation passed” means

A successful Full Firmware run proves substantially more than a visual animation:

- the sketch compiled for the Uno-class AVR target,
- the generated program fits the target flash budget,
- ATmega328P machine code executed,
- GPIO state from the running firmware drove the simulated component,
- and the STEMBuild wiring graph matched the project's required connections.

It still does **not** prove that a physical build will work. Physical validation remains necessary because real batteries, loose connections, sensor noise, component tolerances, motor current, module revisions and mechanical assembly can change behaviour.

## Current scope

The first real-firmware projects are:

- LED Blink — D8 / PB0 output.
- Push-Button Light — D2 / PD2 input with `INPUT_PULLUP`, D8 / PB0 output.

The architecture is intended to grow toward HC-SR04, servo, motor driver and robot projects after these first two firmware paths are physically benchmarked and tested across phones and desktop browsers.
