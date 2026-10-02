"use client";

import { useMemo, useState } from "react";

export type HardwareVariantOption = {
  hardwarePlatformId: string;
  hardwarePlatform: string;
  wiringInstructions: string;
  gpioMappings: string;
  codeLanguage: string;
  programmingFramework: string;
  sourceCode: string;
  uploadProcedure: string;
  expectedOutput: string;
  troubleshooting: string;
  components?: string[];
  advancedExtension?: string | null;
};

export function HardwareVariantSelector({
  variants,
  fieldName = "hardwarePlatformId",
  label = "Choose your board",
  defaultId,
  compact = false,
}: {
  variants: HardwareVariantOption[];
  fieldName?: string;
  label?: string;
  defaultId?: string | null;
  compact?: boolean;
}) {
  const initial = defaultId && variants.some((v) => v.hardwarePlatformId === defaultId)
    ? defaultId
    : variants[0]?.hardwarePlatformId ?? "";
  const [selectedId, setSelectedId] = useState(initial);
  const selected = useMemo(
    () => variants.find((v) => v.hardwarePlatformId === selectedId) ?? variants[0],
    [selectedId, variants],
  );

  if (!selected) return <div className="notice">No compatible hardware variant has been configured yet.</div>;

  return <div className="stack" style={{gap:12}}>
    <input type="hidden" name={fieldName} value={selected.hardwarePlatformId}/>
    <div>
      <div className="eyebrow">{label}</div>
      <div className="inline" style={{marginTop:8}}>
        {variants.map((variant) => <button
          key={variant.hardwarePlatformId}
          type="button"
          className={variant.hardwarePlatformId === selected.hardwarePlatformId ? "btn btn-primary" : "btn"}
          aria-pressed={variant.hardwarePlatformId === selected.hardwarePlatformId}
          onClick={() => setSelectedId(variant.hardwarePlatformId)}
        >{variant.hardwarePlatform}</button>)}
      </div>
    </div>
    {!compact ? <div className="card card-muted">
      <div className="inline">
        <span className="badge">{selected.codeLanguage || "Code"}</span>
        {selected.programmingFramework ? <span className="badge">{selected.programmingFramework}</span> : null}
      </div>
      {selected.components?.length ? <><h3 style={{marginTop:12}}>Components</h3><ul className="list">{selected.components.map((item)=><li key={item}>{item}</li>)}</ul></> : null}
      <h3 style={{marginTop:12}}>Wiring</h3>
      <p className="muted">{selected.wiringInstructions || "No wiring instructions configured yet."}</p>
      {selected.gpioMappings ? <><h3>GPIO / pin mapping</h3><pre className="code">{selected.gpioMappings}</pre></> : null}
      <h3>Source code</h3>
      <pre className="code">{selected.sourceCode || "// No source code configured yet."}</pre>
      {selected.uploadProcedure ? <><h3>Upload procedure</h3><p className="muted">{selected.uploadProcedure}</p></> : null}
      {selected.expectedOutput ? <><h3>Expected result</h3><p className="muted">{selected.expectedOutput}</p></> : null}
      {selected.troubleshooting ? <><h3>Troubleshooting</h3><p className="muted">{selected.troubleshooting}</p></> : null}
      {selected.advancedExtension ? <details className="notice" style={{marginTop:16}}><summary><strong>Advanced mode · connected dashboard extension</strong></summary><p style={{marginBottom:0,marginTop:10}}>{selected.advancedExtension}</p></details> : null}
    </div> : null}
  </div>;
}
