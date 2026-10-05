import Image from "next/image";

import { cn } from "@/lib/utils";

const logoSource = "/brand/iba-color.webp";

export function IbaLogo({ className, preload = false }: { className?: string; preload?: boolean }) {
  return (
    <Image
      src={logoSource}
      width={1192}
      height={1320}
      alt="Igreja Batista da Aliança em Resende"
      className={cn("h-auto w-40", className)}
      sizes="160px"
      preload={preload}
    />
  );
}

export function IbaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("relative block size-11 shrink-0 overflow-hidden rounded-xl bg-white", className)}
    >
      <Image
        src={logoSource}
        width={1192}
        height={1320}
        alt=""
        sizes="44px"
        className="absolute left-1/2 top-0 h-auto w-[4.6rem] max-w-none -translate-x-1/2"
      />
    </span>
  );
}

export function BrandSpectrum({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("brand-spectrum block", className)} />;
}
