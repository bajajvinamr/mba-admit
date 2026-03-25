"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  Globe,
  Clock,
  MessageSquare,
  Users,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────────────────── */

type MentorProfile = {
  id: string;
  displayName: string;
  school: string;
  schoolName: string;
  graduationYear: number | null;
  status: string;
  currentRole: string | null;
  currentCompany: string | null;
  industry: string;
  expertise: string[];
  bio: string;
  hourlyRate: number;
  currency: string;
  availability: string;
  languages: string[];
  rating: number;
  reviewCount: number;
  sessionsCompleted: number;
  verified: boolean;
  profileImage: string | null;
  linkedinUrl: string | null;
  createdAt: string;
};

/* ── Helpers ───────────────────────────────────────────────────────── */

const AVAILABILITY_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: "Available", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  limited: { label: "Limited Availability", color: "bg-amber-50 text-amber-700 border-amber-200" },
  unavailable: { label: "Not Available", color: "bg-red-50 text-red-700 border-red-200" },
};

function ExpertiseChip({ label }: { label: string }) {
  const display = label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className="inline-block text-sm font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      {display}
    </span>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-foreground/[0.02] border border-border/60">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function MentorProfilePage() {
  const params = useParams();
  const mentorId = params.id as string;

  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mentorId) return;
    track("mentor_profile_view", { mentor_id: mentorId });

    apiFetch<MentorProfile>(`/api/mentors/${mentorId}`)
      .then(setMentor)
      .catch(() => setError("Mentor not found"))
      .finally(() => setLoading(false));
  }, [mentorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-foreground/10 rounded w-1/3" />
            <div className="h-40 bg-foreground/5 rounded-xl" />
            <div className="h-20 bg-foreground/5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Mentor Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This mentor profile does not exist or has been removed.
          </p>
          <Link
            href="/mentors"
            className="text-amber-600 hover:text-amber-700 font-medium text-sm"
          >
            Browse all mentors
          </Link>
        </div>
      </div>
    );
  }

  const avail = AVAILABILITY_CONFIG[mentor.availability] || AVAILABILITY_CONFIG.available;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/mentors"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          All Mentors
        </Link>

        {/* Hero card */}
        <div className="border border-border rounded-xl bg-white p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar placeholder */}
            <div className="w-20 h-20 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-amber-600">
                {mentor.displayName
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {mentor.displayName}
                </h1>
                {mentor.verified && (
                  <CheckCircle2 size={18} className="text-blue-500" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={15} />
                  {mentor.schoolName}
                  {mentor.graduationYear
                    ? ` '${String(mentor.graduationYear).slice(-2)}`
                    : ""}
                </span>
                <span className="text-border">|</span>
                <span className="capitalize">{mentor.status}</span>
                {mentor.currentRole && (
                  <>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={14} />
                      {mentor.currentRole}
                      {mentor.currentCompany ? ` @ ${mentor.currentCompany}` : ""}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                    avail.color
                  )}
                >
                  {avail.label}
                </span>
                {mentor.languages.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground px-2.5 py-0.5 rounded-full bg-foreground/5 border border-border/40">
                    <Globe size={12} />
                    {mentor.languages.join(", ")}
                  </span>
                )}
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={cn(
                      i < Math.round(mentor.rating)
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-border"
                    )}
                  />
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {mentor.rating.toFixed(1)} ({mentor.reviewCount} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio */}
            <div className="border border-border rounded-xl bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                About
              </h2>
              <p className="text-foreground leading-relaxed whitespace-pre-line">
                {mentor.bio}
              </p>
            </div>

            {/* Expertise */}
            <div className="border border-border rounded-xl bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Expertise
              </h2>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((e) => (
                  <ExpertiseChip key={e} label={e} />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<Star size={18} />}
                value={mentor.rating.toFixed(1)}
                label="Rating"
              />
              <StatCard
                icon={<MessageSquare size={18} />}
                value={mentor.sessionsCompleted}
                label="Sessions"
              />
              <StatCard
                icon={<Users size={18} />}
                value={mentor.reviewCount}
                label="Reviews"
              />
            </div>
          </div>

          {/* Sidebar — booking card */}
          <div className="space-y-4">
            <div className="border border-border rounded-xl bg-white p-6 sticky top-24">
              <div className="text-center mb-5">
                <div className="text-3xl font-bold text-foreground mb-1">
                  ${mentor.hourlyRate}
                  <span className="text-sm font-normal text-muted-foreground">
                    /hr
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{mentor.currency}</p>
              </div>

              <button
                onClick={() => {
                  track("mentor_book_session", {
                    mentor_id: mentor.id,
                    school: mentor.school,
                    rate: mentor.hourlyRate,
                  });
                }}
                className="w-full py-3 text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors mb-3"
              >
                Book a Session
              </button>

              <p className="text-xs text-center text-muted-foreground">
                1-on-1 video call. Cancel or reschedule up to 24h before.
              </p>

              {mentor.linkedinUrl && (
                <a
                  href={mentor.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <ExternalLink size={14} />
                  View LinkedIn
                </a>
              )}
            </div>

            <div className="border border-border rounded-xl bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Industry
              </h3>
              <p className="text-sm text-foreground capitalize">
                {mentor.industry.replace(/_/g, " ")}
              </p>
            </div>

            <div className="border border-border rounded-xl bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Member Since
              </h3>
              <p className="text-sm text-foreground">
                {new Date(mentor.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Back to directory */}
        <div className="mt-8 text-center">
          <Link
            href="/mentors"
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            Browse all mentors
          </Link>
        </div>
      </div>
    </div>
  );
}
