import { defaultLedSketch } from "./lab3d";

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

export function makeLedOfflineGuide() {
  const diagram = `<svg viewBox="0 0 780 155" role="img" aria-label="Diagram of Arduino D8 connected through a 330 ohm resistor and correctly oriented LED to Arduino GND">
  <rect x="3" y="48" width="155" height="57" rx="10" fill="#0e3462"/><text x="80" y="72" text-anchor="middle" fill="#fff" font-size="14" font-weight="bold">Arduino Uno</text><text x="80" y="91" text-anchor="middle" fill="#fff" font-size="12">D8 HIGH / LOW</text>
  <path d="M158 76H236" stroke="#06be99" stroke-width="5" fill="none"/>
  <rect x="236" y="65" width="103" height="24" rx="7" fill="#f6b14a" stroke="#0e3462"/><text x="287" y="82" text-anchor="middle" fill="#0e3462" font-size="13" font-weight="bold">330 Ω</text>
  <path d="M339 76H408" stroke="#0172e5" stroke-width="5" fill="none"/>
  <path d="M408 52L447 76L408 100Z" fill="#e14e4e" stroke="#9a1b26" stroke-width="2"/><path d="M447 51V101" stroke="#9a1b26" stroke-width="4"/>
  <text x="431" y="34" text-anchor="middle" font-size="12" fill="#0e3462">LED anode (+) to cathode (−)</text>
  <path d="M447 76H552" stroke="#30445d" stroke-width="5" fill="none"/>
  <rect x="552" y="48" width="180" height="57" rx="10" fill="#e1f0ff" stroke="#0e3462"/>
  <text x="642" y="82" text-anchor="middle" font-size="17" font-weight="bold" fill="#0e3462">Arduino GND</text>
  <text x="389" y="133" text-anchor="middle" font-size="12" fill="#31537c">On a breadboard: A–E share a numbered column; F–J share a separate strip across the centre gap.</text>
  </svg>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>STEMBuild · Arduino Uno LED Blink Take-Home Guide</title>
<style>body{font:16px/1.55 Arial,Helvetica,sans-serif;color:#0e3462;margin:0;background:#f3f9ff}main{max-width:850px;margin:auto;background:white;padding:32px}h1{font-size:34px;margin-bottom:6px}h2{margin-top:32px;border-bottom:2px solid #62c1d4;padding-bottom:8px}p,li{max-width:75ch}small{color:#31537c}.note{background:#fff0d5;border-left:4px solid #f6b14a;padding:12px 16px}pre{background:#0e3462;color:white;border-radius:9px;padding:18px;white-space:pre-wrap;font-size:13px;overflow-wrap:anywhere}.diagram{padding:12px;background:#f3f9ff;border:1px solid #c2d9ed;border-radius:12px;overflow-x:auto}.diagram svg{width:100%;min-width:500px}footer{border-top:3px solid #06be99;margin-top:25px;padding-top:10px;font-size:12px;color:#31537c}@media print{body{background:white}main{padding:0}pre{color:#0e3462;background:#e1f0ff;break-inside:avoid}h2{break-after:avoid}@page{margin:18mm}}</style></head><body><main>
<p><strong>STEMBuild · Take-home learning card</strong> · Arduino Uno LED Blink</p>
<h1>Build, explain, and remember.</h1>
<p>Goal: Make an LED blink on Arduino digital pin 8, and be able to explain the circuit without looking at the website.</p>
<h2>1. Know the components</h2>
<ul><li><strong>Arduino Uno:</strong> A microcontroller board that drives digital output pins.</li>
<li><strong>LED:</strong> A light-emitting diode; its anode is the positive side and cathode is the negative side.</li>
<li><strong>330 Ω resistor:</strong> Restricts current through the LED and protects the output and LED.</li>
<li><strong>Breadboard:</strong> Each numbered A–E column is connected; F–J is a separate five-hole strip across the centre trench.</li>
<li><strong>Jumper wires:</strong> Create paths between board pins and connected breadboard strips.</li></ul>
<h2>2. Understand the current path</h2><div class="diagram">${diagram}</div>
<ol><li>With power disconnected, place the resistor to bridge the breadboard centre gap.</li>
<li>Insert the LED across the gap in another column; identify its anode and cathode.</li>
<li>Connect Uno D8 to one side of the resistor. Connect the other resistor side to the LED anode using jumper wires in connected breadboard strips.</li>
<li>Connect the LED cathode back to Uno GND. Verify the path before connecting USB power.</li></ol>
<div class="note"><strong>Safety:</strong> Use only the reviewed low-voltage Uno/LED circuit. Never connect a wall socket, AC lamp, or mains-voltage relay to this beginner activity. Confirm the pinout and polarity of your specific hardware.</div>
<h2>3. Arduino sketch</h2><pre><code>${escapeHtml(defaultLedSketch)}</code></pre>
<p>The sketch configures D8 as an OUTPUT, drives it HIGH for 500 milliseconds, then LOW for 500 milliseconds. This gives roughly one on/off cycle per second.</p>
<h2>4. Troubleshooting questions</h2>
<ol><li>The LED stays dark. Is the LED installed backwards?</li><li>Is D8 connected through the resistor, not directly to GND?</li><li>Is there a complete return path to GND?</li><li>Did you accidentally place both resistor leads into the same connected five-hole strip?</li><li>Does the code really use pin 8, with pinMode(8, OUTPUT)?</li></ol>
<h2>5. Try without help</h2>
<p>Disconnect power. On a fresh breadboard, rebuild the circuit without looking at the earlier steps. Explain why the LED needs a resistor, how the centre gap works and what to check when the LED does not light.</p>
<h2>6. Review from memory</h2>
<p>Tomorrow: say what each part does without checking this sheet. In one week: draw the circuit path and write a short explanation of HIGH, LOW and GND.</p>
<footer>Personal offline revision material from STEMBuild · Your ability to wire real hardware must be checked independently. Completing the simulator is not a teacher-verified practical assessment.</footer>
</main></body></html>`;
}
