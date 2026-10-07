export type ComponentPinout = {
  slug: string;
  title: string;
  orientationNote: string;
  pins: { label: string; role: string; caution?: string }[];
};

export const componentPinouts: ComponentPinout[] = [
  {
    slug:"led",
    title:"LED polarity",
    orientationNote:"For a common through-hole LED, polarity can often be identified by lead length and body shape, but verify the actual part before power.",
    pins:[
      {label:"Anode (+)",role:"Positive LED lead; connect toward the GPIO/supply through a current-limiting resistor."},
      {label:"Cathode (-)",role:"Negative LED lead; connect toward GND in the beginner circuit."},
    ],
  },
  {
    slug:"push-button",
    title:"Tactile push-button contacts",
    orientationNote:"Many 4-leg tactile switches internally join the two legs on each side. Rotate/verify with continuity if the package differs.",
    pins:[
      {label:"Side A pair",role:"Internally common on many tactile switches."},
      {label:"Side B pair",role:"Internally common on many tactile switches; pressing connects Side A to Side B."},
    ],
  },
  {
    slug:"ldr",
    title:"LDR leads",
    orientationNote:"A typical photoresistor has two non-polarised leads.",
    pins:[
      {label:"Lead 1",role:"Either side of the voltage divider."},
      {label:"Lead 2",role:"The other side of the voltage divider."},
    ],
  },
  {
    slug:"dht11-dht22",
    title:"Bare DHT11/DHT22 pin roles",
    orientationNote:"For the common bare 4-pin package, verify the front/label side before using the common VCC/DATA/NC/GND arrangement. Breakout modules may expose only 3 pins and may reorder them.",
    pins:[
      {label:"VCC",role:"Sensor supply (use the board-appropriate supply)."},
      {label:"DATA",role:"Digital temperature/humidity data line.",caution:"A bare sensor commonly needs a pull-up resistor."},
      {label:"NC",role:"Not connected on the common bare 4-pin package."},
      {label:"GND",role:"Ground."},
    ],
  },
  {
    slug:"hc-sr04",
    title:"HC-SR04 labelled pins",
    orientationNote:"Read the labels printed on the exact module. The common labels are VCC, TRIG, ECHO and GND.",
    pins:[
      {label:"VCC",role:"5 V sensor supply on the common HC-SR04."},
      {label:"TRIG",role:"Trigger input from the controller."},
      {label:"ECHO",role:"Echo pulse output.",caution:"Common HC-SR04 ECHO is a 5 V signal; protect 3.3 V GPIO."},
      {label:"GND",role:"Ground."},
    ],
  },
  {
    slug:"servo",
    title:"Hobby servo connections",
    orientationNote:"Wire colours vary by manufacturer. Identify signal, V+ and GND from the servo documentation/label rather than relying on colour alone.",
    pins:[
      {label:"Signal",role:"Position-control pulse from the microcontroller."},
      {label:"V+",role:"Servo power supply.",caution:"Use a supply with enough current; do not power a loaded servo from GPIO."},
      {label:"GND",role:"Servo ground; share ground with the controller when using an external supply."},
    ],
  },
  {
    slug:"l298n",
    title:"Common L298N module labels",
    orientationNote:"L298N carrier modules differ. Follow the silk-screen labels on the exact board; do not assume the regulator/5 V jumper arrangement.",
    pins:[
      {label:"IN1 / IN2",role:"Direction inputs for Motor A."},
      {label:"IN3 / IN4",role:"Direction inputs for Motor B."},
      {label:"ENA / ENB",role:"Enable/PWM inputs on common modules."},
      {label:"OUT1 / OUT2",role:"Motor A outputs."},
      {label:"OUT3 / OUT4",role:"Motor B outputs."},
      {label:"Motor supply / GND",role:"Motor power input and common ground.",caution:"Verify the exact module voltage and jumper configuration before connecting power."},
    ],
  },
  {
    slug:"hc05",
    title:"Common HC-05 carrier labels",
    orientationNote:"HC-05 carrier boards vary. Read the labels on the actual board and verify its supply requirement.",
    pins:[
      {label:"TXD",role:"Serial data out from the HC-05 to the controller RX."},
      {label:"RXD",role:"Serial data into the HC-05.",caution:"Protect RXD from 5 V controller logic unless the exact carrier documentation confirms input protection."},
      {label:"VCC",role:"Module/carrier supply; verify the exact breakout."},
      {label:"GND",role:"Ground."},
      {label:"EN / KEY",role:"Configuration/AT-mode control on many carrier boards."},
      {label:"STATE",role:"Connection-state output on many carrier boards."},
    ],
  },
  {
    slug:"dc-motor",
    title:"DC motor terminals",
    orientationNote:"A basic brushed DC motor has two power terminals. Swapping the two motor wires reverses rotation.",
    pins:[
      {label:"Motor terminal A",role:"Connect to one motor-driver output."},
      {label:"Motor terminal B",role:"Connect to the other motor-driver output."},
    ],
  },
];

export function pinoutFor(slug: string) {
  return componentPinouts.find((item) => item.slug === slug);
}
