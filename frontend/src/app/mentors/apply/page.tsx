"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GraduationCap,
  Briefcase,
  DollarSign,
  Linkedin,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/* ── Constants ─────────────────────────────────────────────────────── */

const SCHOOLS = [
  { slug: "hbs", name: "Harvard Business School" },
  { slug: "gsb", name: "Stanford GSB" },
  { slug: "wharton", name: "Wharton School" },
  { slug: "booth", name: "Chicago Booth" },
  { slug: "kellogg", name: "Kellogg School of Management" },
  { slug: "columbia", name: "Columbia Business School" },
  { slug: "sloan", name: "MIT Sloan" },
  { slug: "tuck", name: "Tuck School of Business" },
  { slug: "ross", name: "Michigan Ross" },
  { slug: "stern", name: "NYU Stern" },
  { slug: "lbs", name: "London Business School" },
  { slug: "insead", name: "INSEAD" },
  { slug: "haas", name: "UC Berkeley Haas" },
  { slug: "fuqua", name: "Duke Fuqua" },
  { slug: "darden", name: "UVA Darden" },
  { slug: "yale", name: "Yale SOM" },
  { slug: "anderson", name: "UCLA Anderson" },
  { slug: "tepper", name: "Carnegie Mellon Tepper" },
  { slug: "johnson", name: "Cornell Johnson" },
  { slug: "iese", name: "IESE Business School" },
  { slug: "hec", name: "HEC Paris" },
];

const INDUSTRIES = [
  "consulting",
  "technology",
  "finance",
  "healthcare",
  "nonprofit",
  "entrepreneurship",
  "consumer_goods",
  "energy",
  "real_estate",
  "media",
  "government",
  "other",
];

const EXPERTISE_OPTIONS = [
  { value: "essays", label: "Essay Review" },
  { value: "interview_prep", label: "Interview Prep" },
  { value: "career_strategy", label: "Career Strategy" },
  { value: "school_selection", label: "School Selection" },
];

const BIO_MAX = 2000;
const BIO_MIN = 50;

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MentorApplyPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    school: "",
    graduationYear: "",
    status: "student" as "student" | "alumni",
    displayName: "",
    currentRole: "",
    currentCompany: "",
    industry: "",
    expertise: [] as string[],
    hourlyRate: "",
    bio: "",
    linkedinUrl: "",
    languages: "English",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedSchool = SCHOOLS.find((s) => s.slug === form.school);
  const bioLength = form.bio.length;

  function toggleExpertise(value: string) {
    setForm((prev) => ({
      ...prev,
      expertise: prev.expertise.includes(value)
        ? prev.expertise.filter((e) => e !== value)
        : [...prev.expertise, value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate
    if (!form.displayName.trim()) { setError("Name is required."); return; }
    if (!form.school) { setError("Please select your school."); return; }
    if (!form.industry) { setError("Please select your industry."); return; }
    if (form.expertise.length === 0) { setError("Select at least one area of expertise."); return; }
    if (bioLength < BIO_MIN) { setError(`Bio must be at least ${BIO_MIN} characters.`); return; }
    if (!form.hourlyRate || Number(form.hourlyRate) < 0) { setError("Please set an hourly rate."); return; }

    setSubmitting(true);
    try {
      const payload = {
        displayName: form.displayName.trim(),
        school: form.school,
        schoolName: selectedSchool?.name || form.school,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
        status: form.status,
        currentRole: form.currentRole.trim() || null,
        currentCompany: form.currentCompany.trim() || null,
        industry: form.industry,
        expertise: form.expertise,
        hourlyRate: Number(form.hourlyRate),
        bio: form.bio.trim(),
        linkedinUrl: form.linkedinUrl.trim() || null,
        languages: form.languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean),
      };

      await apiFetch("/api/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      track("mentor_application_submitted", {
        school: form.school,
        expertise: form.expertise.join(","),
      });

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Application Submitted
          </h1>
          <p className="text-muted-foreground mb-6">
            Your mentor profile has been created. You will appear in the
            directory once your profile is reviewed and verified.
          </p>
          <Link
            href="/mentors"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          >
            Browse Mentors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/mentors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Mentors
        </Link>

        <div className="border border-border rounded-xl bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <GraduationCap size={20} className="text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Become a Mentor
            </h1>
          </div>
          <p className="text-muted-foreground mb-8">
            Share your MBA experience and earn money helping the next
            generation of applicants.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Display Name *
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                placeholder="Your full name"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                maxLength={200}
              />
            </div>

            {/* School + Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  School *
                </label>
                <select
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="">Select school</option>
                  {SCHOOLS.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Graduation Year
                </label>
                <input
                  type="number"
                  value={form.graduationYear}
                  onChange={(e) => setForm({ ...form, graduationYear: e.target.value })}
                  placeholder="2025"
                  min={2015}
                  max={2030}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Status *
              </label>
              <div className="flex gap-3">
                {(["student", "alumni"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={cn(
                      "flex-1 px-4 py-2.5 text-sm font-medium border rounded-lg transition-colors capitalize",
                      form.status === s
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-white border-border text-muted-foreground hover:bg-foreground/5"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Role + Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Current Role
                </label>
                <input
                  type="text"
                  value={form.currentRole}
                  onChange={(e) => setForm({ ...form, currentRole: e.target.value })}
                  placeholder="e.g., Product Manager"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Company
                </label>
                <input
                  type="text"
                  value={form.currentCompany}
                  onChange={(e) => setForm({ ...form, currentCompany: e.target.value })}
                  placeholder="e.g., Google"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Industry *
              </label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Expertise multi-select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Areas of Expertise *
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleExpertise(o.value)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium border rounded-full transition-colors",
                      form.expertise.includes(o.value)
                        ? "bg-amber-50 border-amber-300 text-amber-700"
                        : "bg-white border-border text-muted-foreground hover:bg-foreground/5"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hourly rate */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Hourly Rate (USD) *
              </label>
              <div className="relative">
                <DollarSign
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="number"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  placeholder="100"
                  min={0}
                  max={1000}
                  className="w-full pl-9 pr-16 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  per hour
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Typical range: $50-$250/hr. Students often charge $50-$100.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Bio *
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell prospective applicants about yourself, your MBA journey, and how you can help them. Be specific and authentic — this is your pitch."
                rows={6}
                maxLength={BIO_MAX}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
              />
              <div className="flex justify-between mt-1">
                <p
                  className={cn(
                    "text-xs",
                    bioLength < BIO_MIN
                      ? "text-amber-600"
                      : "text-muted-foreground"
                  )}
                >
                  {bioLength < BIO_MIN
                    ? `${BIO_MIN - bioLength} more characters needed`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bioLength}/{BIO_MAX}
                </p>
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Languages
              </label>
              <input
                type="text"
                value={form.languages}
                onChange={(e) => setForm({ ...form, languages: e.target.value })}
                placeholder="English, Spanish, Mandarin"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list of languages you can mentor in.
              </p>
            </div>

            {/* LinkedIn */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                LinkedIn URL
              </label>
              <div className="relative">
                <Linkedin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "w-full py-3 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2",
                submitting
                  ? "bg-amber-400 text-white cursor-not-allowed"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
