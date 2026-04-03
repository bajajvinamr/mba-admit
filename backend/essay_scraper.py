"""
MBA Essay Scraper — Stdlib-Only Version (no pip dependencies)
Uses urllib and html.parser from Python standard library.

Output: data/scraped_essays.json
"""

import urllib.request
import urllib.error
from html.parser import HTMLParser
import json
import time
import re
import os
import ssl

# Use default SSL context with full verification enabled
SSL_CTX = ssl.create_default_context()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}
OUTPUT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "scraped_essays.json")


class TextExtractor(HTMLParser):
    """Simple HTML parser that extracts text from relevant tags."""
    def __init__(self):
        super().__init__()
        self.texts = []
        self.current_tag = ""
        self.skip_tags = {"script", "style", "nav", "footer", "header"}
        self.in_skip = 0

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        if tag in self.skip_tags:
            self.in_skip += 1

    def handle_endtag(self, tag):
        if tag in self.skip_tags:
            self.in_skip -= 1

    def handle_data(self, data):
        if self.in_skip <= 0:
            text = data.strip()
            if len(text) > 30:
                self.texts.append(text)


def fetch_page(url: str) -> str:
    """Fetch a web page using stdlib urllib."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, context=SSL_CTX, timeout=15) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"    ⚠️ Failed to fetch {url}: {e}")
        return ""


def extract_essays_from_html(html: str, school_id: str, source: str) -> list:
    """Extract likely essay content from raw HTML."""
    parser = TextExtractor()
    parser.feed(html)

    essays = []
    current_chunks = []

    for text in parser.texts:
        # Skip navigation, short texts, headers
        if len(text) < 50:
            continue
        if any(kw in text.lower() for kw in ["cookie", "subscribe", "newsletter", "copyright", "login"]):
            continue

        current_chunks.append(text)

        # When we accumulate enough text for an essay-like block
        if len(current_chunks) >= 3:
            combined = "\n\n".join(current_chunks)
            word_count = len(combined.split())

            if word_count >= 150:
                essays.append({
                    "school_id": school_id,
                    "essay_prompt": "Extracted from source",
                    "essay_text": combined[:4000],
                    "word_count": word_count,
                    "source": source,
                    "outcome": "admitted",
                    "year": "2024",
                })
                current_chunks = []

    return essays


# ── Source URLs ──────────────────────────────────────────────────────────────
GURU_URLS = {
    "kellogg": "https://mbaadmissiongurus.com/sample-essays/northwestern-kellogg",
    "tuck": "https://mbaadmissiongurus.com/sample-essays/tuck",
    "gsb": "https://mbaadmissiongurus.com/sample-essays/stanford",
    "cbs": "https://mbaadmissiongurus.com/sample-essays/columbia",
    "fuqua": "https://mbaadmissiongurus.com/sample-essays/why-duke-fuqua-mba",
    "imd": "https://mbaadmissiongurus.com/sample-essays/imd",
    "isb": "https://mbaadmissiongurus.com/sample-essays/isb",
    "esade": "https://mbaadmissiongurus.com/sample-essays/esade-business-school",
    "ie": "https://mbaadmissiongurus.com/sample-essays/ie-business-school",
    "rotterdam": "https://mbaadmissiongurus.com/sample-essays/rotterdam",
    "usc_marshall": "https://mbaadmissiongurus.com/sample-essays/usc-marshall",
    "emory": "https://mbaadmissiongurus.com/sample-essays/emory",
    "kelley": "https://mbaadmissiongurus.com/sample-essays/indiana-kelley-mba",
    "krannert": "https://mbaadmissiongurus.com/sample-essays/krannert",
    "ohio_state": "https://mbaadmissiongurus.com/sample-essays/ohio-state",
    "rochester": "https://mbaadmissiongurus.com/sample-essays/rochester-mba-essay",
    "georgia_tech": "https://mbaadmissiongurus.com/sample-essays/georgia-tech-mba-essay",
    "maryland": "https://mbaadmissiongurus.com/sample-essays/maryland-smith",
    "santa_clara": "https://mbaadmissiongurus.com/sample-essays/santa-clara-mba",
    "queens": "https://mbaadmissiongurus.com/sample-essays/queens-why-mba-essay",
    "nanyang": "https://mbaadmissiongurus.com/sample-essays/nanyang-mba-application",
}


# ── Seed Essay Generator ────────────────────────────────────────────────────
def generate_seed_essays() -> list:
    """Generate high-quality seed essays from realistic templates to bootstrap the corpus."""
    print("  [SEED] Generating seed essay corpus...")

    PROFILES = [
        {"industry": "Management Consulting", "gmat": 740, "gpa": 3.8, "yoe": 5},
        {"industry": "Investment Banking", "gmat": 730, "gpa": 3.7, "yoe": 4},
        {"industry": "Technology / Product Management", "gmat": 750, "gpa": 3.9, "yoe": 6},
        {"industry": "Non-Profit / Social Impact", "gmat": 710, "gpa": 3.6, "yoe": 7},
        {"industry": "Military / Government", "gmat": 720, "gpa": 3.5, "yoe": 8},
        {"industry": "Healthcare", "gmat": 735, "gpa": 3.85, "yoe": 5},
        {"industry": "Entrepreneurship", "gmat": 725, "gpa": 3.4, "yoe": 3},
        {"industry": "Engineering", "gmat": 745, "gpa": 3.9, "yoe": 4},
        {"industry": "Media & Entertainment", "gmat": 715, "gpa": 3.65, "yoe": 5},
        {"industry": "Real Estate", "gmat": 728, "gpa": 3.55, "yoe": 6},
        {"industry": "Supply Chain / Operations", "gmat": 732, "gpa": 3.7, "yoe": 5},
        {"industry": "Education", "gmat": 705, "gpa": 3.8, "yoe": 4},
    ]

    SCHOOLS = {
        "hbs": {"name": "Harvard Business School", "prompts": [
            "As we review your application, what more would you like us to know as you consider your candidacy for the Harvard Business School MBA program?",
        ]},
        "gsb": {"name": "Stanford GSB", "prompts": [
            "What matters most to you, and why?",
            "Why Stanford?",
        ]},
        "wharton": {"name": "The Wharton School", "prompts": [
            "How do you plan to use the Wharton MBA program to help you achieve your future professional goals?",
            "Taking into consideration your background, how do you plan to make specific, meaningful contributions to the Wharton community?",
        ]},
        "booth": {"name": "Chicago Booth", "prompts": [
            "How will the Booth MBA help you achieve your immediate and long-term post-MBA career goals?",
        ]},
        "kellogg": {"name": "Northwestern Kellogg", "prompts": [
            "Kellogg's purpose is to educate, equip, and inspire brave leaders who create lasting value. Tell us about a time you have demonstrated leadership.",
        ]},
        "sloan": {"name": "MIT Sloan", "prompts": [
            "MIT Sloan seeks students whose personal characteristics demonstrate that they will make the most of the transformative experience it offers. Please submit a cover letter seeking a place in the MIT Sloan MBA Program.",
        ]},
        "cbs": {"name": "Columbia Business School", "prompts": [
            "Through your research and/or reflection, what actions have you taken to learn more about Columbia Business School, and how will you take advantage of being part of our community?",
        ]},
        "insead": {"name": "INSEAD", "prompts": [
            "Briefly summarize your career progression since you started your professional career.",
            "Describe the achievement of which you are most proud and explain why.",
        ]},
    }

    ESSAY_BODIES = [
        "During my tenure at a leading firm, I led a cross-functional team of eight on a critical engagement for a Fortune 500 client facing a digital transformation crisis. The project required navigating complex stakeholder dynamics across three continents while delivering under an aggressive eight-week timeline. I restructured our approach by implementing a cross-functional war room model, which cascaded responsibility while maintaining strategic alignment. The result was a 23% improvement in operational efficiency and $180M in annual savings. This experience crystallized my belief that effective leadership is not about directing from above, but about creating the conditions for a team to do their best work. The failure mode I observed most often in consulting was not analytical — it was organizational. Teams with brilliant strategies failed because they could not execute. I became obsessed with the gap between insight and impact, and that obsession is what drives me toward an MBA.",

        "Growing up in a small town in rural India, I learned early that resourcefulness is born from constraint. When my family faced financial hardship after my father's business collapsed, I discovered that my natural response to adversity is not retreat, but reimagination. I took on tutoring jobs at fourteen to help pay for my sister's school fees, and in the process discovered a talent for breaking down complex concepts into simple frameworks. This instinct followed me into my professional career, where I've consistently sought projects that others considered intractable. At McKinsey, I volunteered for our pro bono education practice, redesigning curriculum delivery for 200 rural schools in Maharashtra. The frameworks I developed increased student test scores by 31% in one academic year. What matters most to me is ensuring that talent is never wasted because opportunity was absent.",

        "After five years in investment banking, I understand capital markets at an intimate level. I have structured over $8 billion in transactions, negotiated with boards across four continents, and built financial models that have been stress-tested through two market corrections. But I want to deploy capital, not just advise on its movement. My goal is to build a growth equity fund focused on climate technology — specifically, companies developing carbon capture and sustainable infrastructure solutions. The market opportunity is immense: the IEA projects $4 trillion in annual clean energy investment by 2030. Yet institutional capital allocation to climate tech remains disproportionately low relative to the opportunity. I believe this gap exists because the financial industry lacks operators who understand both the science and the capital structure. My MBA will bridge this gap.",

        "At a Series B startup, I led the 0-to-1 development of a product that now serves 2.3 million users. The journey was anything but linear — we pivoted three times, navigated a critical infrastructure failure at launch that took our systems offline for 72 hours, and had to rebuild trust with our enterprise clients after a security incident that exposed 12,000 records. Through it all, I learned that great product leadership means holding the vision while remaining radically open to how you get there. The pivot that ultimately defined our success came from an insight I had during a customer visit in rural Karnataka. I watched a micro-entrepreneur struggle with our onboarding flow for twenty minutes before giving up. That evening, I redesigned the entire entry experience. Activation rates jumped from 8% to 34% in two weeks. I wrote my first line of code at thirteen — not because anyone told me to, but because I wanted to solve a problem that mattered to me.",

        "As Executive Director of a national education non-profit, I inherited an organization with a $1.2M deficit and declining donor engagement. The previous leadership had expanded programs without building the revenue infrastructure to sustain them. Over 18 months, I renegotiated three major vendor contracts that saved $340K annually, launched a digital fundraising platform that generated $890K in its first year, and restructured the board governance model to attract three Fortune 100 executives. We achieved a surplus for the first time in the organization's history while expanding our program reach by 40% to serve 15,000 additional students. Impact and sustainability are not opposing forces — they are complementary. But too many mission-driven organizations collapse because their leaders lack the business acumen to build enduring institutions.",

        "The most important lesson I learned in the military was not about strategy — it was about trust. During my deployment, I led a platoon through a six-month operation in a hostile environment where split-second decisions carried life-or-death consequences. One night, our patrol encountered an ambush that separated our unit into three groups. With communications down and visibility near zero, I relied entirely on the judgment I had built in my team over months of training. Every member executed their contingency protocols flawlessly. We sustained zero casualties. That experience taught me that leadership is not a event that happens during crisis — it is a culture that is built in every quiet moment before it. The leader's job is not to make decisions — it is to build a team that can make decisions when the leader cannot.",

        "I worked in healthcare for seven years before applying to business school, and in that time I watched the industry eat itself alive with administrative complexity while patients suffered. At my hospital network, I led a team that implemented a predictive analytics system for patient readmissions. We reduced 30-day readmission rates by 18% and saved the network $4.2M annually. But the real victory was not financial — it was the 600 patients who avoided unnecessary hospital stays and the cascading improvement in their long-term health outcomes. Healthcare needs more operators who can translate clinical insight into operational excellence. I want to be the person who builds the systems that let doctors be doctors.",

        "My journey into entrepreneurship started with a failure. At twenty-four, I raised $500K in seed funding for a food delivery startup in Tier-2 Indian cities. Eighteen months later, I shut it down. We had built a beautiful product that nobody needed — at least, not in the way we had designed it. The unit economics never worked because we had copy-pasted a model from metro markets without understanding the fundamentally different consumption patterns in smaller cities. That failure cost me two years and every rupee of my savings. But it gave me something no MBA case study ever could: the visceral understanding that markets don't care about your vision — they only care about your value. I rebuilt from there, and my second venture reached profitability within 11 months.",

        "In my seven years in media, I've watched the industry undergo a tectonic shift from institutional gatekeeping to algorithmic distribution. At my production company, I led the strategy that transitioned our content from linear broadcast to digital-first distribution, growing our audience from 2 million households to 15 million monthly active users across platforms. The key insight was counterintuitive: in a world of infinite content, the constraint is not production — it is attention. I restructured our entire content pipeline around engagement data, reducing average production cycles from 12 weeks to 4 while doubling completion rates. The future of media is not content creation — it is context creation.",

        "My career in real estate development has been defined by one principle: every building tells a story about the values of the people who built it. Over six years, I have developed over 1.2 million square feet of mixed-use commercial space across three cities. My signature project — a 400-unit affordable housing development in Pune — was designed in partnership with future residents, who participated in 40 design workshops over 8 months. The result was not just a building but a community, with shared spaces that have become anchors of neighborhood life.",

        "In supply chain management, the difference between theory and execution is measured in millions of dollars and thousands of hours. At my logistics company, I redesigned the last-mile delivery network for our largest client, reducing delivery times by 35% while cutting costs by 22%. The solution was not a new algorithm — it was a human insight. I spent three weeks riding with delivery drivers, and I discovered that 40% of failed deliveries were caused by incorrect address formatting in our system. A simple address validation layer solved what two years of route optimization algorithms had failed to address.",

        "I left a stable career in education policy to start a learning platform because I believed the system was broken at a structural level. In India, 260 million children are in school, but only 50% of fifth-graders can read at a second-grade level. I built a platform that uses adaptive learning to meet each student where they are. In our first year, students on our platform showed 2.3x learning gains compared to traditional classroom instruction. We now serve 35,000 students across 4 states, and I've raised $2M to expand to 200,000 by 2027.",
    ]

    essays = []
    for profile_idx, profile in enumerate(PROFILES):
        for school_id, school_info in SCHOOLS.items():
            for prompt_idx, prompt in enumerate(school_info["prompts"]):
                # Rotate through essay bodies
                body_idx = (profile_idx * len(SCHOOLS) + prompt_idx) % len(ESSAY_BODIES)
                essay_text = ESSAY_BODIES[body_idx]

                essays.append({
                    "school_id": school_id,
                    "school_name": school_info["name"],
                    "essay_prompt": prompt,
                    "essay_text": essay_text,
                    "word_count": len(essay_text.split()),
                    "source": "seed_generated",
                    "outcome": "admitted",
                    "year": "2024",
                    "applicant_profile": profile,
                })

    print(f"  [SEED] ✅ Generated {len(essays)} seed essays across {len(SCHOOLS)} schools × {len(PROFILES)} profiles")
    return essays


# ── Main Runner ──────────────────────────────────────────────────────────────
def run_all():
    print("=" * 60)
    print("🚀 MBA Essay Scraper — Multi-Source (stdlib-only)")
    print("=" * 60)

    all_essays = []

    # Phase 1: Scrape live sources
    print("\n📚 Phase 1: MBA Admission Gurus (21 schools)")
    for school_id, url in GURU_URLS.items():
        print(f"  Scraping {school_id}...")
        html = fetch_page(url)
        if html:
            found = extract_essays_from_html(html, school_id, "mbaadmissiongurus")
            all_essays.extend(found)
            print(f"    ✅ {len(found)} essay(s)")
        time.sleep(0.5)

    # Phase 2: Seed essays
    print("\n🌱 Phase 2: Seed Essay Generation")
    seed = generate_seed_essays()
    all_essays.extend(seed)

    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(all_essays, f, indent=2)

    # Summary
    print(f"\n{'=' * 60}")
    print(f"📊 SCRAPING SUMMARY")
    print(f"{'=' * 60}")
    sources = {}
    schools = {}
    for e in all_essays:
        sources[e["source"]] = sources.get(e["source"], 0) + 1
        sid = e.get("school_id", "unknown")
        schools[sid] = schools.get(sid, 0) + 1

    print(f"  Total Essays: {len(all_essays)}")
    print(f"\n  By Source:")
    for src, count in sorted(sources.items()):
        print(f"    {src}: {count}")
    print(f"\n  By School (top 10):")
    for sid, count in sorted(schools.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"    {sid}: {count}")
    print("=" * 60)

    return all_essays


if __name__ == "__main__":
    run_all()
