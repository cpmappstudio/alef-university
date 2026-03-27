"use client";

import Image from "next/image";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

type LibraryHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  imageAlt: string;
};

export function LibraryHero({
  eyebrow,
  title,
  description,
  imageAlt,
}: LibraryHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/90 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />

      <div className="grid gap-8 px-6 py-7 md:grid-cols-[minmax(0,1.6fr)_220px] md:px-8 md:py-8">
        <div className="space-y-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>

          <div className="space-y-3">
            <h1
              className={`${cormorant.className} max-w-4xl text-4xl leading-none text-foreground md:text-[3.25rem]`}
            >
              {title}
            </h1>
            <div className="h-px w-24 bg-primary/25" />
          </div>

          <p className="max-w-4xl text-sm leading-7 text-muted-foreground md:text-[15px]">
            {description}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[220px] md:mx-0 md:justify-self-end">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[1.5rem] border border-primary/10 bg-primary/5" />
          <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-muted/30">
            <Image
              src="/billjdotson.jpeg"
              alt={imageAlt}
              width={440}
              height={550}
              priority
              className="aspect-[4/5] h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
