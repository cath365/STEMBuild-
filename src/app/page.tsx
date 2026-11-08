import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { BoardGallery } from "@/components/board-gallery";
import { ArrowRightIcon, BoxIcon, CalculatorIcon, ChartIcon, ChipIcon, ClipboardIcon, LogicIcon, MultimeterIcon, OfflineIcon, ScopeIcon, SparkIcon, UsbIcon } from "@/components/icons";
import { buildProjects } from "@/lib/build-catalog";
import styles from "./home.module.css";

const featuredSlugs = ["first-led", "button-light", "traffic-light", "light-detector", "smart-environment-monitor", "plant-monitor", "obstacle-robot", "weather-station"];
const featured = featuredSlugs.map((slug) => buildProjects.find((project) => project.slug === slug)).filter((project): project is NonNullable<typeof project> => Boolean(project));
const boardCount = new Set(buildProjects.flatMap((project) => project.boards)).size;

const startPaths = [
  { icon: BoxIcon, title: "Follow a guided project", body: "Pick something you want to make. Each project walks through parts, safe wiring, code and testing, one step at a time.", href: "/projects", cta: "Browse projects" },
  { icon: MultimeterIcon, title: "Practise without hardware", body: "Build circuits, measure them with a multimeter and run Arduino code on a simulated board, all in the browser.", href: "/tools", cta: "Open the virtual lab" },
  { icon: ChipIcon, title: "Start from the parts you have", body: "Tick the components in your kit and see which projects you can build today, and what you’re missing for the rest.", href: "/components", cta: "Check my components" },
];

const labTools = [
  { icon: CalculatorIcon, name: "Engineering calculators", detail: "Ohm’s law, colour codes, LED resistors", href: "/tools/calculators" },
  { icon: MultimeterIcon, name: "Circuit bench & multimeter", detail: "Volts, amps, ohms and continuity", href: "/tools/multimeter" },
  { icon: LogicIcon, name: "Logic gate lab", detail: "Truth tables to binary adders", href: "/tools/logic" },
  { icon: ChipIcon, name: "Virtual Arduino Uno", detail: "Real C++ on an emulated ATmega328P", href: "/tools/virtual-arduino" },
  { icon: ScopeIcon, name: "Oscilloscope", detail: "PWM, filters and rectifiers", href: "/tools/oscilloscope" },
  { icon: UsbIcon, name: "Live hardware monitor", detail: "Graph a real board over USB", href: "/hardware-monitor" },
];

const topics = [
  { className: "electronics", area: "Electronics", title: "Electronics foundations", body: "Voltage, current and resistance, breadboards, and wiring an LED that won’t burn out.", lessons: ["Voltage, current and resistance", "Breadboards and jumper wires", "LEDs, resistors and safe wiring"], href: "/login", label: "Sign in to learn about Electronics foundations", cta: "Sign in to learn" },
  { className: "programming", area: "Programming", title: "Microcontroller programming", body: "Turn a few lines of code into something you can see, hear and control.", lessons: ["Digital inputs and outputs", "Buttons, buzzers and GPIO", "Reading code and finding errors"], href: "/login", label: "Sign in to learn about Microcontroller programming", cta: "Sign in to learn" },
  { className: "sensors", area: "IoT & sensors", title: "Smart Environment Monitor", body: "Read temperature and humidity, record real measurements and check them against each other.", lessons: ["Arduino Uno and ESP32 versions", "Sensor wiring and readings", "Evidence and teacher assessment"], href: "/showcase/smart-environment-monitor", label: "Try the Smart Environment Monitor sample lesson", cta: "Try the sample lesson" },
  { className: "robotics", area: "Robotics", title: "Build a simple robot", body: "Bring motors, sensors and code together in a robot that avoids obstacles.", lessons: ["Motors and motor drivers", "Obstacle sensing", "Testing and troubleshooting"], href: "/learning-paths/first-robot", label: "Follow the First Robot Path", cta: "Follow the robot path" },
];

const teacherFeatures = [
  { icon: ClipboardIcon, title: "Practical assessment", body: "Score the real build against a rubric, with photos, code and readings in one place." },
  { icon: ChartIcon, title: "Learning analytics", body: "See attempts, quiz results and where each learner gets stuck." },
  { icon: SparkIcon, title: "AI Lab Coach", body: "Guides learners with questions. It never marks practical work as passed." },
  { icon: OfflineIcon, title: "Offline lessons", body: "Saved lessons stay available when the connection drops." },
];

export default function Home() {
  return <div className={styles.home}>
    <a className={styles.skipLink} href="#main">Skip to content</a>
    <PublicHeader />
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`container ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>For schools, clubs and self-learners</p>
            <h1 id="hero-title">Learn electronics and robotics by building real things.</h1>
            <p className={styles.heroLead}>Guided projects for Arduino, ESP32 and Raspberry Pi Pico, a virtual lab for when the parts haven’t arrived, and practical assessment teachers can rely on.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/projects">Start a project <ArrowRightIcon className={styles.buttonIcon} /></Link>
              <Link className={styles.secondaryButton} href="/3d-lab">Launch 3D Lab</Link>
            </div>
            <dl className={styles.heroFacts}>
              <div><dt>Guided projects</dt><dd>{buildProjects.length}</dd></div>
              <div><dt>Boards supported</dt><dd>{boardCount}</dd></div>
              <div><dt>Virtual lab tools</dt><dd>{labTools.length}</dd></div>
            </dl>
          </div>
          <figure className={styles.heroFigure}>
            <div className={styles.photoFrame}><Image src="/electronics-workbench.jpg" alt="Arduino Uno connected to a breadboard with jumper wires, an LED and a potentiometer" fill sizes="(max-width: 900px) 100vw, 560px" preload /></div>
            <figcaption>Arduino Uno, breadboard and potentiometer: the kit for the first five projects.</figcaption>
          </figure>
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="start-title">
        <div className="section-heading"><div><h2 id="start-title">Three ways to start</h2><p>Whatever you have in front of you, there’s a sensible first step.</p></div></div>
        <div className={styles.startGrid}>
          {startPaths.map(({ icon: Icon, title, body, href, cta }) => <Link key={href} href={href} className={styles.startCard}>
            <span className="icon-tile"><Icon /></span>
            <h3>{title}</h3>
            <p>{body}</p>
            <span className={styles.cardCta}>{cta} <ArrowRightIcon className={styles.ctaIcon} /></span>
          </Link>)}
        </div>
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="projects-title">
        <div className="section-heading"><div><h2 id="projects-title">Popular first projects</h2><p>Each one starts small and adds a single new idea at a time.</p></div><Link className="text-link" href="/projects">All {buildProjects.length} projects →</Link></div>
        <div className={styles.projectGrid}>
          {featured.map((project) => <Link key={project.slug} href={`/build/${project.slug}`} className={styles.projectCard}>
            <span className={styles.projectMeta}>{project.level} · {project.area}</span>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <span className={styles.projectFoot}><span>~{project.minutes} min</span><span>{project.boards.length} boards</span></span>
          </Link>)}
        </div>
      </section>

      <section className={styles.labBand} aria-labelledby="lab-title">
        <div className={`container ${styles.labGrid}`}>
          <div>
            <h2 id="lab-title">No components yet? Use the virtual lab.</h2>
            <p>The instruments an engineering student learns on, working in the browser. Build a circuit and measure it, watch a signal on an oscilloscope, or compile Arduino code and run it on a simulated chip.</p>
            <Link className="btn btn-primary" href="/tools">Open the virtual lab</Link>
          </div>
          <ul className={styles.toolList}>
            {labTools.map(({ icon: Icon, name, detail, href }) => <li key={href}><Link href={href}><span className="icon-tile"><Icon /></span><span><strong>{name}</strong><span>{detail}</span></span><ArrowRightIcon className={styles.rowArrow} /></Link></li>)}
          </ul>
        </div>
      </section>

      <section id="topics" className={`container ${styles.section}`} aria-labelledby="topics-title">
        <div className="section-heading"><div><h2 id="topics-title">Learn the ideas behind the build</h2><p>Projects give you a reason to learn. These areas explain why the circuit, code and hardware behave the way they do.</p></div><Link className="text-link" href="/components">Component library →</Link></div>
        <div className={styles.topicGrid}>
          {topics.map((topic) => <article key={topic.title} className={`${styles.topicCard} ${styles[topic.className]}`}>
            <span className={styles.projectMeta}>{topic.area}</span>
            <h3>{topic.title}</h3>
            <p>{topic.body}</p>
            <ul>{topic.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul>
            <Link href={topic.href} aria-label={topic.label} className={styles.cardCta}>{topic.cta} <ArrowRightIcon className={styles.ctaIcon} /></Link>
          </article>)}
        </div>
      </section>

      <BoardGallery />

      <section id="teachers" className={styles.teacherBand} aria-labelledby="teacher-title">
        <div className={`container ${styles.teacherGrid}`}>
          <div>
            <h2 id="teacher-title">Independent learners, with teacher oversight</h2>
            <p>Learners submit evidence of the real build. Teachers review it against clear criteria and see exactly where help is needed: wiring, code, testing or troubleshooting.</p>
            <Link className="btn" href="/teachers">Teacher setup guide</Link>
          </div>
          <div className={styles.teacherFeatures}>
            {teacherFeatures.map(({ icon: Icon, title, body }) => <div key={title}><span className="icon-tile"><Icon /></span><h3>{title}</h3><p>{body}</p></div>)}
          </div>
        </div>
      </section>
    </main>
    <PublicFooter />
  </div>;
}
