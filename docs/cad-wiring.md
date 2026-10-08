# CAD wiring and circuit preview

CAD now places the component library, 3D canvas, terminal controls and circuit preview beside each other. Laptop focus mode keeps the canvas and Run/Stop controls visible; long panels scroll independently. Phones stack the panels inside the workspace.

To wire, choose a component in **Component to wire**, tap its terminal, choose the destination component, then tap its terminal. Alternatively, launch CAD and enable **Wire mode** to tap or drag between the coloured 3D terminal markers. Hover identifies a terminal; **Zoom selected** and **Fit assembly** help inspect small parts. Dropping in empty space cancels a cable. Duplicate connections do not add another cable. Hiding a part disables its terminal controls.

Cables now terminate at local terminal positions on the representative models and follow part translations and rotations. Pin positions on generic and legacy models are schematic; they are not manufacturer-certified dimensions. The named endpoint remains the source of electrical topology.

Choose **CAD test project**, then **Load selected circuit example** or **Start empty circuit project**. Empty projects retain the required-parts list and connection schedule. Examples and edits are undoable; saves retain the project, wires and sketch.

The supported previews are:
- Uno LED blink: D8 drives a red LED through a 330 Ω resistor.
- Battery LED: two AA cells (about 3 V) drive an LED through the resistor; the LED stays on while running.
- Push-button light: D2 uses the internal pull-up; pressing the grounded button lights the D8 LED.
- Button alarm: the same D2 input controls a low-current D8 piezo. Press the test button or click its model while running. **Enable alarm sound** opts into a synthesised 1 kHz tone; volume and mute are available.

Check/Run rejects missing parts, disconnected or incorrect networks, power-to-ground shorts, LED polarity errors and unsupported sketches. Reversed resistor leads and switch contacts are equivalent. Stop, assembly edits and leaving CAD turn outputs and audio off. **Load LED circuit example** remains a shortcut to the blink project; **New empty project** starts with no parts.

These are wiring and supported-logic previews, not measured electrical simulations: no voltage/current, heat, component damage or arbitrary firmware execution. Generic boards, motors and sensors remain design-only in CAD. Use Robot Builder for the obstacle-avoiding robot arena.
