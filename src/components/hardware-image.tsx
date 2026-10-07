import Image from "next/image";
import { hardwareImageFor } from "@/lib/hardware-images";
export function HardwareImage({ name, decorative = false }: { name: string; decorative?: boolean }) {
  const board = hardwareImageFor(name);
  if (!board) return null;
  return <span className="hardware-image"><Image src={board.image} alt={decorative ? "" : board.model} fill sizes="(max-width: 620px) 140px, 180px" /></span>;
}
