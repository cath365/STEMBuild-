"use client";

import { useState } from "react";

function kb(bytes: number) { return Math.max(1, Math.round(bytes / 1024)); }

async function compressImage(file: File) {
  if (!file.type.startsWith("image/") || file.size < 700_000 || !globalThis.createImageBitmap) return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
  if (!blob || blob.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
}

export function CompressedEvidenceInput({ label = "Evidence photo or PDF" }: { label?: string }) {
  const [message, setMessage] = useState("Images are compressed on-device before upload when useful.");

  return <div className="field">
    <label>{label}</label>
    <input
      className="input"
      name="evidence"
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      required
      onChange={async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file || file.type === "application/pdf") {
          setMessage(file ? `PDF selected · ${kb(file.size)} KB` : "Images are compressed on-device before upload when useful.");
          return;
        }
        try {
          const compressed = await compressImage(file);
          if (compressed !== file) {
            const data = new DataTransfer();
            data.items.add(compressed);
            input.files = data.files;
            setMessage(`Compressed ${kb(file.size)} KB → ${kb(compressed.size)} KB before upload.`);
          } else {
            setMessage(`Image ready · ${kb(file.size)} KB`);
          }
        } catch {
          setMessage(`Image ready · ${kb(file.size)} KB (compression unavailable on this device).`);
        }
      }}
    />
    <span className="small muted">{message}</span>
  </div>;
}
