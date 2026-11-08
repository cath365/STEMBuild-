import { boards } from "@/lib/hardware-images";
import { HardwareImage } from "@/components/hardware-image";

export function BoardGallery() {
  return <section id="boards" className="container board-gallery" aria-labelledby="boards-heading">
    <div className="section-heading"><div><h2 id="boards-heading">Works with the board you have</h2><p>Each lesson keeps the same goal and adapts the wiring, pins and code to your microcontroller.</p></div></div>
    <div className="board-grid">{boards.map((board) => <article className="board-card" key={board.id}><HardwareImage name={board.name} /><div><h3>{board.name}</h3><p className="small muted">{board.description}</p></div></article>)}</div>
    <details className="image-credits"><summary>Photo credits</summary><ul>{boards.map((board) => <li key={board.id}><a href={board.source} target="_blank" rel="noreferrer">{board.name}</a> by {board.artist}, <a href={board.licenseUrl} target="_blank" rel="noreferrer">{board.license}</a>. Shown unedited.</li>)}</ul></details>
  </section>;
}
