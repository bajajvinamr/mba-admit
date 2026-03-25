"use client";

import { useState } from"react";
import { Sun, Coffee, BookOpen, Users, Briefcase, Moon, Clock } from"lucide-react";
import { ToolCrossLinks } from"@/components/ToolCrossLinks";

type TimeBlock = { time: string; activity: string; detail: string; icon: typeof Sun };

type DaySchedule = {
 school: string;
 type: string;
 description: string;
 schedule: TimeBlock[];
};

const SCHEDULES: DaySchedule[] = [
 {
 school:"Harvard Business School",
 type:"Case Method Day",
 description:"HBS is 100% case method. Your day revolves around preparing, discussing, and debriefing 3 cases.",
 schedule: [
 { time:"6:00 AM", activity:"Wake up & case prep", detail:"Review your cold-call notes for the first case. HBS cold-calls are legendary - you need to be ready.", icon: Coffee },
 { time:"7:30 AM", activity:"Study group meeting", detail:"Meet with your 5-person study group to compare case analyses. 45 minutes, tight agenda.", icon: Users },
 { time:"8:30 AM", activity:"Section class (Case 1)", detail:"First 80-minute case discussion. Your section of 90 students debates the protagonist's decision.", icon: BookOpen },
 { time:"10:15 AM", activity:"Section class (Case 2)", detail:"Second case, different subject. You're expected to contribute in every class.", icon: BookOpen },
 { time:"12:00 PM", activity:"Lunch & networking", detail:"Eat at Spangler. This is prime networking time - sit with someone new.", icon: Coffee },
 { time:"1:00 PM", activity:"Section class (Case 3)", detail:"Afternoon case. Energy dips - this is when cold calls feel most brutal.", icon: BookOpen },
 { time:"2:45 PM", activity:"Club meeting", detail:"Management Consulting Club, Social Enterprise Club, or one of 80+ other clubs.", icon: Users },
 { time:"4:00 PM", activity:"Recruiting event", detail:"Company presentation or coffee chat. Consulting/banking events start in week 2.", icon: Briefcase },
 { time:"6:00 PM", activity:"Gym or section social", detail:"Section Bar Night, Pickup basketball at Shad Hall, or a quiet run along the Charles.", icon: Sun },
 { time:"8:00 PM", activity:"Case prep for tomorrow", detail:"Read and analyze tomorrow's 3 cases. Budget 30-45 minutes per case.", icon: Moon },
 { time:"11:00 PM", activity:"Sleep", detail:"You'll need it. The HBS schedule is relentless - protect your rest.", icon: Moon },
 ],
 },
 {
 school:"Stanford GSB",
 type:"Flexible Curriculum Day",
 description:"Stanford balances structured core with enormous flexibility. Smaller class = more personal attention.",
 schedule: [
 { time:"7:00 AM", activity:"Morning workout", detail:"Run the Dish trail or hit Arrillaga Center. GSB culture values wellness.", icon: Sun },
 { time:"8:30 AM", activity:"Core class", detail:"Organizational Behavior or Managerial Accounting. 65-student section.", icon: BookOpen },
 { time:"10:15 AM", activity:"Elective", detail:"Choose from Stanford's entire university course catalog - CS, Design, Law.", icon: BookOpen },
 { time:"12:00 PM", activity:"Lunch at Arbuckle", detail:"Catered lunch at the Arbuckle Dining Pavilion. The best MBA cafeteria in the world.", icon: Coffee },
 { time:"1:00 PM", activity:"Action Learning", detail:"Work on your Service Learning Project or Global Study Trip planning.", icon: Users },
 { time:"2:30 PM", activity:"GSB Speaker Series", detail:"Tech CEO, social entrepreneur, or VC partner shares their story. Weekly highlight.", icon: Briefcase },
 { time:"4:00 PM", activity:"Project team meeting", detail:"Meet your cross-functional team for your consulting project or startup.", icon: Users },
 { time:"6:00 PM", activity:"LDSSA or Cardinal Ventures", detail:"Leadership development or the student-run startup accelerator.", icon: Briefcase },
 { time:"8:00 PM", activity:"Dinner & socializing", detail:"Palo Alto restaurants or a house party in the MBA housing complex.", icon: Moon },
 { time:"10:00 PM", activity:"Reading & reflection", detail:"GSB heavily emphasizes personal reflection. Journaling is common.", icon: Moon },
 ],
 },
 {
 school:"Wharton",
 type:"Quant-Heavy Day",
 description:"Wharton's first year is more structured with a heavy quantitative foundation. Cohort system creates tight bonds.",
 schedule: [
 { time:"7:00 AM", activity:"Pre-class prep", detail:"Review problem sets for Statistics or Finance. Wharton quant is no joke.", icon: Coffee },
 { time:"8:30 AM", activity:"Core: Statistics", detail:"Professor walks through regression analysis. 70-person cohort.", icon: BookOpen },
 { time:"10:00 AM", activity:"Core: Management", detail:"Case discussion on organizational change. More qualitative than morning class.", icon: BookOpen },
 { time:"11:30 AM", activity:"Wharton Leadership Ventures", detail:"Outdoor leadership expedition planning or adventure challenge.", icon: Users },
 { time:"12:30 PM", activity:"Club recruiting lunch", detail:"Finance Club, Consulting Club, or Health Care Club - free lunch + recruiting intel.", icon: Briefcase },
 { time:"2:00 PM", activity:"Elective: Fintech", detail:"Afternoon elective. Wharton has 200+ electives - more than any other school.", icon: BookOpen },
 { time:"3:30 PM", activity:"Study group", detail:"Work through the Finance problem set together. Learning teams are assigned.", icon: Users },
 { time:"5:00 PM", activity:"Wharton MBA Games practice", detail:"Sports leagues are huge at Wharton. Soccer, basketball, softball.", icon: Sun },
 { time:"7:00 PM", activity:"Cohort dinner", detail:"Your 70-person cohort grabs dinner together at a Rittenhouse restaurant.", icon: Coffee },
 { time:"9:00 PM", activity:"Problem sets", detail:"Finance and Statistics homework. Budget 2-3 hours for quantitative work.", icon: Moon },
 ],
 },
 {
 school:"Chicago Booth",
 type:"Flexible Bidding Day",
 description:"Booth has the most flexible MBA curriculum. No required courses after Q1 - you bid on the classes you want.",
 schedule: [
 { time:"7:30 AM", activity:"Coffee at Harper Center", detail:"The Winter Garden is the social hub. Grab coffee and catch up with classmates.", icon: Coffee },
 { time:"9:00 AM", activity:"Elective: Competitive Strategy", detail:"One of the highest-rated electives. Small class, intense discussion.", icon: BookOpen },
 { time:"10:30 AM", activity:"LEAD workshop", detail:"Booth's leadership development program. Self-assessment and group coaching.", icon: Users },
 { time:"12:00 PM", activity:"Lunch & speaker", detail:"Corporate speaker series. Goldman Sachs, McKinsey, or a Booth alum founder.", icon: Briefcase },
 { time:"1:30 PM", activity:"Elective: Data Analytics", detail:"Booth's quant reputation shines. Machine learning applied to business problems.", icon: BookOpen },
 { time:"3:00 PM", activity:"New Venture Lab", detail:"Work on your startup with NVL mentors. Booth has a strong entrepreneurship culture.", icon: Briefcase },
 { time:"5:00 PM", activity:"Random Walk happy hour", detail:"Booth's iconic weekly social event. Named after the random walk hypothesis.", icon: Coffee },
 { time:"7:00 PM", activity:"Group project work", detail:"Strategy consulting project for a real Chicago company.", icon: Users },
 { time:"9:00 PM", activity:"Independent study", detail:"Reading for tomorrow's classes. Booth's academic rigor is real.", icon: Moon },
 ],
 },
];

export default function DayInLifePage() {
 const [selected, setSelected] = useState(0);

 const schedule = SCHEDULES[selected];

 return (
 <main className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-6">
 <div className="max-w-5xl mx-auto text-center">
 <h1 className="heading-serif text-4xl md:text-5xl mb-4 font-[family-name:var(--font-heading)]">
 Day in the Life
 </h1>
 <p className="text-white/70 text-lg">What a typical day looks like at top MBA programs.</p>
 </div>
 </section>

 <div className="max-w-5xl mx-auto px-6 py-10">
 {/* School selector */}
 <div className="flex flex-wrap gap-2 mb-8">
 {SCHEDULES.map((s, i) => (
 <button key={s.school} onClick={() => setSelected(i)}
 className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${selected === i ?"bg-foreground text-white":"bg-foreground/5 text-muted-foreground hover:bg-foreground/10"}`}>
 {s.school}
 </button>
 ))}
 </div>

 {/* School info */}
 <div className="editorial-card p-5 mb-6">
 <h2 className="font-medium text-foreground text-sm">{schedule.school} - {schedule.type}</h2>
 <p className="text-xs text-muted-foreground mt-1">{schedule.description}</p>
 </div>

 {/* Timeline */}
 <div className="relative">
 <div className="absolute left-6 top-0 bottom-0 w-px bg-foreground/10"/>
 <div className="space-y-1">
 {schedule.schedule.map((block, i) => {
 const Icon = block.icon;
 return (
 <div key={i} className="relative flex items-start gap-4 pl-4">
 <div className="relative z-10 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center shrink-0 mt-3">
 <Icon size={10} className="text-primary"/>
 </div>
 <div className="editorial-card p-4 flex-1 mb-1">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
 <Clock size={9} /> {block.time}
 </span>
 <span className="text-xs font-medium text-foreground">{block.activity}</span>
 </div>
 <p className="text-xs text-muted-foreground">{block.detail}</p>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 <ToolCrossLinks current="/day-in-life"/>
 </div>
 </main>
 );
}
