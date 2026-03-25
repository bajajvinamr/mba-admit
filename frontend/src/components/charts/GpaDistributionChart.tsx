"use client";

import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 Tooltip,
 Legend,
 ResponsiveContainer,
 CartesianGrid,
} from"recharts";

type GpaBucket = { range: string; admitted: number; denied: number };
type Props = {
 data: Record<string, GpaBucket[]>;
 schoolNames: Record<string, string>;
};

const COLORS = ["#C5A572","#2D2D2D","#6B8E7B","#B85C38"];

export function GpaDistributionChart({ data, schoolNames }: Props) {
 const schoolIds = Object.keys(data);
 const allRanges = Object.values(data)[0]?.map((b) => b.range) || [];

 const merged = allRanges.map((range) => {
 const row: Record<string, string | number> = { range };
 for (const sid of schoolIds) {
 const bucket = data[sid]?.find((b) => b.range === range);
 row[`${sid}_admitted`] = bucket?.admitted || 0;
 row[`${sid}_denied`] = bucket?.denied || 0;
 }
 return row;
 });

 return (
 <div>
 <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
 GPA Distribution - Admits vs Denials
 </h3>
 <ResponsiveContainer width="100%" height={280}>
 <BarChart data={merged} barGap={1} barCategoryGap="15%">
 <CartesianGrid strokeDasharray="3 3"stroke="#e5e5e5"/>
 <XAxis dataKey="range"tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip
 contentStyle={{
 background:"#fff",
 border:"1px solid #e5e5e5",
 fontSize: 12,
 }}
 />
 <Legend wrapperStyle={{ fontSize: 11 }} />
 {schoolIds.map((sid, i) => (
 <Bar
 key={`${sid}_admitted`}
 dataKey={`${sid}_admitted`}
 name={`${schoolNames[sid] || sid} Admit`}
 fill={COLORS[i % COLORS.length]}
 opacity={0.9}
 radius={[2, 2, 0, 0]}
 />
 ))}
 {schoolIds.map((sid, i) => (
 <Bar
 key={`${sid}_denied`}
 dataKey={`${sid}_denied`}
 name={`${schoolNames[sid] || sid} Deny`}
 fill={COLORS[i % COLORS.length]}
 opacity={0.25}
 radius={[2, 2, 0, 0]}
 />
 ))}
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}
