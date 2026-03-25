"use client";

import { useState } from"react";
import { useForm } from"react-hook-form";
import { zodResolver } from"@hookform/resolvers/zod";
import { z } from"zod";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from"@/components/ui/card";
import { Check, Trophy, X, Clock, ChevronDown } from"lucide-react";
import { cn } from"@/lib/cn";

const outcomeSchema = z.object({
 schoolSlug: z.string().min(1,"School is required"),
 round: z.enum(["R1","R2","R3","ED","Rolling"]),
 result: z.enum(["admitted","rejected","waitlisted","withdrew"]),
 gmatScore: z.number().min(400).max(800).nullable(),
 gpa: z.number().min(0).max(4.0).nullable(),
 yearsExp: z.number().min(0).max(30).nullable(),
 industry: z.string().nullable(),
 scholarship: z.boolean(),
 anonymous: z.boolean(),
});

type OutcomeFormData = z.infer<typeof outcomeSchema>;

const RESULT_OPTIONS = [
 { value:"admitted"as const, label:"Admitted", icon: Trophy, color:"text-green-600 bg-green-50 border-green-200"},
 { value:"rejected"as const, label:"Rejected", icon: X, color:"text-red-600 bg-red-50 border-red-200"},
 { value:"waitlisted"as const, label:"Waitlisted", icon: Clock, color:"text-amber-600 bg-amber-50 border-amber-200"},
 { value:"withdrew"as const, label:"Withdrew", icon: ChevronDown, color:"text-muted-foreground bg-muted border-border"},
];

const ROUND_OPTIONS = ["R1","R2","R3","ED","Rolling"] as const;

const INDUSTRIES = [
"Consulting","Finance","Technology","Healthcare","Consumer Goods",
"Energy","Real Estate","Non-Profit","Military","Government",
"Media/Entertainment","Education","Other",
];

interface OutcomeFormProps {
 schoolSlug: string;
 schoolName: string;
 onSubmit: (data: OutcomeFormData) => Promise<void>;
 onCancel: () => void;
}

export function OutcomeForm({ schoolSlug, schoolName, onSubmit, onCancel }: OutcomeFormProps) {
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);

 const {
 register,
 handleSubmit,
 watch,
 setValue,
 formState: { errors },
 } = useForm<OutcomeFormData>({
 resolver: zodResolver(outcomeSchema),
 defaultValues: {
 schoolSlug,
 round:"R1",
 result:"admitted",
 gmatScore: null,
 gpa: null,
 yearsExp: null,
 industry: null,
 scholarship: false,
 anonymous: true,
 },
 });

 const selectedResult = watch("result");
 const selectedRound = watch("round");

 async function handleFormSubmit(data: OutcomeFormData) {
 setIsSubmitting(true);
 try {
 await onSubmit(data);
 setSubmitted(true);
 } finally {
 setIsSubmitting(false);
 }
 }

 if (submitted) {
 return (
 <Card className="border-green-200 bg-green-50/50">
 <CardContent className="flex flex-col items-center gap-4 py-8">
 <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
 <Check className="w-6 h-6 text-green-600"/>
 </div>
 <div className="text-center">
 <h3 className="font-semibold text-lg">Thank you!</h3>
 <p className="text-muted-foreground text-sm mt-1">
 Your outcome helps future applicants make better decisions.
 </p>
 </div>
 </CardContent>
 </Card>
 );
 }

 return (
 <Card>
 <CardHeader>
 <CardTitle className="text-lg">Share your outcome</CardTitle>
 <CardDescription>
 Help future applicants by sharing your {schoolName} decision. All data is anonymous by default.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
 {/* Result */}
 <div className="space-y-2">
 <label className="text-sm font-medium">Decision</label>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {RESULT_OPTIONS.map((opt) => {
 const Icon = opt.icon;
 const isSelected = selectedResult === opt.value;
 return (
 <button
 key={opt.value}
 type="button"
 onClick={() => setValue("result", opt.value)}
 className={cn(
"flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all",
 isSelected ? opt.color :"border-border text-muted-foreground hover:border-primary/30"
 )}
 >
 <Icon className="w-4 h-4"/>
 {opt.label}
 </button>
 );
 })}
 </div>
 </div>

 {/* Round */}
 <div className="space-y-2">
 <label className="text-sm font-medium">Round</label>
 <div className="flex gap-2 flex-wrap">
 {ROUND_OPTIONS.map((round) => (
 <button
 key={round}
 type="button"
 onClick={() => setValue("round", round)}
 className={cn(
"px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
 selectedRound === round
 ?"bg-primary text-primary-foreground border-primary"
 :"border-border text-muted-foreground hover:border-primary/30"
 )}
 >
 {round}
 </button>
 ))}
 </div>
 </div>

 {/* Stats grid */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div className="space-y-1.5">
 <label className="text-sm font-medium">GMAT/GRE Score</label>
 <Input
 type="number"
 placeholder="730"
 {...register("gmatScore", { valueAsNumber: true })}
 />
 {errors.gmatScore && (
 <p className="text-xs text-destructive">{errors.gmatScore.message}</p>
 )}
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium">GPA</label>
 <Input
 type="number"
 step="0.01"
 placeholder="3.60"
 {...register("gpa", { valueAsNumber: true })}
 />
 </div>
 <div className="space-y-1.5">
 <label className="text-sm font-medium">Years of Experience</label>
 <Input
 type="number"
 placeholder="5"
 {...register("yearsExp", { valueAsNumber: true })}
 />
 </div>
 </div>

 {/* Industry */}
 <div className="space-y-1.5">
 <label className="text-sm font-medium">Industry</label>
 <select
 {...register("industry")}
 className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
 >
 <option value="">Select industry (optional)</option>
 {INDUSTRIES.map((ind) => (
 <option key={ind} value={ind}>{ind}</option>
 ))}
 </select>
 </div>

 {/* Checkboxes */}
 <div className="flex flex-col gap-3">
 <label className="flex items-center gap-2 text-sm">
 <input type="checkbox"{...register("scholarship")} className="rounded"/>
 <span>Received scholarship/fellowship</span>
 </label>
 <label className="flex items-center gap-2 text-sm">
 <input type="checkbox"{...register("anonymous")} className="rounded"/>
 <span>Keep my submission anonymous</span>
 </label>
 </div>

 {/* Actions */}
 <div className="flex gap-3 justify-end">
 <Button type="button"variant="ghost" onClick={onCancel}>
 Cancel
 </Button>
 <Button type="submit" disabled={isSubmitting}>
 {isSubmitting ?"Submitting...":"Share Outcome"}
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>
 );
}
