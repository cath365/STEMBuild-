import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="STEMBuild home">
      <Image
        className="brand-icon"
        src="/brand/stembuild-icon-64x64.png"
        alt=""
        width={40}
        height={40}
        unoptimized
        aria-hidden="true"
      />
      <Image
        className="brand-wordmark"
        src="/brand/stembuild-wordmark.png"
        alt="STEMBuild"
        width={170}
        height={30}
        unoptimized
      />
    </Link>
  );
}
