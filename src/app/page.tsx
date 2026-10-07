"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { PublicFooter } from "@/components/public-footer";
import { BoardGallery } from "@/components/board-gallery";
import { buildProjects } from "@/lib/build-catalog";
import styles from "./home.module.css";

const topics = [
  { category: "Electronics", title: "Electronics foundations", description: "Get comfortable with components, breadboards and your first working circuit.", lessons: ["Voltage, current and resistance", "Breadboards and jumper wires", "LEDs, resistors and safe wiring"], tag: "Start here", className: "electronics" },
  { category: "Programming", title: "Microcontroller programming", description: "Turn a few lines of code into something you can see, hear and control.", lessons: ["Digital inputs and outputs", "Buttons, buzzers and GPIO", "Reading code and finding errors"], tag: "Learn by doing", className: "programming" },
  { category: "IoT & sensors", title: "Smart Environment Monitor", description: "Read temperature and humidity, record measurements and understand your sensors.", lessons: ["Arduino Uno and ESP32 variants", "Sensor wiring and readings", "Evidence and teacher assessment"], tag: "Showcase project", className: "sensors" },
  { category: "Robotics", title: "Build a simple robot", description: "Bring motors, sensors and code together in a practical robotics project.", lessons: ["Motors and motor drivers", "Obstacle sensing", "Testing and troubleshooting"], tag: "Put it together", className: "robotics" },
];
const categories = ["All topics", ...topics.map((topic) => topic.category)];

const featuredSlugs = [
  "first-led",
  "button-light",
  "smart-environment-monitor",
  "plant-monitor",
  "smart-dustbin",
  "bluetooth-car",
  "obstacle-robot",
  "weather-station",
];
const featuredProjects = featuredSlugs.map((slug) => buildProjects.find((project) => project.slug === slug)).filter((project): project is NonNullable<typeof project> => Boolean(project));

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
          <a className={styles.explore} href="#build">Explore <span aria-hidden="true">⌄</span></a>
          <form className={styles.search} role="search" onSubmit={(event) => { event.preventDefault(); document.getElementById("topics")?.scrollIntoView({ behavior: "smooth" }); }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <label className={styles.srOnly} htmlFor="topic-search">Find a learning topic</label>
            <input id="topic-search" placeholder="Search learning topics" value={query} onChange={(event) => setQuery(event.target.value)} type="search" />
            <button type="submit" className={styles.srOnly}>Search topics</button>
          </form>
          <nav className={styles.desktopNav} aria-label="Main navigation"><Link href="/projects">Projects</Link><Link href="/components">Components</Link><a href="#teachers">Teachers</a></nav>
          <Link className={styles.signIn} href="/login">Sign in</Link>
          <details className={styles.mobileMenu}><summary>Menu</summary><nav aria-label="Mobile navigation"><Link href="/projects">Projects</Link><Link href="/components">Components</Link><a href="#topics">Learning areas</a><a href="#teachers">For teachers</a></nav></details>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.container}>
            <div className={styles.breadcrumb}>Home <span aria-hidden="true">/</span> Robotics &amp; IoT</div>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <p className={styles.kicker}>LEARN BY BUILDING REAL THINGS</p>
                <h1 id="hero-title">What do you want to<br/><span>build today?</span></h1>
                <p>Choose a project. STEMBuild helps you understand the parts, connect them safely, write the code, test what happens and fix problems one step at a time.</p>
                <div className="inline"><Link className={styles.primaryButton} href="/projects">Choose a project <span aria-hidden="true">→</span></Link><Link className="btn" href="/components">I already have components</Link></div>
                <div className={styles.heroNote}>Beginner friendly <span aria-hidden="true">·</span> Real hardware <span aria-hidden="true">·</span> Honest evidence <span aria-hidden="true">·</span> Teacher support</div>
              </div>
              <figure className={styles.heroFigure}>
                <div className={styles.photoFrame}><Image src="/electronics-workbench.jpg" alt="Arduino Uno connected to a breadboard with jumper wires, an LED and a potentiometer" fill sizes="(max-width: 760px) 100vw, 520px" preload /></div>
                <figcaption><span className={styles.photoLabel}>YOUR WORKBENCH</span><span>Start small. Build something real.</span></figcaption>
              </figure>
            </div>
          </div>
        </section>

        <div className={styles.boardStrip}><div className={styles.container}><span>Learn with the board you have</span><div>Arduino Uno <span>Arduino Nano</span> ESP32 <span>Raspberry Pi Pico</span> BBC micro:bit <span>STM32</span></div></div></div>

        <section id="build" className="home-build-section">
          <div className={styles.container}>
            <div className="home-build-heading"><div><p className={styles.kicker}>START WITH A PROJECT</p><h2>Pick something you want to make.</h2></div><p>You do not need to understand everything first. STEMBuild introduces the electronics, programming and troubleshooting when you need them.</p></div>
            <div className="home-choice-grid">
              {featuredProjects.map((project) => <Link className="home-choice-card" href={`/build/${project.slug}`} key={project.slug}>
                <div className="inline"><span className="badge">{project.level}</span><span className="badge">{project.area}</span></div>
                <h3>{project.title}</h3>
                <p>{project.summary}</p>
                <span className="text-link">Open Build Mode →</span>
              </Link>)}
            </div>
            <div className="inline" style={{marginTop:20}}><Link className="btn btn-primary" href="/projects">See all projects</Link><Link className="btn" href="/components">Find projects from my components</Link></div>
          </div>
        </section>

        <section className="home-build-section alt">
          <div className={styles.container}>
            <div className="home-build-heading"><div><p className={styles.kicker}>LEARN AT YOUR LEVEL</p><h2>Different learners need different amounts of help.</h2></div><p>The project can stay the same while STEMBuild changes how much guidance it gives you.</p></div>
            <div className="home-level-grid">
              <div className="card home-level-card"><span className="badge">Beginner</span><h3>I am new.</h3><p>Small steps, clear safety notes, component explanations and early tests before the project gets complicated.</p><Link className="text-link" href="/projects#Beginner">Start beginner projects →</Link></div>
              <div className="card home-level-card"><span className="badge">Intermediate</span><h3>I have built before.</h3><p>More responsibility for wiring and code decisions, while STEMBuild still gives checkpoints and troubleshooting guidance.</p><Link className="text-link" href="/projects#Intermediate">Explore intermediate projects →</Link></div>
              <div className="card home-level-card"><span className="badge">Advanced</span><h3>Give me a challenge.</h3><p>Start from the problem and requirements, plan your own implementation and use evidence to defend your engineering decisions.</p><Link className="text-link" href="/projects#Advanced">Take an advanced challenge →</Link></div>
            </div>
          </div>
        </section>

        <section className="home-build-section">
          <div className={styles.container}>
            <div className="home-build-heading"><div><p className={styles.kicker}>A HEALTHY WAY TO LEARN</p><h2>One clear next step at a time.</h2></div><p>STEMBuild should help a learner understand what happened—not reward clicking through screens.</p></div>
            <div className="home-learning-loop">
              <div><strong>1 · Choose</strong><span>Pick something you genuinely want to build.</span></div>
              <div><strong>2 · Learn</strong><span>Understand only the components and ideas you need next.</span></div>
              <div><strong>3 · Build</strong><span>Connect one safe subsystem at a time.</span></div>
              <div><strong>4 · Test &amp; fix</strong><span>Observe the real result and troubleshoot one cause at a time.</span></div>
              <div><strong>5 · Show &amp; improve</strong><span>Record honest evidence, get feedback and make the next version better.</span></div>
            </div>
          </div>
        </section>

        <section className="home-build-section alt">
          <div className={styles.container}>
            <div className="home-build-heading"><div><p className={styles.kicker}>USE WHAT YOU ALREADY HAVE</p><h2>Your components can choose the next project.</h2></div><p>Tick the parts in your kit and STEMBuild will show what you can build now, plus the few parts you are still missing.</p></div>
            <div className="card">
              <div className="grid grid-3">
                <div><div className="eyebrow">1</div><h3 style={{marginTop:8}}>Add your parts</h3><p className="muted">Boards, sensors, motors, displays, power and communication modules.</p></div>
                <div><div className="eyebrow">2</div><h3 style={{marginTop:8}}>See matching projects</h3><p className="muted">STEMBuild checks required parts and compatible boards.</p></div>
                <div><div className="eyebrow">3</div><h3 style={{marginTop:8}}>Start Build Mode</h3><p className="muted">Move from a box of components to a guided working project.</p></div>
              </div>
              <div className="inline" style={{marginTop:18}}><Link className="btn btn-primary" href="/components">Open My Components</Link><Link className="btn" href="/projects">Browse all projects</Link></div>
            </div>
          </div>
        </section>

        <section id="topics" className={`${styles.container} ${styles.topicSection}`} aria-labelledby="topics-title">
          <div className={styles.sectionHeading}><div><p className={styles.kicker}>LEARN THE IDEAS BEHIND THE BUILD</p><h2 id="topics-title">Understand the <span>foundations.</span></h2></div><Link href="/components">Explore component library <span aria-hidden="true">↗</span></Link></div>
          <p className={styles.sectionIntro}>Projects give you a reason to learn. These learning areas help you understand why the circuit, code and hardware behave the way they do.</p>
          <div className={styles.filters} role="group" aria-label="Filter learning areas">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} className={category === item ? styles.activeFilter : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <p className={styles.resultCount} role="status">{filtered.length} learning {filtered.length === 1 ? "area" : "areas"}{query ? ` matching “${query}”` : ""}</p>
          <div className={styles.topicGrid}>{filtered.map((topic) => <article key={topic.title} className={styles.topicCard}>
            <div className={`${styles.topicBanner} ${styles[topic.className]}`}><span>{topic.category}</span><span className={styles.topicNumber} aria-hidden="true">0{topics.indexOf(topic) + 1}</span><span className={styles.topicTag}>{topic.tag}</span></div>
            <div className={styles.topicBody}><h3>{topic.title}</h3><p>{topic.description}</p><details className={styles.outline}><summary>View learning outline <span aria-hidden="true">+</span></summary><ul>{topic.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul></details><Link href={topic.category === "IoT & sensors" ? "/showcase/smart-environment-monitor" : "/login"} aria-label={topic.category === "IoT & sensors" ? "Try the Smart Environment Monitor sample lesson" : `Sign in to learn about ${topic.title}`}>{topic.category === "IoT & sensors" ? "Try the sample lesson" : "Sign in to learn"} <span aria-hidden="true">→</span></Link></div>
          </article>)}</div>
          {filtered.length === 0 && <div className={styles.emptyState}><h3>No topics found</h3><p>Try “Arduino”, “sensors” or “circuits”, or clear your search.</p><button type="button" onClick={() => { setQuery(""); setCategory("All topics"); }}>Show all learning areas</button></div>}
        </section>

        <BoardGallery />

        <section id="teachers" className={`${styles.container} ${styles.teacherSection}`} aria-labelledby="teacher-title"><div><p className={styles.kicker}>FOR TEACHERS &amp; SCHOOLS</p><h2 id="teacher-title">Help learners build independently<br/>without losing oversight.</h2><p>Review project evidence, give feedback and see where a learner needs help with wiring, coding, testing or troubleshooting.</p><Link className={styles.primaryButton} href="/teachers">Teacher setup guide <span aria-hidden="true">→</span></Link></div><div className={styles.teacherFeatures}>{[["Practical assessment", "Review the real build using clear assessment criteria."], ["Learning analytics", "See attempts, quiz results and areas of difficulty."], ["AI Lab Coach", "Guide learners through questions and next steps without automatically passing practical work."], ["Offline lesson access", "Keep previously saved lessons available when the connection drops."]].map(([title, description]) => <div key={title}><h3>{title}</h3><p>{description}</p></div>)}</div></section>
      </main>
      <PublicFooter />
    </div>
  );
}
