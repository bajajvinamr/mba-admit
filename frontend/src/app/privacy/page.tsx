import type { Metadata } from"next";

export const metadata: Metadata = {
 title:"Privacy Policy | Admit Compass",
 description:"How Admit Compass collects, uses, and protects your data.",
};

export default function PrivacyPage() {
 return (
 <div className="min-h-screen bg-background">
 <section className="bg-foreground text-white py-16 px-8">
 <div className="max-w-3xl mx-auto">
 <p className="text-xs uppercase tracking-[0.2em] text-primary mb-4">Legal</p>
 <h1 className="heading-serif text-4xl mb-4">Privacy Policy</h1>
 <p className="text-white/50 text-sm">Last updated: March 2026</p>
 </div>
 </section>

 <section className="max-w-3xl mx-auto px-8 py-16 prose prose-sm prose-jet">
 <div className="space-y-8 text-sm text-muted-foreground/70 leading-relaxed">
 <div>
 <h2 className="heading-serif text-xl text-foreground mb-3">1. Information We Collect</h2>
 <p>We collect information you provide directly: your profile data (GMAT score, GPA, work experience), essay content submitted for evaluation, and account information (email, name) if you create an account.</p>
 <p className="mt-2">We automatically collect: page views, feature usage analytics, browser type, and approximate location (country level only). We use cookies for session management and preference storage.</p>
 </div>

 <div>
 <h2 className="heading-serif text-xl text-foreground mb-3">2. How We Use Your Data</h2>
 <ul className="list-disc pl-5 space-y-1">
 <li>To provide personalized school recommendations and odds calculations</li>
 <li>To improve our AI models and recommendation algorithms</li>
 <li>To send you deadline reminders and product updates (with your consent)</li>
 <li>To aggregate anonymous statistics for community decision data</li>
 </ul>
 </div>

 <div>
 <h2 className="heading-serif text-xl text-foreground mb-3">3. Data Sharing</h2>
 <p>We do not sell your personal data. We share data only with:</p>
 <ul className="list-disc pl-5 space-y-1 mt-2">
 <li>AI providers (Anthropic Claude) for essay evaluation - essay text only, no personal identifiers</li>
 <li>Payment processors (Stripe) for transaction processing</li>
 <li>Analytics services for aggregate usage metrics</li>
 </ul>
 </div>

 <div>
 <h2 className="heading-serif text-xl text-foreground mb-3">4. Data Storage & Security</h2>
 <p>Your data is stored securely using industry-standard encryption. Profile data is stored locally in your browser (localStorage) unless you create an account. We do not store essay content after evaluation unless you explicitly save it.</p>
 </div>

 <div>
 <h2 className="heading-serif text-xl text-foreground mb-3">5. Your Rights</h2>
 <p>You can request deletion of your account and all associated data at any time by contacting us. You can clear your local profile data by clearing your browser storage.</p>
 </div>

 <div>
 <h2 className="heading-serif text-xl text-foreground mb-3">6. Contact</h2>
 <p>For privacy questions: <a href="mailto:privacy@admitcompass.ai" className="text-primary hover:underline">privacy@admitcompass.ai</a></p>
 </div>
 </div>
 </section>
 </div>
 );
}
