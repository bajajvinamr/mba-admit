"use client";

import { useState } from"react";
import { Mail, MessageSquare, Send, CheckCircle2 } from"lucide-react";

export default function ContactPage() {
 const [sent, setSent] = useState(false);
 const [form, setForm] = useState({ name:"", email:"", subject:"", message:""});

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 // In production, this would POST to an API
 setSent(true);
 setTimeout(() => setSent(false), 5000);
 setForm({ name:"", email:"", subject:"", message:""});
 };

 return (
 <div className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-8">
 <div className="max-w-3xl mx-auto">
 <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Get in Touch</p>
 <h1 className="heading-serif text-4xl mb-4">Contact Us</h1>
 <p className="text-white/60 text-lg">Questions, feedback, or partnership inquiries? We would love to hear from you.</p>
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 py-16">
 <div className="grid md:grid-cols-2 gap-12">
 <div>
 <h2 className="heading-serif text-xl mb-6">Send a Message</h2>
 {sent && (
 <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 mb-6 flex items-center gap-2 text-sm">
 <CheckCircle2 size={16} /> Message sent! We will get back to you within 24 hours.
 </div>
 )}
 <form onSubmit={handleSubmit} className="space-y-4">
 <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
 placeholder="Your Name" required
 className="w-full border border-border/10 px-4 py-3 text-sm bg-card focus:outline-none focus:border-primary"/>
 <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
 placeholder="Email Address" type="email" required
 className="w-full border border-border/10 px-4 py-3 text-sm bg-card focus:outline-none focus:border-primary"/>
 <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
 className="w-full border border-border/10 px-4 py-3 text-sm bg-card focus:outline-none focus:border-primary">
 <option value="">Select Subject</option>
 <option value="feedback">Product Feedback</option>
 <option value="bug">Report a Bug</option>
 <option value="data">School Data Correction</option>
 <option value="partnership">Partnership Inquiry</option>
 <option value="other">Other</option>
 </select>
 <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
 placeholder="Your message..."rows={5} required
 className="w-full border border-border/10 px-4 py-3 text-sm bg-card focus:outline-none focus:border-primary resize-none"/>
 <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
 <Send size={16} /> Send Message
 </button>
 </form>
 </div>

 <div>
 <h2 className="heading-serif text-xl mb-6">Other Ways to Reach Us</h2>
 <div className="space-y-6">
 <div className="editorial-card p-5">
 <div className="flex items-start gap-3">
 <Mail size={18} className="text-primary mt-0.5"/>
 <div>
 <h3 className="font-bold text-sm">Email</h3>
 <p className="text-xs text-muted-foreground/60 mt-1">
 <a href="mailto:hello@admitcompass.ai" className="text-primary hover:underline">hello@admitcompass.ai</a>
 </p>
 <p className="text-[10px] text-muted-foreground/40 mt-1">We reply within 24 hours</p>
 </div>
 </div>
 </div>
 <div className="editorial-card p-5">
 <div className="flex items-start gap-3">
 <MessageSquare size={18} className="text-primary mt-0.5"/>
 <div>
 <h3 className="font-bold text-sm">School Data Corrections</h3>
 <p className="text-xs text-muted-foreground/60 mt-1">
 Found incorrect information about a school? Use the &quot;School Data Correction&quot; subject above or email{""}
 <a href="mailto:data@admitcompass.ai" className="text-primary hover:underline">data@admitcompass.ai</a>
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>
 </div>
 );
}
