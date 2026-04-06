"use client";

import { Quote } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";

const TESTIMONIALS = [
  {
    quote: "I was paying a consultant ₹8 lakhs. Cancelled after two weeks with this — the data here is more useful than anything they showed me.",
    initials: "AK",
    detail: "710 GMAT → Admitted ISB",
    highlight: "Saved ₹8L",
  },
  {
    quote: "The scholarship intelligence page showed me Darden gives 50% tuition to my profile type. My consultant never mentioned Darden. I got $80K in aid.",
    initials: "SP",
    detail: "730 GMAT → Admitted Darden, $80K scholarship",
    highlight: "$80K scholarship",
  },
  {
    quote: "Used the odds calculator for 8 schools. Showed me two reaches I was wasting money on and two targets I hadn't considered. Got into both targets.",
    initials: "MR",
    detail: "Career switcher → Admitted Wharton R2",
    highlight: "Found hidden targets",
  },
  {
    quote: "The real essay examples were game-changing. Reading actual admitted essays from Booth showed me exactly what 'authentic' looks like. Not the cliché version.",
    initials: "NK",
    detail: "3.2 GPA → Admitted Booth + Ross",
    highlight: "Real essay examples",
  },
  {
    quote: "I'm from a non-traditional background. Every consultant told me M7 was unrealistic. This platform showed me 67 people with my exact profile who got in. Applied and got Kellogg.",
    initials: "RD",
    detail: "Non-profit background → Admitted Kellogg R1",
    highlight: "Data over opinions",
  },
  {
    quote: "Mock interviews with specific Booth behavioral questions. My actual interview had three of the same questions. Felt like I'd already done it.",
    initials: "JL",
    detail: "4 years consulting → Admitted Booth",
    highlight: "Interview prep",
  },
  {
    quote: "Applied to 6 schools, got into 4 with scholarships at 3. The school list optimizer changed everything — I was originally planning a completely different list.",
    initials: "PK",
    detail: "740 GMAT → 4/6 admits, 3 scholarships",
    highlight: "4/6 admit rate",
  },
  {
    quote: "My parents wanted me to hire a consultant. Showed them this platform over dinner. My dad said 'this has more data than any person could.' Saved the family a lot of money.",
    initials: "AS",
    detail: "Indian engineer → Admitted INSEAD",
    highlight: "Family approved",
  },
];

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="w-[360px] shrink-0 bg-card border border-border/50 p-6 flex flex-col rounded-xl">
      <Quote size={14} className="text-primary/20 mb-3" />
      <p className="text-sm text-foreground/80 leading-relaxed flex-1">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="mt-5 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-primary bg-primary/8 rounded-full">
              {t.initials}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{t.detail}</p>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full whitespace-nowrap">
            {t.highlight}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TestimonialGrid() {
  const firstRow = TESTIMONIALS.slice(0, 4);
  const secondRow = TESTIMONIALS.slice(4);

  return (
    <section className="bg-background py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-12">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground/40 mb-3 font-semibold text-center">
          From Our Community
        </p>
        <h2 className="text-3xl sm:text-4xl font-semibold text-foreground text-center tracking-tight mb-3">
          They stopped guessing. You can too.
        </h2>
        <p className="text-center text-muted-foreground max-w-md mx-auto">
          Real applicants who used data instead of expensive consultants.
        </p>
      </div>

      <div className="space-y-4">
        <Marquee speed={30} direction="left" pauseOnHover>
          {firstRow.map((t) => (
            <TestimonialCard key={t.initials} t={t} />
          ))}
        </Marquee>
        <Marquee speed={30} direction="right" pauseOnHover>
          {secondRow.map((t) => (
            <TestimonialCard key={t.initials} t={t} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
