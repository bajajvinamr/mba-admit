"""
MBA School Database Generator v2 — 1000+ Schools with Deep Metadata + 12K+ Essays
Output: data/school_db_full.json, data/scraped_essays.json
"""
import json, os, random, hashlib, itertools

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
SCHOOL_DB_FILE = os.path.join(OUTPUT_DIR, "school_db_full.json")
ESSAYS_FILE = os.path.join(OUTPUT_DIR, "scraped_essays.json")

# ── Rich Metadata Templates ──────────────────────────────────────────────────

ROUND_DEADLINES = [
    {"round": "Round 1", "deadline": "September 2025", "decision": "December 2025"},
    {"round": "Round 2", "deadline": "January 2026", "decision": "March 2026"},
    {"round": "Round 3", "deadline": "April 2026", "decision": "May 2026"},
]

ROLLING_DEADLINES = [
    {"round": "Rolling Admissions", "deadline": "Applications reviewed on a rolling basis", "decision": "4-6 weeks after submission"},
]

UNIQUE_FEATURES_POOL = [
    "Case method pedagogy with 500+ original cases per year",
    "Global immersion programs across 30+ countries",
    "Integrated STEM-designated MBA curriculum",
    "Dual-degree options with Law, Medicine, Engineering, and Public Policy",
    "Dedicated startup incubator with $5M+ seed fund",
    "Industry-immersion treks to Silicon Valley, Wall Street, and Shenzhen",
    "1:1 executive coaching for every student",
    "Action-based learning with live consulting projects",
    "Small cohort model ensuring personalized attention",
    "Cross-campus exchange with partner schools on 5 continents",
    "Dedicated career acceleration program for international students",
    "Joint MBA-MPP with access to government leaders",
    "Entrepreneurship lab with prototyping facilities and maker spaces",
    "Real-money investment fund managed by MBA students",
    "Mandatory global consulting project in emerging markets",
    "Healthcare management specialization with hospital partnerships",
    "Fintech innovation lab in partnership with major banks",
    "Sustainability and ESG-focused curriculum track",
    "AI and Machine Learning specialization with dedicated lab",
    "Leadership development with wilderness expedition component",
    "Social enterprise practicum with NGO placements",
    "Real estate development studio with live deal flow",
    "Luxury brand management track with LVMH partnership",
    "Design thinking curriculum co-developed with design school",
    "Weekend MBA format for working professionals",
    "Accelerated 1-year MBA option available",
    "Online hybrid MBA with residency components",
    "Corporate partnership program with Fortune 500 companies",
    "Alumni network of 80,000+ across 150 countries",
    "Research centers in AI, blockchain, and quantum computing",
    "Capstone project requiring real business impact documentation",
    "Peer mentoring circles led by second-year students",
    "Dedicated spouse/partner career support program",
    "Military-to-business transition fellowship",
    "Women in leadership scholarship and mentoring program",
    "Industry concentration certifications in consulting, tech, and PE",
    "Access to on-campus venture capital pitch competitions",
    "Full-time career services team with 95%+ placement rate",
    "Partnership with local startup ecosystem for internships",
    "Dedicated analytics and data science certificate track",
]

PLACEMENT_INDUSTRIES = [
    ("Consulting", 28), ("Technology", 24), ("Finance / Banking", 20),
    ("Healthcare", 8), ("Consumer Goods", 7), ("Energy", 5),
    ("Real Estate", 3), ("Non-Profit / Government", 3), ("Media / Entertainment", 2),
]

TOP_RECRUITERS_POOL = [
    "McKinsey & Company", "Boston Consulting Group", "Bain & Company",
    "Goldman Sachs", "JPMorgan Chase", "Morgan Stanley",
    "Amazon", "Google", "Microsoft", "Apple", "Meta",
    "Deloitte", "PwC", "EY", "KPMG",
    "Accenture", "Capgemini", "Oliver Wyman",
    "Tata Consultancy Services", "Infosys", "Wipro",
    "Citibank", "HSBC", "Deutsche Bank", "Barclays",
    "Johnson & Johnson", "Procter & Gamble", "Unilever",
    "Nike", "L'Oréal", "LVMH",
    "Tesla", "SpaceX", "Uber", "Airbnb",
    "Samsung", "LG", "Sony", "Toyota",
    "Shell", "ExxonMobil", "BP", "Reliance Industries",
    "Flipkart", "Ola", "Byju's", "Zomato",
    "Grab", "Sea Group", "GoTo",
]

# ── Application Question Banks ───────────────────────────────────────────────

APP_QUESTIONS = {
    "goals": [
        "What are your short-term and long-term professional goals? How will our MBA program help you achieve them?",
        "Where do you see yourself five years after completing your MBA? How does our program fit into this vision?",
        "Describe your career aspirations and how our MBA will serve as a catalyst for achieving them.",
    ],
    "leadership": [
        "Describe a time when you led a team through a significant challenge. What was the outcome?",
        "Tell us about a leadership experience that shaped your management philosophy.",
        "Share an example where you had to lead without formal authority. What did you learn?",
        "Kellogg's purpose is to educate, equip, and inspire brave leaders. Tell us about a time you have demonstrated leadership.",
    ],
    "failure": [
        "Tell us about a failure that taught you an important lesson.",
        "Describe a professional setback. How did you recover and what did you learn?",
        "Share a time when things didn't go as planned. What would you do differently?",
    ],
    "community": [
        "Why have you chosen to apply to our program? What will you contribute to our community?",
        "How do you plan to contribute to classroom discussions and student life?",
        "Through your research, what actions have you taken to learn about our school? How will you take advantage of being part of our community?",
    ],
    "achievement": [
        "Describe the achievement you are most proud of and explain why.",
        "What is your most significant accomplishment, and why does it matter to you?",
    ],
    "identity": [
        "What matters most to you, and why?",
        "As we review your application, what more would you like us to know?",
        "Tell us something about yourself that is not captured elsewhere in your application.",
    ],
    "ethics": [
        "Describe an ethical dilemma you faced. How did you resolve it?",
        "Tell us about a time you had to balance competing interests of different stakeholders.",
    ],
    "innovation": [
        "Describe a time when you challenged conventional thinking to drive innovation.",
        "Tell us about a creative solution you implemented to solve a complex problem.",
    ],
    "career_cover_letter": [
        "Please submit a cover letter seeking a place in our MBA Program. Tell us why you are an ideal candidate.",
        "Briefly summarize your career progression since you started your professional career.",
    ],
}

# ── Essay Body Templates (expanded to 25) ────────────────────────────────────

ESSAY_BODIES = [
    # Consulting
    "During my tenure at a leading consulting firm, I led a cross-functional team of eight on a critical engagement for a Fortune 500 client facing a digital transformation crisis. The project required navigating complex stakeholder dynamics across three continents while delivering under an aggressive eight-week timeline. I restructured our approach by implementing a cross-functional war room model, which cascaded responsibility while maintaining strategic alignment. The result was a 23% improvement in operational efficiency and $180M in annual savings. This experience crystallized my belief that effective leadership is not about directing from above, but about creating the conditions for a team to do their best work. I now seek an MBA to transition from advising organizations to building them.",
    # Origin Story
    "Growing up in a small town in rural India, I learned early that resourcefulness is born from constraint. When my family faced financial hardship after my father's business collapsed, I discovered that my natural response to adversity is not retreat, but reimagination. I took on tutoring jobs at fourteen to help pay for my sister's school fees, and in the process discovered a talent for breaking down complex concepts into simple frameworks. This instinct followed me into my professional career, where I now lead product strategy for a fintech startup serving 3 million underbanked users.",
    # Investment Banking
    "After five years in investment banking, I understand capital markets at an intimate level. I have structured over $8 billion in transactions, negotiated with boards across four continents, and built financial models that have been stress-tested through two market corrections. But I want to deploy capital, not just advise on its movement. My goal is to build a growth equity fund focused on climate technology, and I believe an MBA will give me the operational toolkit and network to make that transition.",
    # Product / Tech
    "At a Series B startup, I led the 0-to-1 development of a product that now serves 2.3 million users. The journey was anything but linear — we pivoted three times, navigated a critical infrastructure failure at launch that took our systems offline for 72 hours, and had to rebuild trust with our enterprise clients after a security incident. Through it all, I learned that great product leadership means holding the vision while remaining radically open to how you get there.",
    # Non-Profit
    "As Executive Director of a national education non-profit, I inherited an organization with a $1.2M deficit and declining donor engagement. Over 18 months, I renegotiated three major vendor contracts that saved $340K annually, launched a digital fundraising platform that generated $890K in its first year, and restructured the board governance model. The turnaround taught me that impact and sustainability are not opposing forces — they are complementary when you apply rigorous business discipline to mission-driven work.",
    # Military
    "The most important lesson I learned in the military was not about strategy — it was about trust. During my deployment, I led a platoon through a six-month operation in a hostile environment where split-second decisions carried life-or-death consequences. That experience taught me that leadership is not an event that happens during crisis — it is a culture that is built in every quiet moment before it. I am now ready to bring that discipline to the business world.",
    # Healthcare
    "I worked in healthcare for seven years before applying to business school, and in that time I watched the industry eat itself alive with administrative complexity while patients suffered. At my hospital network, I led a team that implemented a predictive analytics system for patient readmissions. We reduced 30-day readmission rates by 18% and saved the network $4.2M annually. The system now serves as a model for twelve other hospital systems nationwide.",
    # Entrepreneurship / Failure
    "My journey into entrepreneurship started with a failure. At twenty-four, I raised $500K in seed funding for a food delivery startup in Tier-2 Indian cities. Eighteen months later, I shut it down. We had built a beautiful product that nobody needed. That failure cost me two years and every rupee of my savings. But it gave me something no MBA case study ever could: the visceral understanding that markets don't care about your vision — they only care about your value.",
    # Media
    "In my seven years in media, I've watched the industry undergo a tectonic shift from institutional gatekeeping to algorithmic distribution. At my production company, I led the strategy that transitioned our content from linear broadcast to digital-first distribution, growing our audience from 2 million households to 15 million monthly active users across platforms. I now want to build the next generation of media infrastructure.",
    # Supply Chain
    "In supply chain management, the difference between theory and execution is measured in millions of dollars and thousands of hours. At my logistics company, I redesigned the last-mile delivery network for our largest client, reducing delivery times by 35% while cutting costs by 22%. The solution was not a new algorithm — it was a human insight about how drivers actually navigate urban environments.",
    # Education Tech
    "I left a stable career in education policy to start a learning platform because I believed the system was broken at a structural level. In India, 260 million children are in school, but only 50% of fifth-graders can read at a second-grade level. I built a platform that uses adaptive learning to meet each student where they are. We now serve 180,000 students across three states.",
    # Real Estate
    "My career in real estate development has been defined by one principle: every building tells a story about the values of the people who built it. Over six years, I have developed over 1.2 million square feet of mixed-use commercial space across three cities, with a focus on sustainable design that reduces energy consumption by 40% compared to conventional construction.",
    # Data Science / AI
    "As a data scientist at a major tech company, I built machine learning models that improved advertising revenue by $120M annually. But I grew increasingly uncomfortable with the ethical implications of our optimization targets. I want to study business ethics alongside technical leadership so I can build AI systems that are both profitable and principled.",
    # Private Equity
    "In three years of private equity, I evaluated over 200 companies and led due diligence on four acquisitions totaling $850M. The most valuable skill I developed was not financial modeling — it was the ability to sit across from a founder and understand, within an hour, whether their company has a real moat or just a good pitch deck.",
    # Social Enterprise
    "After witnessing the water crisis in rural Kenya during a volunteer trip, I co-founded a social enterprise that has installed 340 clean water systems serving 200,000 people. The experience taught me that sustainable impact requires combining nonprofit passion with for-profit discipline. An MBA will help me scale this model.",
    # Pharma / Biotech
    "Leading clinical trial operations for a rare disease drug, I managed a $45M budget across 12 countries and 83 clinical sites. When enrollment lagged behind schedule, I redesigned our patient recruitment strategy using digital health platforms, increasing enrollment by 60% in four months and saving the program from a $12M cost overrun.",
    # Energy Transition
    "As a renewable energy project manager, I led the development of a 200MW solar farm that now powers 50,000 homes. The project required navigating regulatory complexity across three jurisdictions, managing a 150-person construction team, and negotiating power purchase agreements with three utility companies. I learned that the energy transition will be won not by technology alone, but by people who can bridge engineering and policy.",
    # Family Business
    "I joined my family's manufacturing business at 22, inheriting a company with $15M in revenue and 200 employees. Over five years, I modernized our operations by implementing ERP systems, establishing quality certifications, and expanding into two new markets. Revenue grew to $42M. But the hardest challenge was not operational — it was earning the trust of employees who had known me since I was a child.",
    # Venture Capital
    "As an analyst at a venture capital firm, I sourced and evaluated over 500 startups. I led the investment memo for our fund's most successful exit — a healthtech company that returned 12x. The experience taught me that the best investors don't just pick winners; they help build them through strategic guidance, network access, and operational support.",
    # Government / Policy
    "Working in government policy for five years, I led the design of a national digital identity system that now serves 400 million citizens. The project required coordinating across 15 government agencies, managing vendor relationships worth $200M, and navigating intense political scrutiny. I learned that the most impactful policies are those designed with empathy for the people they serve.",
    # Sports Management
    "As Head of Commercial Partnerships for a professional sports league, I grew sponsorship revenue from $18M to $45M in three years by creating data-driven partnership packages. My proudest achievement was designing a fan engagement platform that increased matchday attendance by 35% and won a Sports Innovation Award.",
    # Fashion / Luxury
    "Leading brand strategy for a luxury fashion house, I managed a $30M marketing budget across 14 markets. I spearheaded our pivot to direct-to-consumer digital, growing online revenue from 8% to 34% of total sales. The lesson: luxury is not about exclusivity — it is about creating experiences that justify the emotional investment.",
    # Agriculture / Agtech
    "Growing up on a farm, I understood the gap between agricultural innovation and farmer adoption. I built an agtech platform that uses satellite imagery and AI to provide crop health recommendations to 45,000 smallholder farmers. We reduced crop loss by 25% in our pilot regions, translating to $8M in additional farmer income annually.",
    # Cybersecurity
    "As a cybersecurity consultant, I led incident response for three major data breaches affecting over 10 million consumer records. The experience taught me that security is fundamentally a business problem, not a technology problem. Organizations fail not because they lack firewalls, but because they lack a security-conscious culture.",
    # Urban Planning / Smart Cities
    "Working at the intersection of technology and urban planning, I led a smart city initiative that reduced traffic congestion by 22% in a metropolitan area of 8 million people. The project integrated IoT sensors, machine learning traffic prediction, and real-time routing optimization. I want an MBA to scale these solutions globally.",
]

PROFILES = [
    {"industry": "Management Consulting", "gmat": 740, "gpa": 3.8, "yoe": 5},
    {"industry": "Investment Banking", "gmat": 730, "gpa": 3.7, "yoe": 4},
    {"industry": "Technology / Product Management", "gmat": 750, "gpa": 3.9, "yoe": 6},
    {"industry": "Non-Profit / Social Impact", "gmat": 710, "gpa": 3.6, "yoe": 7},
    {"industry": "Military / Government", "gmat": 720, "gpa": 3.5, "yoe": 8},
    {"industry": "Healthcare / Pharma", "gmat": 735, "gpa": 3.85, "yoe": 5},
    {"industry": "Entrepreneurship", "gmat": 725, "gpa": 3.4, "yoe": 3},
    {"industry": "Engineering / Manufacturing", "gmat": 745, "gpa": 3.9, "yoe": 4},
    {"industry": "Media & Entertainment", "gmat": 715, "gpa": 3.65, "yoe": 5},
    {"industry": "Real Estate / Construction", "gmat": 728, "gpa": 3.55, "yoe": 6},
    {"industry": "Supply Chain / Operations", "gmat": 732, "gpa": 3.7, "yoe": 5},
    {"industry": "Education / EdTech", "gmat": 705, "gpa": 3.8, "yoe": 4},
    {"industry": "Data Science / AI", "gmat": 755, "gpa": 3.95, "yoe": 4},
    {"industry": "Private Equity / VC", "gmat": 740, "gpa": 3.75, "yoe": 5},
    {"industry": "Energy / Sustainability", "gmat": 718, "gpa": 3.6, "yoe": 6},
    {"industry": "Government / Policy", "gmat": 710, "gpa": 3.7, "yoe": 7},
    {"industry": "Fashion / Luxury", "gmat": 705, "gpa": 3.5, "yoe": 5},
    {"industry": "Agriculture / Agtech", "gmat": 695, "gpa": 3.6, "yoe": 4},
    {"industry": "Sports Management", "gmat": 700, "gpa": 3.55, "yoe": 5},
    {"industry": "Cybersecurity / InfoSec", "gmat": 738, "gpa": 3.85, "yoe": 4},
]

# ── SCHOOLS (will include the 250+ hand-curated ones from v1, loaded from existing file) ──

def load_v1_schools():
    """Load the existing generated schools as a base."""
    v1_path = os.path.join(OUTPUT_DIR, "school_db_full.json")
    if os.path.exists(v1_path):
        with open(v1_path, "r") as f:
            return json.load(f)
    return {}

def enrich_school(sid, school, rng):
    """Add deep metadata to an existing school record."""
    gmat = school.get("gmat_avg", 680)
    acceptance = school.get("acceptance_rate", 30)
    salary = school.get("median_salary", "$100,000")
    specs = school.get("specializations", ["General Management"])
    name = school["name"]
    degree = school.get("degree_type", "MBA")
    
    # Admission Requirements
    is_elite = gmat >= 720
    is_mid = 660 <= gmat < 720
    
    # Adjust requirements based on degree type
    if degree == "MiM":
        work_exp = "0-2 years recommended"
        avg_exp = "1 year"
    elif degree == "Deferred MBA":
        work_exp = "Only current undergraduate or master's students with no full-time work experience are eligible to apply."
        avg_exp = "0 years"
    elif degree == "Executive MBA":
        work_exp = "8-15 years recommended"
        avg_exp = "12 years"
    else:
        work_exp = f"{rng.randint(3,5)}-{rng.randint(6,10)} years recommended" if is_elite else f"{rng.randint(2,3)}-{rng.randint(5,8)} years recommended"
        avg_exp = f"{rng.randint(4,6)} years" if is_elite else f"{rng.randint(3,5)} years"
    
    school["admission_requirements"] = {
        "gmat_gre": f"Average GMAT: {gmat} (GRE accepted)" if gmat >= 650 else f"Average GMAT: {gmat} (GMAT/GRE/Executive Assessment accepted)",
        "work_experience": work_exp,
        "avg_work_experience": avg_exp,
        "english_proficiency": "TOEFL 109+ / IELTS 7.5+" if is_elite else ("TOEFL 100+ / IELTS 7.0+" if is_mid else "TOEFL 90+ / IELTS 6.5+"),
        "transcripts": "Official transcripts from all undergraduate and graduate institutions",
        "recommendations": f"{rng.choice([1,2])} professional recommendations required" if degree == "MiM" else f"{rng.choice([2,2,2,3])} professional recommendations required",
        "resume": "Current resume/CV required",
        "interview": rng.choice(["By invitation only", "Required for all shortlisted candidates", "Virtual or in-person interview required"]),
        "application_fee": f"${rng.choice([150, 200, 250, 100, 75])}" if school.get("country") in ["USA", "UK", "France"] else f"${rng.choice([50, 75, 100, 125])}",
    }
    
    # Program Details
    if degree == "MBA":
        duration_opts = ["2-year full-time", "1-year full-time", "16-month accelerated", "21-month full-time", "12-month intensive"]
        if school.get("country") in ["UK", "France", "Spain", "India"] or gmat < 650:
            duration_opts = ["1-year full-time", "12-month intensive", "15-month accelerated"]
    elif degree == "MiM" or degree == "Master of Finance":
        duration_opts = ["10-month intensive", "1-year full-time", "14-month full-time"]
    elif degree == "Executive MBA":
        duration_opts = ["2-year weekend format", "22-month modular", "18-month part-time"]
    else:
        duration_opts = ["1-year full-time", "2-year full-time"]
        
    dur = rng.choice(duration_opts)
    school["program_duration"] = dur
    
    is_stem = rng.random() > 0.4 if (is_elite and school.get("country") == "USA") else (rng.random() > 0.8)
    if "Business Analytics" in name or "MFin" in name:
        is_stem = True
        
    school["stem_designated"] = is_stem
    
    school["program_details"] = {
        "duration": dur,
        "format": "Full-Time, In-Person" if "Executive" not in degree else "Part-Time / Modular",
        "total_credits": rng.choice([60, 54, 72, 48]),
        "core_courses": rng.choice([12, 14, 10, 16]),
        "elective_courses": f"{rng.randint(20, 50)}+ options",
        "class_size": school.get("class_size", rng.choice([250, 300, 100, 50, 400, 800])),
        "avg_age": 28 if degree == "MBA" else (23 if degree == "MiM" else (34 if degree == "Executive MBA" else 25)),
        "female_percentage": f"{rng.randint(35, 48)}%",
        "international_percentage": f"{rng.randint(25, 60)}%",
        "countries_represented": rng.randint(20, 70),
        "stem_designated": is_stem,
        "start_date": rng.choice(["August", "September", "January"]),
    }
    
    # Unique Features
    num_features = rng.randint(3, 6)
    school["unique_features"] = rng.sample(UNIQUE_FEATURES_POOL, min(num_features, len(UNIQUE_FEATURES_POOL)))
    
    # Placement Stats
    total_pct = 0
    placements = []
    for industry, base_pct in PLACEMENT_INDUSTRIES:
        if total_pct >= 95:
            break
        adj = base_pct + rng.randint(-5, 5)
        adj = max(1, min(adj, 100 - total_pct))
        if any(s.lower() in industry.lower() for s in specs):
            adj = min(adj + rng.randint(3, 8), 100 - total_pct)
        placements.append({"industry": industry, "percentage": adj})
        total_pct += adj
    if total_pct < 100:
        placements.append({"industry": "Other", "percentage": 100 - total_pct})
    
    num_recruiters = rng.randint(5, 12)
    recruiters = rng.sample(TOP_RECRUITERS_POOL, min(num_recruiters, len(TOP_RECRUITERS_POOL)))
    
    school["placement_stats"] = {
        "employment_rate_3_months": f"{rng.randint(85, 99)}%",
        "median_base_salary": salary,
        "median_signing_bonus": f"${rng.randint(15, 40):,}000",
        "industry_breakdown": placements,
        "top_recruiters": recruiters,
        "internship_rate": f"{rng.randint(90, 100)}%" if degree != "Executive MBA" else "N/A",
    }
    
    # Admission Deadlines
    if is_elite:
        school["admission_deadlines"] = ROUND_DEADLINES
    else:
        school["admission_deadlines"] = rng.choice([ROUND_DEADLINES, ROUND_DEADLINES[:2] + ROLLING_DEADLINES, ROLLING_DEADLINES])
    
    # Application Questions (2-4 per school)
    q_categories = rng.sample(list(APP_QUESTIONS.keys()), rng.randint(2, 4))
    questions = []
    for cat in q_categories:
        questions.append(rng.choice(APP_QUESTIONS[cat]))
    school["application_questions"] = questions
    
    # Also set essay_prompts to match application_questions for agent compatibility
    school["essay_prompts"] = questions
    
    return school


# ── Extra School Generator (for schools beyond hand-curated) ──────────────

EXTRA_REGIONS_V2 = {
    "USA_extra": {
        "cities": [
            "Phoenix, AZ", "Denver, CO", "Portland, OR", "Salt Lake City, UT", "Tampa, FL", "Charlotte, NC",
            "San Diego, CA", "San Antonio, TX", "Kansas City, MO", "Omaha, NE", "Milwaukee, WI",
            "New Orleans, LA", "Louisville, KY", "Oklahoma City, OK", "Raleigh, NC",
            "Memphis, TN", "Baltimore, MD", "Buffalo, NY", "Hartford, CT", "Providence, RI",
            "Richmond, VA", "Birmingham, AL", "Detroit, MI", "Sacramento, CA", "Jacksonville, FL",
            "Baton Rouge, LA", "Tulsa, OK", "Knoxville, TN", "Little Rock, AR",
            "Des Moines, IA", "Wichita, KS", "Dayton, OH", "Albuquerque, NM",
            "Boise, ID", "Honolulu, HI", "Spokane, WA",
            "Fresno, CA", "Mesa, AZ", "Virginia Beach, VA", "Arlington, TX", "Aurora, CO",
            "Bakersfield, CA", "Greensboro, NC", "Plano, TX", "Irvine, CA",
            "Scottsdale, AZ", "Fremont, CA", "Madison, WI", "Norfolk, VA",
            "Reno, NV", "St. Petersburg, FL", "Tacoma, WA", "Fayetteville, NC", "Worcester, MA",
            "Sioux Falls, SD", "Huntsville, AL", "Columbia, SC", "Springfield, MO",
            "Fort Wayne, IN", "Chattanooga, TN", "Savannah, GA", "Charleston, SC",
            "Provo, UT", "Lexington, KY", "Tallahassee, FL", "Eugene, OR",
            "Pasadena, CA", "Naperville, IL", "Tempe, AZ", "Overland Park, KS",
            "Rockville, MD", "Athens, GA", "Ann Arbor, MI", "Boulder, CO",
            "Gainesville, FL", "Tuscaloosa, AL", "Champaign, IL", "Bloomington, IN",
            "State College, PA", "College Station, TX", "Corvallis, OR", "Laramie, WY",
            "Burlington, VT", "Missoula, MT", "Fargo, ND", "Lubbock, TX",
            "Las Cruces, NM", "Morgantown, WV", "Cheyenne, WY", "Billings, MT",
            "Rapid City, SD", "Bismarck, ND", "Pierre, SD", "Juneau, AK",
        ],
        "country": "USA",
        "suffixes": ["School of Business", "Business School", "College of Business", "Graduate School of Business",
                      "School of Management", "School of Commerce", "MBA Program"],
        "prefixes": ["University of", "State University", "Pacific University", "Metropolitan University",
                      "National University", "Tech", "Graduate Institute of"],
        "gmat_range": (580, 680), "accept_range": (28, 65), "tuition_range": (18000, 58000),
        "salary_range": (65000, 125000), "size_range": (25, 140),
    },
    "Europe_extra": {
        "cities": [
            "Zurich", "Hamburg", "Munich", "Frankfurt", "Vienna", "Dublin", "Brussels", "Amsterdam",
            "Rome", "Prague", "Budapest", "Athens", "Bucharest", "Tallinn",
            "Riga", "Vilnius", "Bratislava", "Ljubljana", "Zagreb", "Belgrade", "Sofia",
            "Krakow", "Gothenburg", "Antwerp", "Turin", "Seville",
            "Porto", "Valencia", "Bilbao", "Cologne", "Stuttgart", "Düsseldorf",
            "Dresden", "Leipzig", "Nuremberg", "Hannover", "Bremen", "Salzburg",
            "Graz", "Innsbruck", "Basel", "Bern", "Geneva", "Cork", "Galway",
            "Birmingham", "Manchester", "Leeds", "Liverpool", "Bristol", "Sheffield",
            "Wroclaw", "Gdansk", "Poznan", "Debrecen", "Brno", "Cluj-Napoca",
            "Thessaloniki", "Nicosia", "Oslo", "Malmö", "Tampere",
            "Bordeaux", "Nantes", "Strasbourg", "Montpellier", "Lille",
            "Florence", "Naples", "Bologna", "Padua", "Genoa",
            "Málaga", "Zaragoza", "Palma de Mallorca", "Gran Canaria",
            "Bruges", "Leuven", "Rotterdam", "Delft", "Uppsala",
            "Turku", "Tartu", "Lodz", "Kaunas", "Split",
            "Sarajevo", "Skopje", "Tirana", "Podgorica", "Chisinau",
            "Reykjavik", "Luxembourg City", "Monaco", "Andorra la Vella", "Vaduz",
        ],
        "countries": [
            "Switzerland", "Germany", "Germany", "Germany", "Austria", "Ireland", "Belgium", "Netherlands",
            "Italy", "Czech Republic", "Hungary", "Greece", "Romania", "Estonia",
            "Latvia", "Lithuania", "Slovakia", "Slovenia", "Croatia", "Serbia", "Bulgaria",
            "Poland", "Sweden", "Belgium", "Italy", "Spain",
            "Portugal", "Spain", "Spain", "Germany", "Germany", "Germany",
            "Germany", "Germany", "Germany", "Germany", "Germany", "Austria",
            "Austria", "Austria", "Switzerland", "Switzerland", "Switzerland", "Ireland", "Ireland",
            "UK", "UK", "UK", "UK", "UK", "UK",
            "Poland", "Poland", "Poland", "Hungary", "Czech Republic", "Romania",
            "Greece", "Cyprus", "Norway", "Sweden", "Finland",
            "France", "France", "France", "France", "France",
            "Italy", "Italy", "Italy", "Italy", "Italy",
            "Spain", "Spain", "Spain", "Spain",
            "Belgium", "Belgium", "Netherlands", "Netherlands", "Sweden",
            "Finland", "Estonia", "Poland", "Lithuania", "Croatia",
            "Bosnia", "North Macedonia", "Albania", "Montenegro", "Moldova",
            "Iceland", "Luxembourg", "Monaco", "Andorra", "Liechtenstein",
        ],
        "suffixes": ["Business School", "Management School", "School of Economics", "Graduate School",
                      "School of Commerce", "Institute of Management"],
        "prefixes": ["", "European", "International", "Global", "Continental", "Royal"],
        "gmat_range": (560, 680), "accept_range": (20, 60), "tuition_range": (10000, 58000),
        "salary_range": (45000, 115000), "size_range": (15, 100),
    },
    "Asia_extra": {
        "cities": [
            "Bangkok", "Kuala Lumpur", "Jakarta", "Manila", "Ho Chi Minh City", "Taipei",
            "Osaka", "Busan", "Shenzhen", "Chengdu", "Pune", "Chennai", "Dhaka",
            "Karachi", "Colombo", "Hanoi", "Yangon", "Phnom Penh",
            "Nagoya", "Fukuoka", "Sapporo", "Daegu", "Incheon", "Guangzhou",
            "Wuhan", "Hangzhou", "Nanjing", "Xi'an", "Xiamen", "Dalian",
            "Chandigarh", "Jaipur", "Kochi", "Nagpur", "Visakhapatnam",
            "Surabaya", "Bandung", "Cebu", "Davao", "Chiang Mai",
            "Penang", "Johor Bahru", "Lahore", "Islamabad",
            "Kathmandu", "Ulaanbaatar", "Almaty", "Tashkent",
            "Bishkek", "Dushanbe", "Ashgabat", "Vladivostok",
            "Novosibirsk", "Kazan", "Tbilisi", "Baku",
            "Yerevan", "Phnom Penh", "Vientiane", "Thimphu",
            "Male", "Port Louis", "Colombo", "Dhaka",
            "Chittagong", "Sylhet", "Rajshahi", "Khulna",
            "Lucknow", "Bhopal", "Patna", "Ranchi", "Guwahati",
            "Coimbatore", "Madurai", "Mangalore", "Mysuru", "Thiruvananthapuram",
        ],
        "countries": [
            "Thailand", "Malaysia", "Indonesia", "Philippines", "Vietnam", "Taiwan",
            "Japan", "South Korea", "China", "China", "India", "India", "Bangladesh",
            "Pakistan", "Sri Lanka", "Vietnam", "Myanmar", "Cambodia",
            "Japan", "Japan", "Japan", "South Korea", "South Korea", "China",
            "China", "China", "China", "China", "China", "China",
            "India", "India", "India", "India", "India",
            "Indonesia", "Indonesia", "Philippines", "Philippines", "Thailand",
            "Malaysia", "Malaysia", "Pakistan", "Pakistan",
            "Nepal", "Mongolia", "Kazakhstan", "Uzbekistan",
            "Kyrgyzstan", "Tajikistan", "Turkmenistan", "Russia",
            "Russia", "Russia", "Georgia", "Azerbaijan",
            "Armenia", "Cambodia", "Laos", "Bhutan",
            "Maldives", "Mauritius", "Sri Lanka", "Bangladesh",
            "Bangladesh", "Bangladesh", "Bangladesh", "Bangladesh",
            "India", "India", "India", "India", "India",
            "India", "India", "India", "India", "India",
        ],
        "suffixes": ["Business School", "School of Management", "Graduate School of Business",
                      "College of Commerce", "Institute of Business Administration"],
        "prefixes": ["Asia", "Pacific", "National", "Institute of", "Royal", "Eastern"],
        "gmat_range": (530, 670), "accept_range": (15, 60), "tuition_range": (4000, 48000),
        "salary_range": (20000, 90000), "size_range": (20, 180),
    },
    "LatAm_Africa_ME_extra": {
        "cities": [
            "Bogotá", "Quito", "Medellin", "Guadalajara", "Panama City",
            "Accra", "Addis Ababa", "Dar es Salaam", "Kampala", "Lusaka", "Maputo",
            "Riyadh", "Doha", "Kuwait City", "Muscat", "Amman",
            "Casablanca", "Tunis", "Algiers", "Cairo",
            "Montevideo", "Asunción", "La Paz", "Santa Cruz", "Caracas",
            "San Salvador", "Tegucigalpa", "Managua", "Kingston",
            "Santo Domingo", "San Juan", "Port of Spain",
            "Nairobi", "Kigali", "Douala", "Dakar", "Abidjan",
            "Windhoek", "Gaborone", "Harare",
            "Jeddah", "Sharjah", "Manama", "Beirut",
            "Tehran", "Baku", "Tbilisi", "Yerevan",
            "Cali", "Barranquilla", "Cartagena", "Guayaquil",
            "Arequipa", "Cusco", "Valparaíso", "Concepción",
            "Rosario", "Córdoba", "Mendoza", "Mar del Plata",
            "Recife", "Salvador", "Fortaleza", "Belo Horizonte",
            "Curitiba", "Porto Alegre", "Brasília", "Manaus",
            "Kampala", "Luanda", "Kinshasa", "Brazzaville",
            "Abuja", "Port Harcourt", "Kumasi", "Lome",
        ],
        "countries": [
            "Colombia", "Ecuador", "Colombia", "Mexico", "Panama",
            "Ghana", "Ethiopia", "Tanzania", "Uganda", "Zambia", "Mozambique",
            "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Jordan",
            "Morocco", "Tunisia", "Algeria", "Egypt",
            "Uruguay", "Paraguay", "Bolivia", "Bolivia", "Venezuela",
            "El Salvador", "Honduras", "Nicaragua", "Jamaica",
            "Dominican Republic", "Puerto Rico", "Trinidad and Tobago",
            "Kenya", "Rwanda", "Cameroon", "Senegal", "Ivory Coast",
            "Namibia", "Botswana", "Zimbabwe",
            "Saudi Arabia", "UAE", "Bahrain", "Lebanon",
            "Iran", "Azerbaijan", "Georgia", "Armenia",
            "Colombia", "Colombia", "Colombia", "Ecuador",
            "Peru", "Peru", "Chile", "Chile",
            "Argentina", "Argentina", "Argentina", "Argentina",
            "Brazil", "Brazil", "Brazil", "Brazil",
            "Brazil", "Brazil", "Brazil", "Brazil",
            "Uganda", "Angola", "DRC", "Congo",
            "Nigeria", "Nigeria", "Ghana", "Togo",
        ],
        "suffixes": ["Business School", "School of Management", "Graduate School",
                      "Institute of Business", "School of Commerce", "Academy of Management"],
        "prefixes": ["", "National", "International", "Applied", "Pan-African", "Mediterranean"],
        "gmat_range": (500, 650), "accept_range": (22, 70), "tuition_range": (3000, 40000),
        "salary_range": (18000, 75000), "size_range": (15, 100),
    },
}

SPEC_POOL = [
    ["Finance", "Marketing", "Strategy"], ["Tech", "Innovation", "Analytics"],
    ["Healthcare", "Supply Chain", "Operations"], ["Entrepreneurship", "Real Estate", "Finance"],
    ["Consulting", "Strategy", "Leadership"], ["Energy", "Sustainability", "Finance"],
    ["Digital Marketing", "AI", "Data Science"], ["Hospitality", "Tourism", "Entertainment"],
    ["Fintech", "Blockchain", "Banking"], ["Luxury", "Fashion", "Brand Management"],
    ["Emerging Markets", "International Business", "Trade"], ["Social Impact", "Development", "NGO"],
    ["Manufacturing", "Quality", "Lean Operations"], ["Agribusiness", "Food", "Sustainability"],
    ["Mining", "Natural Resources", "Energy"], ["Government", "Public Policy", "Defense"],
    ["Sports Management", "Media", "Events"], ["Cybersecurity", "Risk", "Compliance"],
]


def generate_id(name):
    return hashlib.md5(name.encode()).hexdigest()[:12]


def generate_extra_schools(rng):
    """Generate additional schools across all regions. 2 variants per city."""
    extra = {}
    for region, cfg in EXTRA_REGIONS_V2.items():
        countries_list = cfg.get("countries", [cfg.get("country", "Unknown")] * len(cfg["cities"]))
        for i, city in enumerate(cfg["cities"]):
            country = countries_list[i % len(countries_list)]
            city_name = city.split(",")[0].strip()
            
            # Variant 1: prefix + city + suffix
            suffix = cfg["suffixes"][i % len(cfg["suffixes"])]
            prefix = cfg["prefixes"][i % len(cfg["prefixes"])]
            if prefix:
                name1 = f"{prefix} {city_name} {suffix}"
            else:
                name1 = f"{city_name} {suffix}"
            
            # Variant 2: different prefix/suffix combo
            suffix2 = cfg["suffixes"][(i + 3) % len(cfg["suffixes"])]
            prefix2 = cfg["prefixes"][(i + 2) % len(cfg["prefixes"])]
            if prefix2:
                name2 = f"{city_name} {prefix2} {suffix2}"
            else:
                name2 = f"{city_name} {suffix2}"
            
            for vi, name in enumerate([name1, name2]):
                sid = generate_id(name)
                if sid in extra:
                    sid = generate_id(name + str(i) + str(vi))
                
                specs = rng.choice(SPEC_POOL)
                gmat = rng.randint(*cfg["gmat_range"])
                accept = round(rng.uniform(*cfg["accept_range"]), 1)
                tuition = rng.randint(*cfg["tuition_range"])
                salary = rng.randint(*cfg["salary_range"])
                size = rng.randint(*cfg["size_range"])
                
                extra[sid] = {
                    "name": name,
                    "location": city,
                    "country": country,
                    "gmat_avg": gmat,
                    "acceptance_rate": accept,
                    "class_size": size,
                    "tuition_usd": tuition,
                    "median_salary": f"${salary:,}",
                    "specializations": specs,
                }
    return extra

def generate_special_programs(base_db, rng):
    """Clone select schools & alter them to represent specific user requests like MiMs and EMBAs."""
    specials = {}
    
    def add_program(parent_sid, title_suffix, degree, gmat_mod, tuit_mod, sal_mod):
        parent = base_db.get(parent_sid)
        if not parent: return
        new_sid = f"{parent_sid}_{degree.lower().replace(' ', '_')}"
        new_prog = parent.copy()
        new_prog["name"] = f"{parent['name']} ({title_suffix})"
        new_prog["degree_type"] = degree
        # Minor statistical adjustments
        new_prog["gmat_avg"] = max(500, parent.get("gmat_avg", 700) + gmat_mod)
        new_prog["tuition_usd"] = int((parent.get("tuition_usd", 80000) or 80000) * tuit_mod)
        sal_int = int(str(parent.get("median_salary", "100000")).replace('$', '').replace(',', ''))
        new_prog["median_salary"] = f"${int(sal_int * sal_mod):,}"
        specials[new_sid] = new_prog

    # Need to find the SIDs dynamically if they exist, or fallback
    def find_sid(keyword):
        for sid, s in base_db.items():
            if keyword.lower() in s["name"].lower(): return sid
        return None

    # MIT
    mit_sid = find_sid("mit") or find_sid("sloan")
    if mit_sid:
        add_program(mit_sid, "MiM", "MiM", -20, 0.7, 0.6)
        add_program(mit_sid, "Master of Finance", "Master of Finance", -10, 0.9, 0.8)
    
    # ESCP
    escp_sid = find_sid("escp")
    if escp_sid:
        add_program(escp_sid, "Master in Management", "MiM", -30, 0.8, 0.7)
        
    # ISB
    isb_sid = find_sid("indian school of business") or find_sid("isb")
    if isb_sid:
        add_program(isb_sid, "PGP YL (Young Leaders)", "Deferred MBA", 0, 1.0, 1.0)
        
    # IIMs 
    iim_sids = [sid for sid, s in base_db.items() if "indian institute of management" in s["name"].lower()]
    for i_sid in iim_sids:
        add_program(i_sid, "EPGP (Executive)", "Executive MBA", -40, 1.2, 1.3)
        add_program(i_sid, "CAT-led PGP (MBA)", "MBA (CAT)", 0, 0.8, 0.8)
        
    return specials

def generate_essays(db, rng, essays_per_school=12):
    """Generate ~12 essays per school for 12K+ total."""
    essays = []
    body_count = len(ESSAY_BODIES)
    profile_count = len(PROFILES)
    
    for sid, school in db.items():
        prompts = school.get("application_questions", school.get("essay_prompts", ["Tell us about yourself."]))
        
        for prompt in prompts:
            # Generate multiple essays per prompt
            num = max(3, essays_per_school // max(len(prompts), 1))
            for j in range(num):
                profile = PROFILES[(hash(sid) + j) % profile_count]
                body = ESSAY_BODIES[(hash(sid) + j) % body_count]
                
                essays.append({
                    "school_id": sid,
                    "school_name": school["name"],
                    "essay_prompt": prompt,
                    "essay_text": body,
                    "word_count": len(body.split()),
                    "source": "seed_generated",
                    "outcome": "admitted",
                    "year": rng.choice(["2023", "2024", "2025"]),
                    "applicant_profile": profile,
                })
    return essays


def main():
    rng = random.Random(42)
    
    print("=" * 70)
    print("🌍 MBA School Database Generator v2 — 1000+ Schools, Multi-Program Architecture")
    print("=" * 70)
    
    # Step 1: Load existing hand-curated schools
    base_db = load_v1_schools()
    for sid, s in base_db.items():
        if "degree_type" not in s: s["degree_type"] = "MBA"
    print(f"\n📦 Loaded {len(base_db)} base schools from v1")
    
    # Step 2: Generate special Multi-Program variants
    specials = generate_special_programs(base_db, rng)
    print(f"🧬 Generated {len(specials)} specialized programs (MiM, PGP YL, EMBA)")
    
    # Step 3: Generate additional schools from expanded regions
    extra = generate_extra_schools(rng)
    print(f"🔧 Generated {len(extra)} additional generic schools from region generator")
    
    # Step 4: Merge 
    full_db = {}
    full_db.update(extra) 
    full_db.update(base_db) # Base overrides extra
    full_db.update(specials) # Specials override base
    
    print(f"🔗 Merged: {len(full_db)} total program variants")
    
    # Step 4: Enrich ALL schools with deep metadata
    print("\n🧠 Enriching all schools with deep metadata...")
    for sid in full_db:
        full_db[sid] = enrich_school(sid, full_db[sid], rng)
    
    # Step 5: Count by country
    countries = {}
    for s in full_db.values():
        c = s.get("country", "Unknown")
        countries[c] = countries.get(c, 0) + 1
    
    print(f"\n📊 Schools by Top Countries:")
    for c, count in sorted(countries.items(), key=lambda x: -x[1])[:20]:
        print(f"   {c}: {count}")
    
    # Step 6: Save school DB
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(SCHOOL_DB_FILE, "w") as f:
        json.dump(full_db, f, indent=2)
    print(f"\n💾 Saved school database to {SCHOOL_DB_FILE}")
    
    # Step 7: Generate essays (targeting ~12 per school)
    print("\n📝 Generating essays...")
    essays = generate_essays(full_db, rng, essays_per_school=12)
    
    with open(ESSAYS_FILE, "w") as f:
        json.dump(essays, f, indent=2)
    print(f"💾 Saved {len(essays)} essays to {ESSAYS_FILE}")
    
    # Step 8: Print sample school
    sample_sid = "hbs" if "hbs" in full_db else list(full_db.keys())[0]
    sample = full_db[sample_sid]
    print(f"\n{'=' * 70}")
    print(f"📋 SAMPLE — {sample['name']}")
    print(f"{'=' * 70}")
    print(f"  Location: {sample.get('location')}")
    print(f"  GMAT Avg: {sample.get('gmat_avg')}")
    print(f"  Acceptance: {sample.get('acceptance_rate')}%")
    print(f"  Admission Reqs: {json.dumps(sample.get('admission_requirements', {}), indent=4)[:300]}...")
    print(f"  Program Details: {json.dumps(sample.get('program_details', {}), indent=4)[:300]}...")
    print(f"  Unique Features: {sample.get('unique_features', [])[:3]}")
    print(f"  Placement Rate: {sample.get('placement_stats', {}).get('employment_rate_3_months')}")
    print(f"  App Questions: {sample.get('application_questions', [])[:2]}")
    print(f"  Deadlines: {sample.get('admission_deadlines', [])[:2]}")
    
    print(f"\n{'=' * 70}")
    print(f"📊 FINAL SUMMARY")
    print(f"   Schools:   {len(full_db)}")
    print(f"   Essays:    {len(essays)}")
    print(f"   Countries: {len(countries)}")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
