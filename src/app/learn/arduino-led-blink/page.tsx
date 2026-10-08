import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { LedLearningJourney } from "@/components/led-learning-journey";
import "./led-journey.css";

export const metadata: Metadata = {
  title: "Learn Arduino Uno LED Blink · Learn, Build & Remember",
  description: "Interactive beginner Arduino lesson: understand LEDs and resistors, predict code, assemble a verified breadboard circuit, troubleshoot, rebuild, explain and take home an offline guide.",
};

export default function ArduinoLedLearningPage() {
  return <div>
    <PublicHeader />
    <main>
      <section className="led-journey-hero">
        <div className="container">
          <nav className="led-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span>
            <Link href="/learning-paths/first-robot">First Robot Path</Link><span aria-hidden="true">/</span>
            <span aria-current="page">LED learning journey</span>
          </nav>
          <div className="eyebrow">STEMBUILD · START WITH UNDERSTANDING</div>
          <h1>Learn it. Build it.<br/><span>Remember it.</span></h1>
          <p className="lead">An interactive Arduino Uno LED lesson that teaches you to understand components, assemble a circuit, solve problems and explain what you've learned—before moving on to your next robot.</p>
          <div className="led-hero-chips" aria-label="Lesson features">
            <span>Beginner friendly</span><span>Real circuit simulator</span>
            <span>Eight learning stages</span><span>Take-home guide</span>
          </div>
          <p className="led-hero-note">Works without an account · Saves in this browser · Simulated success is not proof of physical wiring</p>
        </div>
      </section>
      <section className="container led-journey-wrapper">
        <LedLearningJourney />
      </section>
      <section className="container led-follow-up">
        <div className="card">
          <div><div className="eyebrow">AFTER YOUR FIRST LED</div><h2>Your next challenge can be a push-button light.</h2>
            <p className="muted">Use what you learned about output pins and complete circuits, then add an input button. Learning goes further when you transfer a skill to a different project.</p></div>
          <Link className="btn" href="/build/button-light">Explore push-button circuit →</Link>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
