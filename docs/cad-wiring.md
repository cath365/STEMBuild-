# CAD wiring and circuit preview

CAD now places the component library, 3D canvas, terminal controls and circuit preview beside each other. Laptop focus mode keeps the canvas and Run/Stop controls visible; long panels scroll independently. Phones stack the panels inside the workspace.

To wire, choose a component in **Component to wire**, tap its terminal, choose the destination component, then tap its terminal. Alternatively, launch CAD and enable **Wire mode** to tap or drag between the coloured 3D terminal markers. Hover identifies a terminal; **Zoom selected** and **Fit assembly** help inspect small parts. Dropping in empty space cancels a cable. Duplicate connections do not add another cable. Hiding a part disables its terminal controls.

Cables now terminate at local terminal positions on the representative models and follow part translations and rotations. Pin positions on generic and legacy models are schematic; they are not manufacturer-certified dimensions. The named endpoint remains the source of electrical topology.

**Load LED circuit example** provides a working Uno, 330 Ω resistor and red LED circuit. **New empty project** still starts with no parts. Example loading is undoable. Check/Run validates the D8 series circuit and blinks the LED in 3D. Editing stops the preview; saves retain the wires and sketch.

The CAD preview still supports the reviewed Uno LED blink circuit only. Other boards, motors and sensors can be assembled and wired but are not automatically simulated. Use Robot Builder for the obstacle-avoiding robot arena and Circuit Builder for its other supported circuit projects. CAD does not execute arbitrary firmware or calculate voltage/current.
