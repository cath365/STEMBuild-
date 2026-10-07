import { componentCatalog } from "@/lib/build-catalog";
import { componentVisualFor } from "@/lib/component-visuals";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { deleteComponentMedia, setComponentMediaVerified, uploadComponentMedia } from "@/lib/admin-actions";

export default async function ComponentVisualsAdminPage() {
  await requireRole("ADMIN");
  const media = await db.componentMedia.findMany({ orderBy: [{ componentSlug: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
  const grouped = new Map<string, typeof media>();
  for (const item of media) grouped.set(item.componentSlug, [...(grouped.get(item.componentSlug) ?? []), item]);
  const staticCount = componentCatalog.filter((item) => componentVisualFor(item.slug)).length;

  return <>
    <div className="topbar">
      <div className="page-title">
        <div className="eyebrow">Visual learning</div>
        <h1 style={{fontSize:38}}>Component photos & diagrams</h1>
        <div className="muted">Upload real photos, pinouts and wiring visuals. New uploads remain private until an administrator verifies them.</div>
      </div>
    </div>

    <div className="grid grid-3">
      <div className="card"><div className="eyebrow">Public catalog</div><div style={{fontSize:34,fontWeight:800,marginTop:8}}>{componentCatalog.length}</div><div className="small muted">components</div></div>
      <div className="card"><div className="eyebrow">Verified source photos</div><div style={{fontSize:34,fontWeight:800,marginTop:8}}>{staticCount}</div><div className="small muted">built-in real photos</div></div>
      <div className="card"><div className="eyebrow">Uploaded media</div><div style={{fontSize:34,fontWeight:800,marginTop:8}}>{media.length}</div><div className="small muted">{media.filter((item)=>item.verified).length} verified</div></div>
    </div>

    <section className="section">
      <div className="card">
        <h2 style={{fontSize:25}}>Upload component media</h2>
        <p className="small muted">Use a clear photo you own or have permission to use. Add source/licence information when the image comes from another creator. Keep wiring and pinout diagrams specific to the exact component/version shown.</p>
        <form action={uploadComponentMedia} className="form" style={{marginTop:18}}>
          <div className="grid grid-2">
            <div className="field"><label>Component</label><select className="select" name="componentSlug" required><option value="">Select component</option>{componentCatalog.map((item)=><option key={item.slug} value={item.slug}>{item.name}</option>)}</select></div>
            <div className="field"><label>Visual type</label><select className="select" name="kind" defaultValue="PHOTO"><option value="PHOTO">Real photo</option><option value="PINOUT">Pinout</option><option value="WIRING">Wiring</option><option value="EXPECTED_RESULT">Expected result</option><option value="COMMON_MISTAKE">Common mistake</option></select></div>
          </div>
          <div className="field"><label>Image</label><input className="input" type="file" name="media" accept="image/jpeg,image/png,image/webp" required/><span className="small muted">JPG, PNG or WEBP · maximum 3.5 MB</span></div>
          <div className="field"><label>Alt text</label><input className="input" name="altText" placeholder="Real HC-SR04 ultrasonic sensor showing VCC, TRIG, ECHO and GND pins" required maxLength={220}/></div>
          <div className="field"><label>Caption</label><textarea className="textarea" name="caption" placeholder="Explain what the learner should notice in this image." required maxLength={600}/></div>
          <div className="grid grid-2">
            <div className="field"><label>Photo / diagram credit</label><input className="input" name="credit" placeholder="Your name or original creator"/></div>
            <div className="field"><label>Licence</label><input className="input" name="licenseName" placeholder="Own work, CC BY-SA 4.0, Public domain…"/></div>
          </div>
          <div className="grid grid-2">
            <div className="field"><label>Licence URL</label><input className="input" type="url" name="licenseUrl" placeholder="https://…"/></div>
            <div className="field"><label>Source URL</label><input className="input" type="url" name="sourceUrl" placeholder="https://…"/></div>
          </div>
          <div className="field"><label>Display order</label><input className="input" type="number" name="sortOrder" min="0" max="999" defaultValue="0"/></div>
          <div className="notice"><strong>Verification rule:</strong> uploads are saved as unverified. Review the actual image below, then explicitly publish it.</div>
          <button className="btn btn-primary">Upload for review</button>
        </form>
      </div>
    </section>

    <section className="section">
      <div className="section-title"><div><div className="eyebrow">Review queue</div><h2>Uploaded visuals</h2></div></div>
      {media.length ? <div className="stack">{media.map((item) => {
        const component = componentCatalog.find((entry)=>entry.slug===item.componentSlug);
        return <article className="card" key={item.id}>
          <div className="component-admin-media">
            <img src={`/api/component-media/${item.id}`} alt={item.altText}/>
            <div>
              <div className="inline"><span className="badge">{item.kind.replaceAll("_"," ")}</span><span className={item.verified ? "badge badge-green" : "badge badge-yellow"}>{item.verified ? "VERIFIED" : "PRIVATE REVIEW"}</span></div>
              <h3 style={{marginTop:10}}>{component?.name ?? item.componentSlug}</h3>
              <p>{item.caption}</p>
              <div className="small muted">Alt: {item.altText}</div>
              {(item.credit || item.licenseName) ? <div className="small muted" style={{marginTop:6}}>Credit: {item.credit ?? "—"} · Licence: {item.licenseName ?? "—"}</div> : null}
              <div className="inline" style={{marginTop:14}}>
                <form action={setComponentMediaVerified.bind(null,item.id)}>
                  <input type="hidden" name="verified" value={item.verified ? "false" : "true"}/>
                  <button className={item.verified ? "btn" : "btn btn-primary"}>{item.verified ? "Return to private review" : "Verify & publish"}</button>
                </form>
                <form action={deleteComponentMedia.bind(null,item.id)}><button className="btn">Delete</button></form>
              </div>
            </div>
          </div>
        </article>;
      })}</div> : <div className="card empty">No uploaded component media yet. The built-in verified photos remain available on public component pages.</div>}
    </section>

    <section className="section">
      <div className="card">
        <div className="eyebrow">Coverage</div>
        <h2 style={{marginTop:8}}>Which components still need a real photo?</h2>
        <div className="component-coverage-grid" style={{marginTop:18}}>
          {componentCatalog.map((item)=>{
            const builtIn=Boolean(componentVisualFor(item.slug));
            const uploaded=(grouped.get(item.slug) ?? []).some((entry)=>entry.verified && entry.kind==="PHOTO");
            return <div key={item.slug} className="component-coverage-item"><strong>{item.name}</strong><span className={builtIn || uploaded ? "badge badge-green" : "badge"}>{uploaded ? "Uploaded photo" : builtIn ? "Built-in photo" : "Photo needed"}</span></div>;
          })}
        </div>
      </div>
    </section>
  </>;
}
