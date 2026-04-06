"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MapPin, ChevronRight, Target } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { SpotlightCard } from "@/components/ui/spotlight-card";

type School = {
  id: string; name: string; location: string;
  gmat_avg: number; median_salary: string; acceptance_rate: number;
  specializations: string[];
};

function gmatFitLabel(userGmat: number, schoolGmat: number) {
  const diff = userGmat - schoolGmat;
  if (diff >= 0) return { label: "Strong Fit", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" };
  if (diff >= -20) return { label: "Competitive", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" };
  return { label: "Reach", color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/30" };
}

export function FeaturedSchools({
  schools,
  totalSchools,
}: {
  schools: School[];
  totalSchools: number;
}) {
  const router = useRouter();
  const { profile, hasProfile } = useProfile();

  return (
    <section className="bg-background max-w-7xl mx-auto px-8 py-20 border-b border-border">
      <div className="flex justify-between items-end mb-12">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-2 font-semibold">Featured Programs</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">Deep Data on Every School</h2>
        </div>
        <button onClick={() => router.push("/schools")}
          className="text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors">
          All {totalSchools.toLocaleString()} Programs <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schools.map((school, i) => (
          <motion.div
            key={school.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <SpotlightCard
              className="cursor-pointer p-0"
              spotlightColor="rgba(201, 169, 98, 0.12)"
            >
              <div
                onClick={() => router.push(`/school/${school.id}`)}
                className="group p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium flex items-center gap-1">
                    <MapPin size={10} /> {school.location}
                  </p>
                  {hasProfile && profile.gmat && school.gmat_avg > 0 && (() => {
                    const fit = gmatFitLabel(profile.gmat!, school.gmat_avg);
                    return (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border ${fit.bg} ${fit.color} flex items-center gap-1`}>
                        <Target size={8} /> {fit.label}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="heading-serif text-2xl text-foreground mb-4 group-hover:text-primary transition-colors leading-tight">
                  {school.name}
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {school.specializations.slice(0, 3).map(s => (
                    <span key={s} className="text-[10px] bg-muted border border-border px-2 py-0.5 text-muted-foreground uppercase tracking-wider">{s}</span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 border-t border-border pt-5 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">GMAT</p>
                    <p className="font-medium text-lg text-foreground">{school.gmat_avg}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accept</p>
                    <p className="font-medium text-lg text-foreground">{school.acceptance_rate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Salary</p>
                    <p className="font-medium text-lg text-foreground">{school.median_salary}</p>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all text-primary">
                  Explore & Apply <ChevronRight size={14} />
                </div>
              </div>
            </SpotlightCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
