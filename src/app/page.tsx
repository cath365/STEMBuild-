"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { BoardGallery } from "@/components/board-gallery";
import styles from "./home.module.css";

const topics = [
  { category: "Electronics", title: "Electronics foundations", description: "Get comfortable with components, breadboards and your first working circuit.", lessons: ["Voltage, current and resistance", "Breadboards and jumper wires", "LEDs, resistors and safe wiring"], tag: "Start here", className: "electronics" },
  { category: "Programming", title: "Microcontroller programming", description: "Turn a few lines of code into something you can see, hear and control.", lessons: ["Digital inputs and outputs", "Buttons, buzzers and GPIO", "Reading code and finding errors"], tag: "Learn by doing", className: "programming" },
  { category: "IoT & sensors", title: "Smart Environment Monitor", description: "Read temperature and humidity, record measurements and understand your sensors.", lessons: ["Arduino Uno and ESP32 variants", "Sensor wiring and readings", "Evidence and teacher assessment"], tag: "Showcase project", className: "sensors" },
  { category: "Robotics", title: "Build a simple robot", description: "Bring motors, sensors and code together in a practical robotics project.", lessons: ["Motors and motor drivers", "Obstacle sensing", "Testing and troubleshooting"], tag: "Put it together", className: "robotics" },
];
const categories = ["All topics", ...topics.map((topic) => topic.category)];

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const filtered = topics.filter((topic) => (category === "All topics" || topic.category === category) && `${topic.title} ${topic.description} ${topic.lessons.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className={styles.home}>
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Brand />
          <a className={styles.explore} href="#topics">Explore <span aria-hidden="true">⌄</span></a>
          <form className={styles.search} role="search" onSubmit={(event) => { event.preventDefault(); document.getElementById("topics")?.scrollIntoView({ behavior: "smooth" }); }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <label className={styles.srOnly} htmlFor="topic-search">Find a learning topic</label>
            <input id="topic-search" placeholder="What do you want to learn?" value={query} onChange={(event) => setQuery(event.target.value)} type="search" />
            <button type="submit" className={styles.srOnly}>Search topics</button>
          </form>
          <nav className={styles.desktopNav} aria-label="Main navigation"><a href="#topics">Learning areas</a><a href="#boards">Our boards</a><a href="#teachers">For teachers</a></nav>
          <Link className={styles.signIn} href="/login">Sign in</Link>
          <details className={styles.mobileMenu}><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="#topics">Learning areas</a><a href="#boards">Our boards</a><a href="#teachers">For teachers</a><a href="#how">How it works</a></nav></details>
        </div>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.container}>
            <div className={styles.breadcrumb}>Home <span aria-hidden="true">/</span> Robotics &amp; IoT</div>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.kicker}>HANDS-ON STEM LEARNING</p>
                <h1 id="hero-title">Learn it.<br /><span>Build it.</span></h1>
                <p>Learn electronics, programming and robotics through practical projects. Follow the wiring, write the code and see what you can build.</p>
                <a className={styles.primaryButton} href="#topics">Explore learning areas <span aria-hidden="true">→</span></a>
                <div className={styles.heroNote}>Step-by-step lessons <span aria-hidden="true">·</span> Teacher-reviewed projects</div>
              </div>
              <figure className={styles.heroFigure}>
                <div className={styles.photoFrame}><Image src="/electronics-workbench.jpg" alt="Arduino Uno connected to a breadboard with jumper wires, an LED and a potentiometer" fill sizes="(max-width: 760px) 100vw, 520px" preload /></div>
                <figcaption><span className={styles.photoLabel}>THE WORKBENCH</span><span>Small components. Real possibilities.</span></figcaption>
              </figure>
            </div>
          </div>
        </section>
        <div className={styles.boardStrip}><div className={styles.container}><span>Learn with your board</span><div>Arduino Uno <span>Arduino Nano</span> ESP32 <span>Raspberry Pi Pico</span> BBC micro:bit <span>STM32</span></div></div></div>
        <section id="topics" className={`${styles.container} ${styles.topicSection}`} aria-labelledby="topics-title">
          <div className={styles.sectionHeading}><div><p className={styles.kicker}>EXPLORE STEMBUILD</p><h2 id="topics-title">Start with the <span>foundations.</span></h2></div><a href="#how">How learning works <span aria-hidden="true">↗</span></a></div>
          <p className={styles.sectionIntro}>From your first circuit to a complete project. Explore the topics, then sign in to access the lessons assigned by your teacher.</p>
          <div className={styles.filters} role="group" aria-label="Filter learning areas">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} className={category === item ? styles.activeFilter : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <p className={styles.resultCount} role="status">{filtered.length} learning {filtered.length === 1 ? "area" : "areas"}{query ? ` matching “${query}”` : ""}</p>
          <div className={styles.topicGrid}>{filtered.map((topic) => <article key={topic.title} className={styles.topicCard}>
            <div className={`${styles.topicBanner} ${styles[topic.className]}`}><span>{topic.category}</span><span className={styles.topicNumber} aria-hidden="true">0{topics.indexOf(topic) + 1}</span><span className={styles.topicTag}>{topic.tag}</span></div>
            <div className={styles.topicBody}><h3>{topic.title}</h3><p>{topic.description}</p><details className={styles.outline}><summary>View learning outline <span aria-hidden="true">+</span></summary><ul>{topic.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul></details><Link href="/login" aria-label={`Sign in to learn about ${topic.title}`}>Sign in to learn <span aria-hidden="true">→</span></Link></div>
          </article>)}</div>
          {filtered.length === 0 && <div className={styles.emptyState}><h3>No topics found</h3><p>Try “Arduino”, “sensors” or “circuits”, or clear your search.</p><button type="button" onClick={() => { setQuery(""); setCategory("All topics"); }}>Show all learning areas</button></div>}
        </section>
        <BoardGallery />
        <section id="how" className={styles.howSection} aria-labelledby="how-title"><div className={styles.container}><div className={styles.sectionHeading}><div><p className={styles.kicker}>A PRACTICAL WAY TO LEARN</p><h2 id="how-title">Make. Test. Understand.</h2></div></div><div className={styles.steps}>{[["01", "Follow the lesson", "Understand the components, check the safety notes and follow the wiring for your board."], ["02", "Build and test", "Run your code, record what happens and work through any problems."], ["03", "Show your work", "Submit evidence and receive teacher feedback on your practical skills."]].map(([number, title, description]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></div>)}</div></div></section>
        <section id="teachers" className={`${styles.container} ${styles.teacherSection}`} aria-labelledby="teacher-title"><div><p className={styles.kicker}>FOR TEACHERS &amp; SCHOOLS</p><h2 id="teacher-title">See how your learners<br />are progressing.</h2><p>Review project evidence, give feedback and spot where a learner needs help with wiring, coding or troubleshooting.</p><Link className={styles.primaryButton} href="/login">Open your dashboard <span aria-hidden="true">→</span></Link></div><div className={styles.teacherFeatures}>{[["Practical assessment", "Review the build using clear assessment criteria."], ["Learning analytics", "See attempts, quiz results and areas of difficulty."], ["AI Lab Coach", "Help learners work through questions and next steps."], ["Offline lesson access", "Keep previously saved lessons available when the connection drops."]].map(([title, description]) => <div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div></section>
      </main>
      <footer className={styles.footer}><div className={styles.container}><div><Brand /><p>Practical learning in robotics, electronics and IoT.</p></div><nav aria-label="Footer navigation"><a href="#topics">Learning areas</a><a href="#how">How it works</a><Link href="/login">Sign in</Link></nav><p className={styles.credit}>Workbench photo: <a href="https://unsplash.com/@vishnumohanan" target="_blank" rel="noreferrer">Vishnu Mohanan</a> / Unsplash</p></div></footer>
    </div>
  );
}
