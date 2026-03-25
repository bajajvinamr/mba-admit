"use client";

import { useState, useEffect } from"react";
import { useParams } from"next/navigation";
import { motion } from"framer-motion";
import {
 Briefcase, DollarSign, TrendingUp, Users, Building2,
 ArrowLeft, ArrowRight, BarChart3,
} from"lucide-react";
import Link from"next/link";
import { apiFetch } from"@/lib/api";

type EmploymentData = {
 school_id: string;
 school_name: string;
 has_data: boolean;
 median_base_salary?: number | string;
 median_signing_bonus?: number | string;
 employment_rate_3mo?: number | string;
 internship_rate?: string;
 top_industries?: { industry: string; percentage: number }[];
 top_employers?: string[];
};

export default function EmploymentPage() {
 const { schoolId } = useParams<{ schoolId: string }>();
 const [data, setData] = useState<EmploymentData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 if (!schoolId) return;
 setError(null);
 apiFetch<EmploymentData>(`/api/schools/${schoolId}/employment`)
 .then(setData)
 .catch(() => { setData(null); setError("Failed to load employment data."); })
 .finally(() => setLoading(false));
 }, [schoolId]);

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-3xl mx-auto">
 <Link href={`/school/${schoolId}`} className="text-white/40 hover:text-white text-sm flex items-center gap-1 mb-4">
 <ArrowLeft size={14} /> Back to {data?.school_name || schoolId}
 </Link>
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Employment Outcomes
 </h1>
 <p className="text-white/70">{data?.school_name || schoolId}</p>
 </div>
 </section>

 <div className="max-w-3xl mx-auto px-6 py-10">
 {error && (
 <div role="alert" className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm mb-4">
 {error}
 </div>
 )}
 {loading && (
 <div className="text-center py-16">
 <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"/>
 </div>
 )}

 {data && !loading && data.has_data && (
 <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
 {/* Key Stats */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
 {[
 { icon: <DollarSign size={20} />, label:"Median Base Salary", value: data.median_base_salary ? `$${Number(data.median_base_salary).toLocaleString()}` :"N/A"},
 { icon: <TrendingUp size={20} />, label:"Signing Bonus", value: data.median_signing_bonus ? `$${Number(data.median_signing_bonus).toLocaleString()}` :"N/A"},
 { icon: <Users size={20} />, label:"Employed in 3 Months", value: data.employment_rate_3mo ? `${data.employment_rate_3mo}%` :"N/A"},
 ].map((stat) => (
 <div key={stat.label} className="editorial-card p-6 text-center">
 <div className="text-primary mb-2 flex justify-center">{stat.icon}</div>
 <p className="text-2xl font-bold text-foreground">{stat.value}</p>
 <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
 </div>
 ))}
 </div>

 {/* Industries */}
 {data.top_industries && data.top_industries.length > 0 && (
 <div className="editorial-card p-6 mb-6">
 <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
 <BarChart3 size={18} className="text-primary"/> Industry Breakdown
 </h3>
 <div className="space-y-3">
 {data.top_industries.map((ind, i) => (
 <div key={ind.industry} className="flex items-center gap-3">
 <span className="text-sm text-foreground w-36 truncate">{ind.industry}</span>
 <div className="flex-1 bg-foreground/5 rounded-full h-3 overflow-hidden">
 <motion.div
 className="h-full bg-primary rounded-full"
 initial={{ width: 0 }}
 animate={{ width: `${ind.percentage}%` }}
 transition={{ duration: 0.5, delay: i * 0.05 }}
 />
 </div>
 <span className="text-xs font-medium text-muted-foreground w-10 text-right">{ind.percentage}%</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Top Employers */}
 {data.top_employers && data.top_employers.length > 0 && (
 <div className="editorial-card p-6">
 <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
 <Building2 size={18} className="text-primary"/> Top Employers
 </h3>
 <div className="flex flex-wrap gap-2">
 {data.top_employers.map((emp) => (
 <span key={emp} className="px-3 py-1.5 bg-foreground/5 text-foreground text-xs rounded-full">
 {emp}
 </span>
 ))}
 </div>
 </div>
 )}

 <div className="mt-8 text-center">
 <Link href={`/school/${schoolId}`} className="text-primary hover:text-primary/80 text-sm flex items-center gap-1 justify-center">
 Full School Profile <ArrowRight size={14} />
 </Link>
 </div>
 </motion.div>
 )}

 {data && !loading && !data.has_data && (
 <div className="text-center py-16 text-muted-foreground">
 <Briefcase size={48} className="mx-auto mb-4 opacity-30"/>
 <p>Employment data not available for this school yet</p>
 </div>
 )}
 </div>
 </main>
 );
}
