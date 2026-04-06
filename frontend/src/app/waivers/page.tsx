"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, GraduationCap, Mail, CheckCircle2, Copy,
  Shield, BookOpen, ArrowRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { ToolCrossLinks } from "@/components/ToolCrossLinks";

// ── Types ───────────────────────────────────────────────────────────────────

interface FeeWaiver {
  school_id: string;
  school_name: string;
  waivers: string[];
  consortium: boolean;
  auto_waiver: boolean;
  qualifies_military: boolean;
  qualifies_consortium: boolean;
}

interface TestWaiver {
  school_id: string;
  school_name: string;
  test_optional: boolean;
  waiver_available: boolean;
  notes: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
  tips: string[];
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function WaiversPage() {
  const [tab, setTab] = useState<"fee" | "test">("fee");
  const [feeWaivers, setFeeWaivers] = useState<FeeWaiver[]>([]);
  const [testWaivers, setTestWaivers] = useState<TestWaiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate | null>(null);
  const [emailSchool, setEmailSchool] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailReason, setEmailReason] = useState("financial_hardship");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [feeRes, testRes] = await Promise.all([
          apiFetch<{ waivers: FeeWaiver[] }>("/api/fee-waivers"),
          apiFetch<{ schools: TestWaiver[] }>("/api/test-waivers"),
        ]);
        setFeeWaivers(feeRes.waivers);
        setTestWaivers(testRes.schools);
      } catch (e) {
        console.error("Failed to load waiver data:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const generateEmail = async () => {
    if (!emailSchool || !emailName) return;
    try {
      const res = await apiFetch<EmailTemplate>("/api/waiver-email-template", {
        method: "POST",
        body: JSON.stringify({
          school_id: emailSchool,
          waiver_type: tab,
          applicant_name: emailName,
          reason: emailReason,
        }),
      });
      setEmailTemplate(res);
    } catch {}
  };

  const copyEmail = () => {
    if (!emailTemplate) return;
    navigator.clipboard.writeText(`Subject: ${emailTemplate.subject}\n\n${emailTemplate.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Fee & Test Waivers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Save money on application fees and GMAT/GRE requirements. Find which schools
            offer waivers and generate professional request emails.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Tab toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("fee")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "fee" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <DollarSign size={14} /> Application Fee Waivers
          </button>
          <button
            onClick={() => setTab("test")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              tab === "test" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen size={14} /> GMAT/GRE Waivers
          </button>
        </div>

        {/* Fee Waivers Table */}
        {tab === "fee" && (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">School</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Waiver Options</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Consortium</th>
                  </tr>
                </thead>
                <tbody>
                  {feeWaivers.map((w) => (
                    <tr key={w.school_id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">{w.school_name}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {w.waivers.map((waiver, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                              {waiver}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {w.consortium ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Yes</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test Waivers Table */}
        {tab === "test" && (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">School</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Waiver Available</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {testWaivers.map((w) => (
                    <tr key={w.school_id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">{w.school_name}</td>
                      <td className="px-4 py-3 text-center">
                        {w.waiver_available ? (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Available</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Not Available</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">{w.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Email Template Generator */}
        <div className="bg-card border border-border/60 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail size={14} /> Generate Waiver Request Email
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">School</label>
              <select
                value={emailSchool}
                onChange={(e) => setEmailSchool(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
              >
                <option value="">Select school...</option>
                {(tab === "fee" ? feeWaivers : testWaivers).map((w) => (
                  <option key={w.school_id} value={w.school_id}>{w.school_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Your Name</label>
              <input
                type="text"
                placeholder="Full name"
                value={emailName}
                onChange={(e) => setEmailName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Reason</label>
              <select
                value={emailReason}
                onChange={(e) => setEmailReason(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md"
              >
                <option value="financial_hardship">Financial hardship</option>
                <option value="military">Military service</option>
                <option value="conference">Conference/event attendance</option>
                <option value="campus_visit">Campus visit</option>
                {tab === "test" && <option value="professional_credentials">Professional credentials (CFA/CPA/etc.)</option>}
              </select>
            </div>
          </div>

          <button
            onClick={generateEmail}
            disabled={!emailSchool || !emailName}
            className="bg-foreground text-background font-medium px-6 py-2.5 rounded-lg text-sm hover:bg-foreground/90 disabled:opacity-50 transition-colors"
          >
            Generate Email Template
          </button>

          {emailTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
            >
              <div className="bg-muted/30 border border-border/40 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">Subject:</span>
                  <button
                    onClick={copyEmail}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy all"}
                  </button>
                </div>
                <p className="text-sm font-medium text-foreground mb-3">{emailTemplate.subject}</p>
                <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {emailTemplate.body}
                </pre>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Tips:</p>
                {emailTemplate.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <Shield size={10} className="text-primary mt-0.5 shrink-0" /> {tip}
                  </p>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <ToolCrossLinks current="/waivers" />
      </div>
    </div>
  );
}
