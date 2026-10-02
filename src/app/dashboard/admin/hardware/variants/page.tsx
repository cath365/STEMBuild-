import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { upsertLessonHardwareVariant, upsertProjectHardwareVariant } from "@/lib/admin-actions";

function VariantFields({ sourceLabel = "Source code" }: { sourceLabel?: string }) {
  return <>
    <div className="field"><label>Wiring instructions</label><textarea className="textarea" name="wiringInstructions" required placeholder="Describe power, ground, sensor/module connections and board-specific wiring."/></div>
    <div className="field"><label>GPIO / pin mapping</label><textarea className="textarea" name="gpioMappings" placeholder={"Example:\nSensor VCC -> 3.3V\nSensor GND -> GND\nSensor DATA -> GPIO 4"}/></div>
    <div className="grid grid-2">
      <div className="field"><label>Programming language</label><input className="input" name="codeLanguage" required placeholder="Arduino C++, MicroPython, MakeCode..."/></div>
      <div className="field"><label>Framework / toolchain</label><input className="input" name="programmingFramework" placeholder="Arduino IDE, Pico SDK, MicroPython, STM32CubeIDE..."/></div>
    </div>
    <div className="field"><label>{sourceLabel}</label><textarea className="textarea" name="sourceCode" required style={{minHeight:220}} placeholder="Board-specific example code"/></div>
    <div className="field"><label>Upload / flash procedure</label><textarea className="textarea" name="uploadProcedure" placeholder="Select board/port, connect USB, build/flash, verify serial output..."/></div>
    <div className="field"><label>Expected output</label><textarea className="textarea" name="expectedOutput" required/></div>
    <div className="field"><label>Troubleshooting</label><textarea className="textarea" name="troubleshooting" required placeholder="Board-specific checks only. Keep low-voltage classroom safety rules."/></div>
  </>;
}

export default async function HardwareVariantsPage() {
  await requireRole("ADMIN");
  const [hardware, lessons, projects, lessonVariants, projectVariants] = await Promise.all([
    db.hardwarePlatform.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.lesson.findMany({ include: { module: { include: { course: true } } }, orderBy: [{ module: { course: { title: "asc" } } }, { order: "asc" }] }),
    db.project.findMany({ include: { course: true }, orderBy: { title: "asc" } }),
    db.lessonHardwareVariant.findMany({ include: { hardwarePlatform: true, lesson: { include: { module: { include: { course: true } } } } }, orderBy: { hardwarePlatform: { name: "asc" } } }),
    db.projectHardware.findMany({ include: { hardwarePlatform: true, project: { include: { course: true } } }, orderBy: { hardwarePlatform: { name: "asc" } } }),
  ]);

  return <>
    <div className="topbar"><div className="page-title"><div className="eyebrow">Hardware variants</div><h1 style={{fontSize:38}}>One concept, many boards</h1><div className="muted">Lessons and projects stay hardware-agnostic. These records supply board-specific wiring, pins, code and upload steps.</div></div></div>

    <div className="grid grid-2">
      <div className="card"><h2 style={{fontSize:24}}>Configure lesson variant</h2><form action={upsertLessonHardwareVariant} className="form" style={{marginTop:14}}>
        <div className="field"><label>Core lesson</label><select className="select" name="lessonId" required><option value="">Choose lesson</option>{lessons.map((lesson)=><option key={lesson.id} value={lesson.id}>{lesson.module.course.title} · {lesson.module.title} · {lesson.title}</option>)}</select></div>
        <div className="field"><label>Board</label><select className="select" name="hardwarePlatformId" required><option value="">Choose board</option>{hardware.map((board)=><option key={board.id} value={board.id}>{board.name}</option>)}</select></div>
        <div className="field"><label>Variant title (optional)</label><input className="input" name="title" placeholder="Read temperature — ESP32"/></div>
        <VariantFields />
        <button className="btn btn-primary">Save lesson variant</button>
      </form></div>

      <div className="card"><h2 style={{fontSize:24}}>Configure project variant</h2><form action={upsertProjectHardwareVariant} className="form" style={{marginTop:14}}>
        <div className="field"><label>Core project</label><select className="select" name="projectId" required><option value="">Choose project</option>{projects.map((project)=><option key={project.id} value={project.id}>{project.course.title} · {project.title}</option>)}</select></div>
        <div className="field"><label>Board</label><select className="select" name="hardwarePlatformId" required><option value="">Choose board</option>{hardware.map((board)=><option key={board.id} value={board.id}>{board.name}</option>)}</select></div>
        <div className="field"><label>Notes (optional)</label><input className="input" name="notes" placeholder="Any board-specific project note"/></div>
        <VariantFields />
        <button className="btn btn-primary">Save project variant</button>
      </form></div>
    </div>

    <section className="section"><h2 style={{fontSize:26}}>Configured lesson variants</h2><div className="table-wrap"><table><thead><tr><th>Lesson</th><th>Board</th><th>Language/framework</th><th>Upload procedure</th></tr></thead><tbody>{lessonVariants.map((variant)=><tr key={variant.id}><td>{variant.lesson.module.course.title}<div className="small muted">{variant.lesson.title}</div></td><td>{variant.hardwarePlatform.name}</td><td>{variant.codeLanguage}{variant.programmingFramework ? <div className="small muted">{variant.programmingFramework}</div>:null}</td><td className="small">{variant.uploadProcedure || "Not configured"}</td></tr>)}{lessonVariants.length===0?<tr><td colSpan={4} className="muted">No lesson variants configured.</td></tr>:null}</tbody></table></div></section>

    <section className="section"><h2 style={{fontSize:26}}>Configured project variants</h2><div className="table-wrap"><table><thead><tr><th>Project</th><th>Board</th><th>Language/framework</th><th>Upload procedure</th></tr></thead><tbody>{projectVariants.map((variant)=><tr key={`${variant.projectId}:${variant.hardwarePlatformId}`}><td>{variant.project.course.title}<div className="small muted">{variant.project.title}</div></td><td>{variant.hardwarePlatform.name}</td><td>{variant.codeLanguage || "Not configured"}{variant.programmingFramework ? <div className="small muted">{variant.programmingFramework}</div>:null}</td><td className="small">{variant.uploadProcedure || "Not configured"}</td></tr>)}{projectVariants.length===0?<tr><td colSpan={4} className="muted">No project variants configured.</td></tr>:null}</tbody></table></div></section>
  </>;
}
