export const LED_JOURNEY_STORAGE_KEY = "stembuild-led-learning-journey-v1";
export const LED_PRACTICE_BOARD_KEY = "stembuild-led-journey-practice-board-v1";
export const LED_CHALLENGE_BOARD_KEY = "stembuild-led-journey-challenge-board-v1";

export type LearningQuestion = {
  prompt: string;
  choices: [string, string, string];
  correct: number;
  explanation: string;
  hint: string;
};

export const knowledgeQuestions: readonly LearningQuestion[] = [
  {
    prompt: "Why should we include a 330 Ω resistor with this LED?",
    choices: ["To make the Arduino run faster", "To limit current and protect the LED and output", "To store the blink program"],
    correct: 1,
    explanation: "A series resistor limits current through the LED. Without current limiting, an LED and the Arduino output can be damaged.",
    hint: "Think about what happens to electrical current when you add resistance.",
  },
  {
    prompt: "What does anode (+) mean for a typical red LED?",
    choices: ["The positive-side lead for forward current flow", "The leg that always connects to GND", "A second Arduino ground pin"],
    correct: 0,
    explanation: "The anode is the positive-side lead. In our D8 output circuit the current flows toward the anode and leaves through the cathode (−) toward GND.",
    hint: "An LED has polarity; anode is the positive side, cathode is the negative side.",
  },
  {
    prompt: "Which two breadboard holes are electrically connected by the board itself?",
    choices: ["E6 and F6, across the centre gap", "A6 and E6, on the same side and column", "A6 and A7, in neighbouring columns"],
    correct: 1,
    explanation: "On this solderless breadboard, A–E in the same numbered column are connected. F–J form a separate strip across the central gap.",
    hint: "The centre gap separates the two groups of five holes.",
  },
];

export const predictionQuestions: readonly LearningQuestion[] = [
  {
    prompt: "With pinMode(8, OUTPUT), what does digitalWrite(8, HIGH) do?",
    choices: ["Sets D8 to a high output voltage (about 5 V on the Uno)", "Reads the LED's temperature", "Changes the breadboard's connections"],
    correct: 0,
    explanation: "HIGH drives the Uno digital output high. Whether the LED lights still depends on safe, complete wiring and correct polarity.",
    hint: "Is digitalWrite a command to read a sensor or to control an output?",
  },
  {
    prompt: "The code holds HIGH for 500 ms and LOW for 500 ms. What should you observe?",
    choices: ["An LED that stays on continuously", "One complete on/off blink cycle about every second", "Two separate LEDs blinking at the same time"],
    correct: 1,
    explanation: "The code spends 0.5 seconds ON and 0.5 seconds OFF: one cycle is about 1 second, or roughly one blink per second.",
    hint: "500 milliseconds is half a second. Add the ON and OFF delays.",
  },
];

export const diagnosisQuestions: readonly LearningQuestion[] = [
  {
    prompt: "The sketch is running but an LED has been wired backwards. What is the best first check?",
    choices: ["Increase the delay to 20 seconds", "Swap the USB cable immediately", "Check that the LED's anode and cathode face the correct way"],
    correct: 2,
    explanation: "An LED is polarized. Reverse polarity can prevent it lighting even when a correct sketch runs.",
    hint: "Focus on the part that only allows current in one direction.",
  },
  {
    prompt: "D8 is connected through the resistor to the LED, but the LED has no return connection. What is missing?",
    choices: ["A complete path back to Arduino GND", "An internet connection", "A second Arduino board"],
    correct: 0,
    explanation: "Current needs a complete path. The LED cathode must return to Arduino GND for this reviewed circuit.",
    hint: "Imagine following current from D8 through the parts. Where does it return?",
  },
];

export const recallQuestions: readonly LearningQuestion[] = [
  {
    prompt: "After a break: how could you limit current through a red LED?",
    choices: ["Add an appropriate series resistor", "Connect it straight to a mains socket", "Remove the return path"],
    correct: 0,
    explanation: "The current-limiting resistor protects the LED and the controller output.",
    hint: "Recall the extra component you installed across the breadboard gap.",
  },
  {
    prompt: "After a break: which Arduino function changes D8 between HIGH and LOW?",
    choices: ["analogRead()", "digitalWrite()", "Serial.println()"],
    correct: 1,
    explanation: "digitalWrite(pin, value) changes a configured digital output.",
    hint: "The function name includes the word 'write'.",
  },
  {
    prompt: "After a break: where does LED current return in our Uno blink circuit?",
    choices: ["The USB data line", "Another LED anode", "Arduino GND"],
    correct: 2,
    explanation: "GND completes the low-voltage circuit. A missing return connection means the LED cannot light.",
    hint: "It is the shared electrical reference on the Arduino.",
  },
];

export type LedJourney = {
  version: 1;
  introReviewed: boolean;
  knowledge: number[];
  prediction: number[];
  practiceRunAt: string | null;
  diagnosis: number[];
  challengeRunAt: string | null;
  reflection: string;
  reflectionSubmitted: boolean;
  practiceHints: number;
  challengeHints: number;
  recalls: { at: string; correct: number }[];
};

export const steps = [
  { title: "Discover", summary: "Why the LED matters" },
  { title: "Understand", summary: "Know your components" },
  { title: "Predict", summary: "Think before wiring" },
  { title: "Build & test", summary: "Use the real simulator" },
  { title: "Troubleshoot", summary: "Identify circuit faults" },
  { title: "Rebuild independently", summary: "Start with a fresh board" },
  { title: "Explain", summary: "Teach the concept back" },
  { title: "Remember", summary: "Download and revisit" },
] as const;

export function emptyLedJourney(): LedJourney {
  return {
    version: 1, introReviewed: false, knowledge: [], prediction: [],
    practiceRunAt: null, diagnosis: [], challengeRunAt: null,
    reflection: "", reflectionSubmitted: false,
    practiceHints: 0, challengeHints: 0, recalls: [],
  };
}

function answers(value: unknown, count: number) {
  if (!Array.isArray(value)) return [];
  return Array.from({ length: count }, (_, index) => {
    const a = value[index];
    return Number.isInteger(a) && a >= 0 && a <= 2 ? a : -1;
  });
}

function date(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40 || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

export function parseLedJourney(value: unknown): LedJourney {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid learning record.");
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) throw Error("Unsupported learning record version.");
  const reflection = typeof raw.reflection === "string" ? raw.reflection.slice(0, 1200) : "";
  const safeHints = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 ? Math.min(n as number, 1000) : 0;
  const recalls = Array.isArray(raw.recalls) ? raw.recalls.slice(-30).flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const at = date(r.at);
    return at && Number.isInteger(r.correct) && (r.correct as number) >= 0 && (r.correct as number) <= recallQuestions.length
      ? [{ at, correct: r.correct as number }] : [];
  }) : [];
  return {
    version: 1, introReviewed: raw.introReviewed === true,
    knowledge: answers(raw.knowledge, knowledgeQuestions.length),
    prediction: answers(raw.prediction, predictionQuestions.length),
    practiceRunAt: date(raw.practiceRunAt),
    diagnosis: answers(raw.diagnosis, diagnosisQuestions.length),
    challengeRunAt: date(raw.challengeRunAt),
    reflection,
    reflectionSubmitted: raw.reflectionSubmitted === true && reflection.trim().length >= 50,
    practiceHints: safeHints(raw.practiceHints),
    challengeHints: safeHints(raw.challengeHints),
    recalls,
  };
}

export function quizReady(selected: readonly number[], questions: readonly LearningQuestion[]): boolean {
  return questions.length > 0 && questions.every((question, index) => selected[index] === question.correct);
}

export function stepCompleted(record: LedJourney, step: number): boolean {
  switch (step) {
    case 0: return record.introReviewed;
    case 1: return quizReady(record.knowledge, knowledgeQuestions);
    case 2: return quizReady(record.prediction, predictionQuestions);
    case 3: return Boolean(record.practiceRunAt);
    case 4: return quizReady(record.diagnosis, diagnosisQuestions);
    case 5: return Boolean(record.challengeRunAt);
    case 6: return record.reflectionSubmitted && record.reflection.trim().length >= 50;
    case 7: return false; // Ongoing revision cannot be marked completed by simply visiting.
    default: return false;
  }
}

export function nextJourneyStep(record: LedJourney): number {
  for (let index = 0; index < steps.length - 1; index++) {
    if (!stepCompleted(record, index)) return index;
  }
  return steps.length - 1;
}

export function canVisitJourneyStep(record: LedJourney, step: number): boolean {
  return Number.isInteger(step) && step >= 0 && step <= nextJourneyStep(record);
}

export function reviewDue(completedAt: string | null, days: number, now: Date): boolean {
  if (!completedAt) return false;
  const completed = Date.parse(completedAt);
  return Number.isFinite(completed) && now.getTime() >= completed + days * 86_400_000;
}
