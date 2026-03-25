"use client";

import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 Tooltip,
 ResponsiveContainer,
 CartesianGrid,
 Legend,
} from"recharts";

type IndustryEntry = { industry: string; count: number; pct: number };
type Props = {
 data: Record<string, IndustryEntry[]>;
 schoolNames: Record<string, string>;
};

const COLORS = ["#C5A572","#2D2D2D","#6B8E7B","#B85C38"];

export function IndustryChart({ data, schoolNames }: Props) {
 const schoolIds = Object.keys(data);

 // Collect all unique industries across schools, take top 6
 const industryCounts = new Map<string, number>();
 for (const entries of Object.values(data)) {
 entries.forEach((e) => {
 industryCounts.set(e.industry, (industryCounts.get(e.industry) || 0) + e.count);
 });
 }
 const topIndustries = [...industryCounts.entries()]
 .sort((a, b) => b[1] - a[1])
 .slice(0, 6)
 .map(([ind]) => ind);

 const merged = topIndustries.map((industry) => {
 const row: Record<string, string | number> = { industry };
 for (const sid of schoolIds) {
 const entry = data[sid]?.find((e) => e.industry === industry);
 row[sid] = entry?.pct || 0;
 }
 return row;
 });

 return (
 <div>
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
 Top Industries - Admitted Applicants
 </h3>
 <ResponsiveContainer width="100%" height={280}>
 <BarChart data={merged} layout="vertical"barCategoryGap="20%">
 <CartesianGrid strokeDasharray="3 3"stroke="#e5e5e5"/>
 <XAxis type="number"tick={{ fontSize: 11 }} unit="%"/>
 <YAxis
 dataKey="industry"
 type="category"
 width={90}
 tick={{ fontSize: 10 }}
 />
 <Tooltip
 contentStyle={{
 background:"#fff",
 border:"1px solid #e5e5e5",
 fontSize: 12,
 }}
 formatter={(value) => `${value}%`}
 />
 <Legend wrapperStyle={{ fontSize: 11 }} />
 {schoolIds.map((sid, i) => (
 <Bar
 key={sid}
 dataKey={sid}
 name={schoolNames[sid] || sid}
 fill={COLORS[i % COLORS.length]}
 radius={[0, 2, 2, 0]}
 />
 ))}
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}
