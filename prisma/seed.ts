import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const lessons = [
  {
    module: "Introduction to electronics",
    slug: "introduction-to-electronics",
    objective: "Identify basic electronic quantities, common components and safe low-voltage working practices.",
    theory: "Electronics uses controlled movement of electric charge to create useful behavior. Voltage is electrical potential, current is the flow of charge, and resistance limits current. Beginners should first recognize power rails, polarity and component ratings before building powered circuits.",
    safety: "Work only with low-voltage DC classroom supplies. Disconnect power before changing wiring. Never connect mains electricity to a breadboard or microcontroller.",
    challenge: "Sort a small set of components by function, identify polarity where relevant, and explain which parts control, sense, indicate or supply power.",
    output: "A correctly identified component set and a short explanation of voltage, current and resistance.",
    troubleshoot: "If a component is unfamiliar, read its marking and datasheet before powering it. If a circuit becomes hot or smells unusual, disconnect power immediately and ask a teacher to inspect it.",
    quiz: [
      ["Which quantity describes electrical potential difference?", ["Voltage", "Current", "Resistance", "Power"], "Voltage"],
      ["What should you do before changing breadboard wiring?", ["Increase voltage", "Disconnect power", "Short the rails", "Touch both rails"], "Disconnect power"],
    ],
  },
  {
    module: "Breadboards and jumper wires",
    slug: "breadboards-and-jumper-wires",
    objective: "Use breadboard rows, power rails and jumper wires to make reliable temporary connections.",
    theory: "A solderless breadboard connects groups of holes internally. The center terminal strips are normally connected in short rows, while side rails are commonly used for power. Some breadboards split the power rail in the middle, so continuity should be checked rather than assumed.",
    safety: "Keep power disconnected while moving jumpers. Use consistent rail conventions and check for accidental shorts before powering the circuit.",
    challenge: "Create a powered breadboard layout with clearly separated positive and ground rails, then use a continuity test to verify the intended connections.",
    output: "A neat breadboard layout with verified rails and no short circuit.",
    troubleshoot: "If a rail is not continuous, bridge the split section with a jumper. If components seem unpowered, trace ground first, then the positive rail.",
    quiz: [
      ["Why should breadboard rails be checked for continuity?", ["All rails are always broken", "Some rails are split", "Jumpers need AC", "Resistors block rails"], "Some rails are split"],
      ["What is the safest state while moving jumper wires?", ["Power disconnected", "Maximum voltage", "Motor running", "USB and battery together"], "Power disconnected"],
    ],
  },
  {
    module: "LEDs and resistors",
    slug: "leds-and-resistors",
    objective: "Build a current-limited LED circuit and explain LED polarity and resistor purpose.",
    theory: "An LED is polarized: current normally flows from anode to cathode. A series resistor limits current so the LED and microcontroller pin are protected. Typical classroom values such as 220–330 ohms are often suitable for indicator LEDs, but exact current depends on supply and LED forward voltage.",
    safety: "Never connect an LED directly across a supply or GPIO pin without a suitable current-limiting resistor. Check polarity before power-up.",
    challenge: "Wire an LED with a resistor and make it blink once per second from a digital output.",
    output: "The LED blinks at a steady one-second interval without overheating.",
    troubleshoot: "If the LED stays off, reverse its polarity, verify the resistor is in series, confirm ground is shared and check that the selected GPIO matches the code.",
    quiz: [
      ["Why is a resistor placed in series with an LED?", ["To limit current", "To increase voltage", "To store code", "To make AC"], "To limit current"],
      ["Which LED lead is normally the positive side?", ["Anode", "Cathode", "Ground", "Shield"], "Anode"],
    ],
  },
  {
    module: "Digital input/output",
    slug: "digital-input-output",
    objective: "Configure digital GPIO pins as inputs or outputs and reason about HIGH and LOW states.",
    theory: "Digital GPIO uses discrete logic states. Outputs drive a voltage level; inputs read a level. A floating input can change unpredictably, so pull-up or pull-down resistors provide a known default state.",
    safety: "Never apply a voltage above the microcontroller GPIO rating. ESP32-class boards use 3.3 V logic and are not generally 5 V tolerant.",
    challenge: "Configure one output LED and one digital input. Change the LED state based on the input state.",
    output: "The output responds predictably to HIGH and LOW input states.",
    troubleshoot: "If the input flickers, use an internal/external pull resistor. If the logic is reversed, inspect whether INPUT_PULLUP is being used.",
    quiz: [
      ["What problem can a floating digital input cause?", ["Unpredictable readings", "More memory", "Faster Wi-Fi", "Higher resistance only"], "Unpredictable readings"],
      ["Which component provides a default logic state?", ["Pull resistor", "Motor", "Buzzer", "USB cable"], "Pull resistor"],
    ],
  },
  {
    module: "Push buttons",
    slug: "push-buttons",
    objective: "Read a momentary push button reliably using a defined input state.",
    theory: "A push button temporarily connects or disconnects contacts. With an internal pull-up, the input normally reads HIGH and becomes LOW when the button connects it to ground. Real buttons can bounce briefly, so software or hardware debouncing may be needed.",
    safety: "Connect the button only between compatible logic rails/GPIO and ground. Do not short the supply rail through the switch.",
    challenge: "Use a push button to toggle or control an LED and record the input state in the serial monitor.",
    output: "Button presses change the LED state and serial readings consistently.",
    troubleshoot: "If every press registers several times, add a small debounce delay or state-change logic. If it never changes, check the button orientation and pull configuration.",
    quiz: [
      ["With INPUT_PULLUP, what does a pressed button often read when wired to ground?", ["LOW", "HIGH", "Analog only", "Undefined always"], "LOW"],
      ["What is switch bounce?", ["Rapid contact transitions during a press", "A motor fault", "Excess Wi-Fi traffic", "A broken resistor"], "Rapid contact transitions during a press"],
    ],
  },
  {
    module: "Buzzers",
    slug: "buzzers",
    objective: "Control a low-power buzzer and distinguish simple on/off drive from tone generation.",
    theory: "Active buzzers contain an oscillator and can sound from a DC on/off signal. Passive piezo buzzers need a changing waveform to create a tone. The microcontroller pin must stay within its current limit; higher-current sounders need a transistor driver.",
    safety: "Do not connect high-current buzzers directly to GPIO. Keep sound levels reasonable in a classroom and avoid continuous loud tones near ears.",
    challenge: "Generate a short audible alert pattern and stop it automatically after the defined sequence.",
    output: "A repeatable two- or three-tone/beat alert occurs without the GPIO or buzzer overheating.",
    troubleshoot: "If there is no sound, verify whether the buzzer is active or passive, check polarity on polarized buzzers and confirm the correct pin/tone function.",
    quiz: [
      ["What does a passive piezo buzzer typically need?", ["A changing waveform", "Mains power", "A GPS signal", "A photoresistor"], "A changing waveform"],
      ["When should a transistor driver be considered?", ["When the load current exceeds GPIO capability", "For every jumper wire", "Only for quizzes", "When no power is used"], "When the load current exceeds GPIO capability"],
    ],
  },
  {
    module: "Sensors",
    slug: "sensors",
    objective: "Read a sensor value, convert it into meaningful information and identify noisy or invalid readings.",
    theory: "Sensors convert physical conditions into electrical signals. Analog sensors produce a range of values; digital sensors provide discrete states or encoded data. Good sensor work includes calibration, sensible sampling and checking for impossible values.",
    safety: "Confirm the sensor supply and signal voltage before connection. Do not send a 5 V output into a 3.3 V-only input without level shifting or a divider where required.",
    challenge: "Read an analog light or position sensor, print the raw value and trigger an LED when the value crosses a chosen threshold.",
    output: "The serial output changes with the sensor and the indicator responds around the selected threshold.",
    troubleshoot: "If the value never changes, verify the analog-capable pin, ground reference and voltage divider. If readings jump excessively, inspect loose wires and average several samples.",
    quiz: [
      ["What should happen before connecting a sensor signal to a 3.3 V-only MCU?", ["Check its output voltage", "Remove ground", "Increase it to 12 V", "Disable all code"], "Check its output voltage"],
      ["What can reduce random variation in an analog reading?", ["Averaging several samples", "Removing the sensor", "Shorting the input", "Using mains voltage"], "Averaging several samples"],
    ],
  },
  {
    module: "Motors and motor drivers",
    slug: "motors-and-motor-drivers",
    objective: "Drive a DC motor safely through a motor driver and control direction without powering the motor from GPIO.",
    theory: "DC motors can draw far more current than a microcontroller pin can supply and generate electrical noise. A motor driver such as an H-bridge switches motor current from a separate supply while receiving low-current control signals from the microcontroller.",
    safety: "Never power a DC motor directly from a GPIO pin. Use a correctly rated motor supply and driver, share ground where required, and disconnect power before rewiring the motor stage.",
    challenge: "Use a motor driver to run one DC motor forward, stop it, then run it in reverse.",
    output: "The motor changes direction under software control while the microcontroller remains stable.",
    troubleshoot: "If the MCU resets, inspect power separation and motor noise. If direction is wrong, swap motor leads or logic direction. If the motor does not turn, verify driver enable state and motor supply.",
    quiz: [
      ["Why is a motor driver used?", ["A motor needs more current than GPIO can safely provide", "To store quiz answers", "To increase Wi-Fi range", "To replace the battery"], "A motor needs more current than GPIO can safely provide"],
      ["What connection is commonly required between MCU and motor-driver supplies?", ["Common ground", "Common antenna", "USB data only", "No electrical reference"], "Common ground"],
    ],
  },
  {
    module: "Microcontroller programming",
    slug: "microcontroller-programming",
    objective: "Write, upload and debug a small embedded program using variables, control flow, functions and serial output.",
    theory: "Embedded programs normally initialize hardware once, then repeatedly read inputs, update state and control outputs. Breaking behavior into small functions and printing diagnostic values makes debugging easier than changing many things at once.",
    safety: "Confirm board type, port and pin assignments before uploading. Keep actuators disabled while testing logic that could cause unexpected movement.",
    challenge: "Write a small program that reads an input, applies a condition and controls two outputs, with serial messages that explain the current state.",
    output: "The program compiles, uploads, reacts to input and provides useful debug output.",
    troubleshoot: "If upload fails, check board/port/cable first. If behavior is wrong, print intermediate values and test one function at a time.",
    quiz: [
      ["What is a useful first debugging step when behavior is wrong?", ["Print intermediate values", "Replace every component", "Increase voltage", "Delete all functions"], "Print intermediate values"],
      ["Why split code into small functions?", ["To isolate and test behavior", "To consume more current", "To remove ground", "To avoid variables"], "To isolate and test behavior"],
    ],
  },
  {
    module: "Build a simple robot",
    slug: "build-a-simple-robot",
    objective: "Integrate sensing, motor control, power and code into a simple obstacle-aware mobile robot.",
    theory: "A small robot is a system: sensors provide information, software decides what to do, a motor driver controls actuators, and the power system must support the load. Integration should happen incrementally: verify power, test each motor, test the sensor, then combine behaviors.",
    safety: "Test the robot with wheels lifted first. Keep fingers, wires and clothing away from moving parts. Use a battery and driver rated for the motors, and protect 3.3 V GPIO from 5 V sensor outputs.",
    challenge: "Build a robot that moves forward, detects a nearby obstacle, stops and changes direction before continuing.",
    output: "The robot repeatedly moves and reacts to obstacles with documented wiring, code and troubleshooting evidence.",
    troubleshoot: "Test subsystems separately. If distance is unstable, check sensor mounting and signal voltage. If turning is inconsistent, verify motor polarity and wheel traction. If the MCU resets, inspect the power path and motor noise.",
    quiz: [
      ["What is the safest integration order?", ["Test subsystems before combining them", "Connect everything and increase voltage", "Start with moving wheels on the floor", "Skip sensor tests"], "Test subsystems before combining them"],
      ["What should happen when an obstacle is detected in this beginner robot?", ["Stop and change direction", "Increase motor current without limit", "Disable the sensor", "Short the motor driver"], "Stop and change direction"],
    ],
  },
] as const;

const hardwareCatalog = [
  ["Hardware-neutral Lab", "hardware-neutral", "Lab", "Activities that do not require a programmable board."],
  ["Arduino Uno", "arduino-uno", "Arduino", "5 V ATmega328P beginner board."],
  ["Arduino Nano", "arduino-nano", "Arduino", "Compact ATmega328P Arduino-compatible board."],
  ["ESP32", "esp32", "Espressif", "3.3 V Wi-Fi/Bluetooth microcontroller family."],
  ["BBC micro:bit", "bbc-microbit", "micro:bit", "Education-focused microcontroller board with built-in sensors and display."],
  ["Raspberry Pi Pico", "raspberry-pi-pico", "RP2040", "3.3 V RP2040 microcontroller board."],
  ["STM32", "stm32", "STMicroelectronics", "STM32 microcontroller development-board family."],
] as const;

const componentCatalog = [
  ["Solderless breadboard", "prototyping", "Reusable board for temporary circuits."],
  ["Jumper wires", "prototyping", "Male/male or suitable jumper wires."],
  ["LED", "output", "Standard low-current indicator LED."],
  ["330 ohm resistor", "passive", "Current-limiting resistor for indicator LEDs."],
  ["10k ohm resistor", "passive", "General pull-up/pull-down or sensor divider resistor."],
  ["Push button", "input", "Momentary normally-open tactile button."],
  ["Piezo buzzer", "output", "Low-power buzzer suitable for classroom experiments."],
  ["Photoresistor (LDR)", "sensor", "Light-dependent resistor for analog sensing."],
  ["DC motor", "actuator", "Small classroom DC gear motor."],
  ["L298N motor driver", "driver", "Dual H-bridge module for small DC motors."],
  ["HC-SR04 ultrasonic sensor", "sensor", "Distance sensor; Echo is typically 5 V logic."],
  ["Robot chassis and wheels", "mechanical", "Two-wheel beginner robot chassis set."],
  ["Battery pack", "power", "Motor-appropriate battery pack with switch."],
] as const;

function codeFor(slug: string, board: "uno" | "esp32") {
  const ledPin = board === "uno" ? "13" : "2";
  const buttonPin = board === "uno" ? "2" : "4";
  const analogPin = board === "uno" ? "A0" : "34";
  const motorA = board === "uno" ? ["5", "6"] : ["25", "26"];
  const motorB = board === "uno" ? ["9", "10"] : ["27", "14"];

  const snippets: Record<string, string> = {
    "leds-and-resistors": `const int LED_PIN = ${ledPin};\nvoid setup(){ pinMode(LED_PIN, OUTPUT); }\nvoid loop(){ digitalWrite(LED_PIN, HIGH); delay(1000); digitalWrite(LED_PIN, LOW); delay(1000); }`,
    "digital-input-output": `const int LED_PIN=${ledPin}; const int INPUT_PIN=${buttonPin};\nvoid setup(){ pinMode(LED_PIN,OUTPUT); pinMode(INPUT_PIN,INPUT_PULLUP); }\nvoid loop(){ digitalWrite(LED_PIN, digitalRead(INPUT_PIN)==LOW ? HIGH : LOW); }`,
    "push-buttons": `const int LED_PIN=${ledPin}; const int BUTTON_PIN=${buttonPin};\nvoid setup(){ Serial.begin(115200); pinMode(LED_PIN,OUTPUT); pinMode(BUTTON_PIN,INPUT_PULLUP); }\nvoid loop(){ bool pressed=digitalRead(BUTTON_PIN)==LOW; digitalWrite(LED_PIN,pressed); Serial.println(pressed ? "PRESSED" : "RELEASED"); delay(30); }`,
    "buzzers": `const int BUZZER_PIN=${board === "uno" ? "8" : "18"};\nvoid setup(){ pinMode(BUZZER_PIN,OUTPUT); }\nvoid loop(){ digitalWrite(BUZZER_PIN,HIGH); delay(150); digitalWrite(BUZZER_PIN,LOW); delay(150); digitalWrite(BUZZER_PIN,HIGH); delay(300); digitalWrite(BUZZER_PIN,LOW); delay(1500); }`,
    "sensors": `const int SENSOR_PIN=${analogPin}; const int LED_PIN=${ledPin};\nvoid setup(){ Serial.begin(115200); pinMode(LED_PIN,OUTPUT); }\nvoid loop(){ int value=analogRead(SENSOR_PIN); Serial.println(value); digitalWrite(LED_PIN, value > ${board === "uno" ? "500" : "2000"}); delay(100); }`,
    "motors-and-motor-drivers": `const int IN1=${motorA[0]}, IN2=${motorA[1]};\nvoid setup(){ pinMode(IN1,OUTPUT); pinMode(IN2,OUTPUT); }\nvoid loop(){ digitalWrite(IN1,HIGH); digitalWrite(IN2,LOW); delay(1500); digitalWrite(IN1,LOW); digitalWrite(IN2,LOW); delay(500); digitalWrite(IN1,LOW); digitalWrite(IN2,HIGH); delay(1500); digitalWrite(IN1,LOW); digitalWrite(IN2,LOW); delay(1000); }`,
    "microcontroller-programming": `const int LED_A=${ledPin}; const int LED_B=${board === "uno" ? "12" : "5"}; const int INPUT_PIN=${buttonPin};\nvoid setup(){ Serial.begin(115200); pinMode(LED_A,OUTPUT); pinMode(LED_B,OUTPUT); pinMode(INPUT_PIN,INPUT_PULLUP); }\nvoid loop(){ bool active=digitalRead(INPUT_PIN)==LOW; setOutputs(active); Serial.println(active ? "ACTIVE" : "IDLE"); delay(100); }\nvoid setOutputs(bool active){ digitalWrite(LED_A,active); digitalWrite(LED_B,!active); }`,
    "build-a-simple-robot": `const int L1=${motorA[0]}, L2=${motorA[1]}, R1=${motorB[0]}, R2=${motorB[1]};\n// Add your tested distance-reading function for the ultrasonic sensor.\nvoid setup(){ pinMode(L1,OUTPUT); pinMode(L2,OUTPUT); pinMode(R1,OUTPUT); pinMode(R2,OUTPUT); }\nvoid loop(){ long distanceCm = readDistanceCm(); if(distanceCm > 0 && distanceCm < 20){ stopMotors(); delay(200); turnRight(); delay(500); } else { forward(); } }\n// Implement readDistanceCm(), forward(), turnRight() and stopMotors() from your verified subsystem tests.`,
  };
  return snippets[slug] ?? "// This lesson is hardware-neutral. Record observations and verify connections before applying power.";
}

async function resetDemoData() {
  await db.classroom.deleteMany({ where: { isDemo: true } });
  await db.user.deleteMany({ where: { isDemo: true } });
  await db.course.deleteMany({ where: { isDemo: true } });
  await db.badgeDefinition.deleteMany({ where: { isDemo: true } });
  await db.rubric.deleteMany({ where: { isDemo: true } });
  await db.learningOutcome.deleteMany({ where: { isDemo: true } });
  await db.component.deleteMany({ where: { isDemo: true } });
  await db.hardwarePlatform.deleteMany({ where: { isDemo: true } });
  await db.school.deleteMany({ where: { isDemo: true } });
}

async function main() {
  await resetDemoData();

  const school = await db.school.create({
    data: { name: "DEMO STEMBuild School", slug: "demo-stembuild-school", isDemo: true },
  });

  const [adminPassword, teacherPassword, studentPassword] = await Promise.all([
    hashPassword(process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe-Admin-2026!"),
    hashPassword(process.env.DEMO_TEACHER_PASSWORD ?? "ChangeMe-Teacher-2026!"),
    hashPassword(process.env.DEMO_STUDENT_PASSWORD ?? "ChangeMe-Student-2026!"),
  ]);

  const admin = await db.user.create({ data: { email: "demo.admin@stembuild.local", displayName: "DEMO Administrator", passwordHash: adminPassword, role: "ADMIN", schoolId: school.id, isDemo: true } });
  const teacher = await db.user.create({ data: { email: "demo.teacher@stembuild.local", displayName: "DEMO Teacher", passwordHash: teacherPassword, role: "TEACHER", schoolId: school.id, isDemo: true } });
  const student = await db.user.create({ data: { email: "demo.student@stembuild.local", displayName: "DEMO Student", passwordHash: studentPassword, role: "STUDENT", schoolId: school.id, isDemo: true } });
  void admin;

  const classroom = await db.classroom.create({
    data: {
      name: "DEMO Beginner Robotics Class",
      joinCode: "DEMO-STEM-01",
      teacherId: teacher.id,
      schoolId: school.id,
      isDemo: true,
      enrollments: { create: { studentId: student.id, status: "ACTIVE" } },
    },
  });

  const hardware = new Map<string, string>();
  for (const [name, slug, family, description] of hardwareCatalog) {
    const item = await db.hardwarePlatform.create({ data: { name, slug, family, description, isDemo: true } });
    hardware.set(slug, item.id);
  }

  const components = new Map<string, string>();
  for (const [name, category, description] of componentCatalog) {
    const item = await db.component.create({ data: { name, category, description, isDemo: true } });
    components.set(name, item.id);
  }

  const skills = new Map<string, string>();
  const skillTaxonomy = [
    ["electronics-fundamentals", "Electronics fundamentals", "Voltage, current, resistance, polarity, power and safe low-voltage practice."],
    ["circuit-building", "Circuit building", "Breadboard construction, wiring quality, component placement and electrical connections."],
    ["microcontroller-programming", "Microcontroller programming", "Writing, uploading, reading and changing embedded programs."],
    ["digital-input-output", "Digital input/output", "Using GPIO, logic states, pull resistors and digital interfaces."],
    ["analog-input", "Analog input", "Reading, sampling and interpreting analog values."],
    ["sensors", "Sensors", "Connecting, reading, validating and calibrating sensor inputs."],
    ["motors", "Motors", "Safe actuator control, motor drivers, direction and power separation."],
    ["communication-protocols", "Communication protocols", "Using and troubleshooting serial, I2C, SPI, UART and related device communication."],
    ["debugging", "Debugging", "Systematically isolating faults, testing assumptions and recording troubleshooting results."],
    ["iot", "IoT", "Connecting embedded devices to networks, services and remote data flows."],
    ["robotics", "Robotics", "Integrating sensing, control, actuation, mechanics and power into robotic systems."],
    ["problem-solving", "Problem solving", "Breaking practical problems into testable steps and using evidence to choose the next action."],
  ] as const;
  for (const [slug, name, description] of skillTaxonomy) {
    const skill = await db.skill.upsert({
      where: { slug },
      create: { slug, name, description, category: "STEM", isDemo: false },
      update: { name, description, category: "STEM" },
    });
    skills.set(slug, skill.id);
  }

  const rubric = await db.rubric.create({
    data: {
      name: "DEMO Practical Skills Rubric",
      description: "Teacher-scored rubric for beginner practical STEM work.",
      isDemo: true,
      criteria: {
        create: [
          { label: "Circuit / hardware setup", description: "Connections match the activity and are safe/neat enough to inspect.", skillTag: "circuit-building", skillId: skills.get("circuit-building"), maxScore: 4, order: 1 },
          { label: "Programming / logic", description: "Code or control logic matches the task and uses the selected board correctly.", skillTag: "microcontroller-programming", skillId: skills.get("microcontroller-programming"), maxScore: 4, order: 2 },
          { label: "Testing and debugging", description: "Learner records useful troubleshooting steps and changes one variable at a time where practical.", skillTag: "debugging", skillId: skills.get("debugging"), maxScore: 4, order: 3 },
          { label: "Observed result", description: "Evidence shows the expected behavior or clearly documents why it has not yet been achieved.", skillTag: "problem-solving", skillId: skills.get("problem-solving"), maxScore: 4, order: 4 },
          { label: "Safety and explanation", description: "Learner follows safety notes and can explain key decisions/components.", skillTag: "electronics-fundamentals", skillId: skills.get("electronics-fundamentals"), maxScore: 4, order: 5 },
        ],
      },
    },
    include: { criteria: true },
  });

  const outcomes = new Map<string, string>();
  for (const item of [
    ["ELEC-01", "Electronics fundamentals", "Explain voltage, current, resistance, polarity and basic low-voltage safety.", "electronics-fundamentals"],
    ["BUILD-01", "Circuit construction", "Build and inspect breadboard circuits using appropriate components and wiring.", "circuit-building"],
    ["CODE-01", "Embedded programming", "Write, upload and debug beginner microcontroller programs.", "microcontroller-programming"],
    ["DIO-01", "Digital input/output", "Use GPIO inputs and outputs with defined HIGH/LOW states.", "digital-input-output"],
    ["ANALOG-01", "Analog input", "Read and interpret analog signals from beginner sensors.", "analog-input"],
    ["SENSE-01", "Sensor integration", "Connect, read and validate sensor data.", "sensors"],
    ["ACT-01", "Actuator control", "Control buzzers and motors using safe driver circuits.", "motors"],
    ["DEBUG-01", "Systematic troubleshooting", "Record faults, tests and outcomes while debugging practical work.", "debugging"],
    ["ROBOT-01", "Robotics integration", "Integrate sensing, control, actuation and power into a simple robot.", "robotics"],
    ["PROBLEM-01", "Practical problem solving", "Use observations and tests to choose the next practical action.", "problem-solving"],
  ] as const) {
    const outcome = await db.learningOutcome.create({ data: { code: item[0], title: item[1], description: item[2], skillId: skills.get(item[3]), isDemo: true } });
    outcomes.set(item[0], outcome.id);
  }

  const course = await db.course.create({
    data: {
      title: "DEMO Beginner Robotics & IoT Foundations",
      slug: "demo-beginner-robotics-iot-foundations",
      description: "A synthetic demonstration pathway for the STEMBuild MVP. It is not copied from any employer or school curriculum.",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isDemo: true,
    },
  });

  const lessonIds: string[] = [];
  for (let index = 0; index < lessons.length; index++) {
    const source = lessons[index];
    const module = await db.module.create({
      data: { courseId: course.id, title: `Module ${index + 1}: ${source.module}`, slug: `module-${index + 1}-${source.slug}`, description: source.objective, order: index + 1 },
    });

    const outcomeCodes = index === 0 ? ["ELEC-01"]
      : index === 1 ? ["BUILD-01", "ELEC-01"]
      : index === 2 ? ["BUILD-01", "DIO-01"]
      : index <= 5 ? ["DIO-01", "CODE-01", "DEBUG-01"]
      : index === 6 ? ["SENSE-01", "ANALOG-01", "CODE-01", "DEBUG-01"]
      : index === 7 ? ["ACT-01", "CODE-01", "DEBUG-01"]
      : index === 8 ? ["CODE-01", "DEBUG-01", "PROBLEM-01"]
      : ["ROBOT-01", "SENSE-01", "ACT-01", "CODE-01", "DEBUG-01", "PROBLEM-01"];
    const dominantSkill = ["electronics-fundamentals", "circuit-building", "circuit-building", "digital-input-output", "digital-input-output", "digital-input-output", "sensors", "motors", "microcontroller-programming", "robotics"][index];

    const lesson = await db.lesson.create({
      data: {
        moduleId: module.id,
        title: source.module,
        slug: source.slug,
        objective: source.objective,
        theory: source.theory,
        safetyNotes: source.safety,
        practicalChallenge: source.challenge,
        expectedOutput: source.output,
        generalTroubleshoot: source.troubleshoot,
        difficulty: "BEGINNER",
        estimatedMinutes: index === 9 ? 120 : 45,
        order: 1,
        status: "PUBLISHED",
        isDemo: true,
        outcomes: { create: outcomeCodes.map((code) => ({ outcomeId: outcomes.get(code)! })) },
        quiz: {
          create: {
            title: `${source.module} check`,
            passScore: 70,
            questions: {
              create: source.quiz.map((q, qIndex) => ({
                prompt: q[0], type: "SINGLE_CHOICE", options: q[1], correctAnswer: q[2], explanation: `Review the ${source.module.toLowerCase()} lesson if this was unclear.`, points: 1, order: qIndex + 1, skillId: skills.get(dominantSkill),
              })),
            },
          },
        },
        practicalTasks: {
          create: {
            rubricId: rubric.id,
            title: `${source.module} practical task`,
            instructions: source.challenge,
            successCriteria: source.output,
            evidencePrompt: "Upload a clear photo or PDF showing your setup/result, record the board used, and describe at least one test or troubleshooting step.",
          },
        },
      },
    });
    lessonIds.push(lesson.id);

    const neutral = index < 2;
    const variantBoards = neutral ? ["hardware-neutral"] : ["arduino-uno", "esp32"];
    for (const boardSlug of variantBoards) {
      const isEsp = boardSlug === "esp32";
      const boardName = hardwareCatalog.find((h) => h[1] === boardSlug)?.[0] ?? boardSlug;
      const selectedComponents = index === 0 ? [] : index === 1 ? ["Solderless breadboard", "Jumper wires"] : index === 2 ? ["Solderless breadboard", "Jumper wires", "LED", "330 ohm resistor"] : index === 3 ? ["Solderless breadboard", "Jumper wires", "LED", "330 ohm resistor", "Push button", "10k ohm resistor"] : index === 4 ? ["Solderless breadboard", "Jumper wires", "LED", "330 ohm resistor", "Push button"] : index === 5 ? ["Solderless breadboard", "Jumper wires", "Piezo buzzer"] : index === 6 ? ["Solderless breadboard", "Jumper wires", "Photoresistor (LDR)", "10k ohm resistor", "LED", "330 ohm resistor"] : index === 7 ? ["Jumper wires", "DC motor", "L298N motor driver", "Battery pack"] : index === 8 ? ["Solderless breadboard", "Jumper wires", "LED", "330 ohm resistor", "Push button"] : ["Jumper wires", "DC motor", "L298N motor driver", "HC-SR04 ultrasonic sensor", "Robot chassis and wheels", "Battery pack"];

      await db.lessonHardwareVariant.create({
        data: {
          lessonId: lesson.id,
          hardwarePlatformId: hardware.get(boardSlug)!,
          title: `${source.module} — ${boardName}`,
          wiringInstructions: neutral
            ? "No programmable board is required. Build/inspect the low-voltage lab setup described in the practical task."
            : index === 2
              ? `Connect the LED anode to GPIO ${isEsp ? "2" : "13"} through a 330 ohm resistor; connect the cathode to GND.`
              : index === 7
                ? `Connect the motor to one L298N output pair. Use a separate motor supply on the driver, connect driver GND to ${boardName} GND, and connect IN1/IN2 to the pins used in the code. Do not power the motor from the board GPIO.`
                : index === 9
                  ? `Connect the two DC motors through the L298N. Connect control pins to the GPIOs in the starter code. Connect HC-SR04 VCC/GND and trigger/echo to chosen GPIO. ${isEsp ? "Use a suitable voltage divider or level shifter on the 5 V Echo signal before the ESP32 input." : "Use the sensor only within its documented voltage requirements."} Test with wheels lifted before floor testing.`
                  : `Use the component list and connect signals to the GPIOs shown in the starter code. ${isEsp ? "Keep all ESP32 GPIO signals within 3.3 V limits." : "Keep GPIO current within the board limits."}`,
          codeLanguage: neutral ? "none" : "Arduino C++",
          codeSnippet: neutral ? "// Hardware-neutral lesson: no firmware required." : codeFor(source.slug, isEsp ? "esp32" : "uno"),
          expectedOutput: source.output,
          troubleshooting: source.troubleshoot,
          components: { create: selectedComponents.map((name) => ({ componentId: components.get(name)!, quantity: name === "DC motor" && index === 9 ? 2 : 1 })) },
        },
      });
    }
  }

  // Demonstrate that one lesson can support every requested MCU family without duplicating lesson content.
  const ledLesson = await db.lesson.findFirstOrThrow({ where: { slug: "leds-and-resistors", isDemo: true } });
  for (const boardSlug of ["arduino-nano", "bbc-microbit", "raspberry-pi-pico", "stm32"]) {
    const boardName = hardwareCatalog.find((h) => h[1] === boardSlug)![0];
    await db.lessonHardwareVariant.create({
      data: {
        lessonId: ledLesson.id,
        hardwarePlatformId: hardware.get(boardSlug)!,
        title: `LEDs and resistors — ${boardName}`,
        wiringInstructions: "Connect a board-appropriate digital output through a 330 ohm resistor to the LED anode; connect the cathode to ground. Confirm the board's GPIO voltage and pin naming before powering.",
        codeLanguage: boardSlug === "bbc-microbit" ? "MakeCode / MicroPython" : "C/C++ or MicroPython",
        codeSnippet: "// Board-specific starter: configure one safe digital output and toggle it HIGH/LOW once per second.\n// Use the official pin name and toolchain for the selected board.",
        expectedOutput: "The LED blinks at a steady one-second interval without overheating.",
        troubleshooting: "Check LED polarity, resistor placement, selected pin name and board voltage. Use the official board pinout for the exact development board model.",
        components: { create: ["Solderless breadboard", "Jumper wires", "LED", "330 ohm resistor"].map((name) => ({ componentId: components.get(name)!, quantity: 1 })) },
      },
    });
  }

  const project = await db.project.create({
    data: {
      courseId: course.id,
      rubricId: rubric.id,
      title: "DEMO Simple Obstacle-Aware Robot",
      slug: "demo-simple-obstacle-aware-robot",
      description: "Final beginner integration project using sensing, embedded code and motor control.",
      instructions: "Build and document a small mobile robot that moves, detects an obstacle and changes direction. Test each subsystem separately before integration.",
      successCriteria: "Teacher can verify safe wiring, working motor control, useful sensor response, understandable code and documented troubleshooting.",
      difficulty: "BEGINNER",
      status: "PUBLISHED",
      isDemo: true,
      hardware: { create: [{ hardwarePlatformId: hardware.get("arduino-uno")! }, { hardwarePlatformId: hardware.get("esp32")! }] },
    },
  });

  await db.lessonAssignment.createMany({
    data: lessonIds.map((lessonId, i) => ({ classroomId: classroom.id, lessonId, assignedById: teacher.id, dueAt: new Date(Date.now() + (i + 7) * 86400000) })),
  });
  await db.projectAssignment.create({ data: { classroomId: classroom.id, projectId: project.id, assignedById: teacher.id, dueAt: new Date(Date.now() + 30 * 86400000) } });

  await db.lessonProgress.create({ data: { studentId: student.id, lessonId: lessonIds[0], status: "NOT_STARTED" } });

  await db.badgeDefinition.create({
    data: {
      title: "DEMO Practical Starter",
      description: "Awarded only after required beginner practical evidence is assessed as complete.",
      kind: "SKILL",
      rule: { type: "teacher_assessed_practicals", minimumCompleted: 3 },
      isDemo: true,
    },
  });

  console.log("Seeded DEMO-only STEMBuild data.");
  console.log("DEMO logins: demo.admin@stembuild.local, demo.teacher@stembuild.local, demo.student@stembuild.local");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
