import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { ComponentVisualCard } from "@/components/component-visual-card";
import { BoardPicker, ComponentLab, GuideCheck } from "@/components/learn/component-lab";
import { componentBySlug, componentCatalog, projectsUsingComponent } from "@/lib/build-catalog";
import { db } from "@/lib/db";
import type { ComponentVisual } from "@/lib/component-visuals";
import { pinoutFor } from "@/lib/component-pinouts";
import { BOARDS, pinLabel, type BoardProfile } from "@/lib/learn/boards";
import { guideFor } from "@/lib/learn/guides";
import { ROADMAP, stageOf } from "@/lib/learn/roadmap";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return componentCatalog.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = componentBySlug(slug);
  if (!item) return {};
  return { title: `${item.name}: how it works and how to wire it`, description: guideFor(slug)?.idea ?? item.summary };
}

const NAMES = Object.fromEntries(componentCatalog.map((c) => [c.slug, c.name]));

function BoardPinMap({ board }: { board: BoardProfile }) {
  const list = (pins: string[]) => pins.map((p) => pinLabel(board, p)).join(", ");
  const rows: [string, string][] = [
    ["Logic voltage", `${board.logic} V: a HIGH pin is ${board.logic} V, and inputs must not exceed it`],
    ["Power pins", `${pinLabel(board, board.power5v)} (5 V) · ${pinLabel(board, board.power3v3)} (3.3 V) · ${pinLabel(board, board.gnd)}`],
    ["Good general pins", list(board.digital.slice(0, 8))],
    ["PWM pins", board.logic === 5 ? `${list(board.pwm)} (marked ~)` : "Any output pin can make PWM"],
    ["Analog inputs", `${list(board.analog)}. ${board.adc.note}`],
    ["I2C", `SDA ${pinLabel(board, board.i2c.sda)} · SCL ${pinLabel(board, board.i2c.scl)}`],
    ["SPI", `MOSI ${pinLabel(board, board.spi.mosi)} · MISO ${pinLabel(board, board.spi.miso)} · SCK ${pinLabel(board, board.spi.sck)} · CS ${pinLabel(board, board.spi.cs)}`],
    ["Serial for modules", board.uart.soft ? `SoftwareSerial on ${pinLabel(board, board.uart.rx)} (RX) and ${pinLabel(board, board.uart.tx)} (TX)` : `${board.uart.name}: RX ${pinLabel(board, board.uart.rx)} · TX ${pinLabel(board, board.uart.tx)}`],
    ["Powering it", board.powerIn],
    ["Code in", board.languages.map((l) => (l === "arduino" ? "Arduino C++" : "MicroPython")).join(" or ")],
  ];
  return <section className="card guide-section" aria-labelledby="pinmap-heading">
    <div className="eyebrow">Pin map</div>
    <h2 id="pinmap-heading" style={{ marginTop: 8 }}>The pins STEMBuild guides use on the {board.name}</h2>
    <dl className="guide-facts guide-facts-wide">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <div className="notice" style={{ marginTop: 16 }}>{board.cautions.map((c) => <p key={c}>{c}</p>)}</div>
    <p className="small muted" style={{ marginTop: 12 }}>Choose it as your board, and every component guide shows its wiring and code for the {board.name}:</p>
    <BoardPicker />
  </section>;
}

export default async function ComponentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = componentBySlug(slug);
  if (!item) notFound();
  const guide = guideFor(item.slug);
  const stage = stageOf(item.slug);
  const stageNumber = stage ? ROADMAP.indexOf(stage) + 1 : null;
  const board = BOARDS.find((b) => b.slug === item.slug);
  const projects = projectsUsingComponent(item.slug);
  const uploadedMedia = await db.componentMedia.findMany({
    where: { componentSlug: item.slug, verified: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const uploadedPhoto = uploadedMedia.find((media) => media.kind === "PHOTO");
  const uploadedVisual: ComponentVisual | null = uploadedPhoto ? {
    slug: item.slug,
    src: `/api/component-media/${uploadedPhoto.id}`,
    alt: uploadedPhoto.altText,
    caption: uploadedPhoto.caption,
    credit: uploadedPhoto.credit ?? undefined,
    license: uploadedPhoto.licenseName ?? undefined,
    licenseUrl: uploadedPhoto.licenseUrl ?? undefined,
    sourceUrl: uploadedPhoto.sourceUrl ?? undefined,
    kind: "photo",
    verified: true,
    local: true,
  } : null;
  const learningVisuals = uploadedMedia.filter((media) => media.kind !== "PHOTO");
  const pinout = pinoutFor(item.slug);
  const wired = Boolean(guide?.pins.length);

  return <div>
    <PublicHeader />
    <main>
      <section className="sample-hero">
        <div className="container">
          <div className="eyebrow">{item.category}{stage ? ` · Roadmap stage ${stageNumber}: ${stage.title}` : ""}</div>
          <h1>{item.name}</h1>
          <p className="lead">{guide?.idea ?? item.summary}</p>
          <div className="inline" style={{marginTop:18}}>
            {wired ? <a className="btn btn-primary" href="#wire-it">Wire it to my board</a> : null}
            <Link className="btn" href="/start">Learning roadmap</Link>
            {projects[0] ? <Link className="btn" href={`/build/${projects[0].slug}`}>Build with this component</Link> : null}
          </div>
        </div>
      </section>

      <div className="container component-detail-layout">
        <article className="stack">
          {guide ? <section className="card guide-section" aria-labelledby="how-heading">
            <div className="eyebrow">Step 1 · Understand it</div>
            <h2 id="how-heading" style={{marginTop:8}}>How it works</h2>
            {guide.howItWorks.map((p) => <p key={p}>{p}</p>)}
            <dl className="guide-facts">{guide.facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
          </section> : null}

          <section className="card component-recognition-card">
            <div className="eyebrow">Recognise it in real life</div>
            <h2 style={{marginTop:8}}>What should I look for?</h2>
            <ComponentVisualCard slug={item.slug} visual={uploadedVisual} />
            <p className="small muted">This is a recognition aid, not a substitute for the markings or datasheet on the exact component in your hand. Clones and revisions can look different.</p>
          </section>

          {pinout ? <section className="card">
            <div className="eyebrow">Pin and role guide</div>
            <h2 style={{marginTop:8}}>{pinout.title}</h2>
            <p className="small muted">{pinout.orientationNote}</p>
            <div className="pinout-visual" role="list">
              {pinout.pins.map((pin) => <div className="pinout-row" role="listitem" key={pin.label}>
                <div className="pinout-label">{pin.label}</div>
                <div className="pinout-role">{pin.role}{pin.caution ? <div className="pinout-caution">⚠ {pin.caution}</div> : null}</div>
              </div>)}
            </div>
          </section> : null}

          {board ? <BoardPinMap board={board} /> : null}
          {guide && wired ? <ComponentLab guide={guide} name={item.name} /> : null}

          {guide ? <section className="card guide-section" aria-labelledby="mistakes-heading">
            <div className="eyebrow">{wired ? "Step 4 · Avoid these" : "Step 2 · Avoid these"}</div>
            <h2 id="mistakes-heading" style={{marginTop:8}}>Common mistakes</h2>
            <ul className="guide-mistakes">{guide.mistakes.map((m) => <li key={m}>{m}</li>)}</ul>
          </section> : null}

          {guide ? <GuideCheck slug={item.slug} check={guide.check} names={NAMES} step={wired ? 5 : 3} /> : null}

          <section className="card">
            <div className="eyebrow">Connect it safely</div>
            <div className="component-detail-grid">
              <div><h3>Voltage</h3><p>{item.voltage}</p></div>
              <div><h3>Interface</h3><p>{item.interface}</p></div>
              <div><h3>Pins / connections</h3><p>{item.pins}</p></div>
              <div><h3>Compatible boards</h3><p>{item.compatibleBoards.join(", ")}</p></div>
            </div>
            <div className="notice" style={{marginTop:18}}><strong>Safety:</strong> {item.safety}</div>
          </section>

          {learningVisuals.length ? <section className="card">
            <div className="eyebrow">Visual learning aids</div>
            <h2 style={{marginTop:8}}>See the pinout, wiring and expected result</h2>
            <div className="component-learning-gallery">
              {learningVisuals.map((media) => <figure key={media.id} className="component-learning-visual">
                <img src={`/api/component-media/${media.id}`} alt={media.altText} loading="lazy"/>
                <figcaption><span className="badge">{media.kind.replaceAll("_"," ")}</span><p>{media.caption}</p></figcaption>
              </figure>)}
            </div>
          </section> : null}

          <section className="card">
            <div className="eyebrow">Build something</div>
            <h2 style={{marginTop:8}}>Projects that use {item.name}</h2>
            {projects.length ? <div className="project-match-grid" style={{marginTop:18}}>{projects.map((project) => <div className="card card-muted" key={project.slug}>
              <div className="inline"><span className="badge">{project.level}</span><span className="badge">{project.area}</span></div>
              <h3 style={{marginTop:12}}>{project.title}</h3>
              <p className="small muted">{project.summary}</p>
              <Link className="text-link" href={`/build/${project.slug}`}>Open Build Mode →</Link>
            </div>)}</div> : <p className="muted">No public build is linked to this component yet.</p>}
          </section>
        </article>

        <aside className="stack">
          {stage ? <div className="card">
            <div className="eyebrow">Your learning path</div>
            <h3 style={{marginTop:8}}>Stage {stageNumber}: {stage.title}</h3>
            <p className="small muted">{stage.goal}</p>
            <ul className="guide-stage-list">{stage.core.map((s) => <li key={s} aria-current={s === item.slug ? "step" : undefined}><Link href={`/components/${s}`}>{NAMES[s]}</Link></li>)}</ul>
            <Link className="btn" href="/start">See the whole roadmap</Link>
          </div> : null}
          {guide ? <div className="card">
            <div className="eyebrow">Where it is used</div>
            <h3 style={{marginTop:8}}>In industry</h3>
            <p className="small muted">{guide.inIndustry}</p>
          </div> : null}
          {guide?.related?.length ? <div className="card">
            <div className="eyebrow">Learn next to it</div>
            <ul className="guide-stage-list">{guide.related.map((s) => <li key={s}><Link href={`/components/${s}`}>{NAMES[s]}</Link></li>)}</ul>
          </div> : null}
          <div className="card">
            <div className="eyebrow">STEMBuild rule</div>
            <h3 style={{marginTop:8}}>Never guess a pinout.</h3>
            <p className="small muted">If the physical module in your hand does not match the labels shown in a lesson, stop and verify the exact board/module before connecting power.</p>
          </div>
          <div className="card">
            <div className="eyebrow">Next step</div>
            <h3 style={{marginTop:8}}>Add it to your kit</h3>
            <p className="small muted">Use My Components to tell STEMBuild which parts you own and see which projects you can build now.</p>
            <Link className="btn" href="/components">Open My Components</Link>
          </div>
        </aside>
      </div>
    </main>
    <PublicFooter />
  </div>;
}
