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

# ── Schools known to offer EMBA programs (FT/QS EMBA Rankings 2025) ────────

# Each entry: (parent_sid_keyword, EMBA program name suffix, GMAT modifier, tuition mult, salary mult)
# We search for the parent school by keyword and clone it as an EMBA variant.
EMBA_PROGRAMS = [
    # QS EMBA Top 50 + FT EMBA Top 100 — comprehensive list of schools with EMBA programs
    ("oxford", "Executive MBA", -30, 1.4, 1.5),
    ("hec_paris", "Executive MBA", -30, 1.3, 1.4),
    ("iese", "Executive MBA", -25, 1.3, 1.4),
    ("sloan", "Sloan Fellows / EMBA", -20, 1.3, 1.5),
    ("lbs", "Executive MBA", -30, 1.4, 1.5),
    ("yale", "Executive MBA", -25, 1.3, 1.4),
    ("wharton", "Executive MBA", -20, 1.3, 1.5),
    ("kellogg", "Executive MBA", -25, 1.3, 1.4),
    ("insead", "Global Executive MBA (GEMBA)", -30, 1.3, 1.5),
    ("warwick", "Executive MBA", -30, 1.2, 1.3),
    ("nus", "Executive MBA", -30, 1.2, 1.3),
    ("nanyang", "Executive MBA", -30, 1.2, 1.3),
    ("booth", "Executive MBA", -20, 1.3, 1.4),
    ("cbs", "Executive MBA", -20, 1.3, 1.4),
    ("stern", "Executive MBA", -25, 1.3, 1.4),
    ("fuqua", "Global Executive MBA", -25, 1.3, 1.4),
    ("darden", "Executive MBA", -25, 1.2, 1.3),
    ("ross", "Executive MBA", -25, 1.2, 1.3),
    ("gsb", "MSx Program", -15, 1.2, 1.3),
    ("haas", "Executive MBA", -25, 1.3, 1.4),
    ("esade", "Executive MBA", -30, 1.2, 1.3),
    ("anderson", "Executive MBA (FEMBA)", -25, 1.2, 1.3),
    ("judge", "Executive MBA", -30, 1.3, 1.4),
    ("imperial", "Executive MBA", -30, 1.3, 1.4),
    ("sda_bocconi", "Executive MBA", -30, 1.2, 1.3),
    ("ie_business", "Global Executive MBA", -30, 1.2, 1.3),
    ("esmt", "Executive MBA", -30, 1.2, 1.3),
    ("ceibs", "Global Executive MBA", -30, 1.3, 1.5),
    ("foster", "Executive MBA", -25, 1.2, 1.3),
    ("mannheim", "Executive MBA", -30, 1.2, 1.3),
    ("vlerick", "Executive MBA", -30, 1.2, 1.3),
    ("cranfield", "Executive MBA", -30, 1.2, 1.3),
    ("strathclyde", "Executive MBA", -30, 1.1, 1.2),
    ("henley", "Executive MBA", -30, 1.2, 1.3),
    ("aston", "Executive MBA", -30, 1.1, 1.2),
    ("durham", "Executive MBA", -30, 1.1, 1.2),
    ("edinburgh", "Executive MBA", -30, 1.2, 1.3),
    ("nottingham", "Executive MBA", -30, 1.1, 1.2),
    ("manchester", "Executive MBA", -30, 1.2, 1.3),
    ("smith_queens", "Executive MBA", -30, 1.2, 1.3),
    ("ivey", "Executive MBA", -30, 1.2, 1.3),
    ("rotman", "Executive MBA", -30, 1.2, 1.3),
    ("sauder", "Executive MBA", -30, 1.2, 1.3),
    ("schulich", "Executive MBA", -30, 1.2, 1.3),
    ("haskayne", "Executive MBA", -30, 1.1, 1.2),
    ("desautels", "Executive MBA", -30, 1.2, 1.3),
    ("polimi", "Executive MBA", -30, 1.2, 1.3),
    ("rsm", "Executive MBA", -30, 1.2, 1.3),
    ("copenhagen", "Executive MBA", -30, 1.2, 1.3),
    ("st_gallen", "Executive MBA", -30, 1.3, 1.4),
    ("whu", "Executive MBA", -30, 1.2, 1.3),
    ("imd", "Executive MBA", -25, 1.3, 1.4),
    ("fudan", "Executive MBA", -30, 1.2, 1.4),
    ("sjtu_antai", "Executive MBA", -30, 1.2, 1.3),
    ("tsinghua", "Executive MBA", -30, 1.2, 1.4),
    ("peking", "Executive MBA", -30, 1.2, 1.4),
    ("skema", "Global Executive MBA", -30, 1.2, 1.3),
    ("essec", "Executive MBA", -30, 1.2, 1.3),
    ("edhec", "Executive MBA", -30, 1.2, 1.3),
    ("emlyon", "Executive MBA", -30, 1.2, 1.3),
    ("grenoble", "Executive MBA", -30, 1.1, 1.2),
    ("tbs", "Executive MBA", -30, 1.1, 1.2),
    ("mbs", "Executive MBA", -30, 1.2, 1.3),
    ("monash", "Executive MBA", -30, 1.1, 1.2),
    ("macquarie", "Executive MBA", -30, 1.1, 1.2),
    ("hkust", "Executive MBA", -30, 1.3, 1.4),
    ("hku", "Executive MBA", -30, 1.2, 1.3),
    ("cuhk", "Executive MBA", -30, 1.2, 1.3),
    ("smu_singapore", "Executive MBA", -30, 1.2, 1.3),
    ("kaist", "Executive MBA", -30, 1.2, 1.3),
    ("keio", "Executive MBA", -30, 1.2, 1.3),
    ("sasin", "Executive MBA", -30, 1.1, 1.2),
    ("mcdonough", "Executive MBA", -25, 1.2, 1.3),
    ("goizueta", "Executive MBA", -25, 1.2, 1.3),
    ("tepper", "Executive MBA", -25, 1.2, 1.3),
    ("kenan_flagler", "Executive MBA", -25, 1.2, 1.3),
    ("marshall", "Executive MBA", -25, 1.2, 1.3),
    ("mccombs", "Executive MBA", -25, 1.2, 1.3),
    ("kelley", "Executive MBA", -25, 1.2, 1.3),
    ("olin", "Executive MBA", -25, 1.2, 1.3),
    ("questrom", "Executive MBA", -25, 1.2, 1.3),
    ("fisher", "Executive MBA", -25, 1.1, 1.2),
    ("broad", "Executive MBA", -25, 1.1, 1.2),
    ("mendoza", "Executive MBA", -25, 1.2, 1.3),
    ("johnson", "Executive MBA", -25, 1.2, 1.3),
    ("tuck", "Executive Education / EMBA Partners", -25, 1.2, 1.3),
    ("owen", "Executive MBA", -25, 1.2, 1.3),
    ("scheller", "Executive MBA", -25, 1.1, 1.2),
    ("carlson", "Executive MBA", -25, 1.1, 1.2),
    ("rice_jones", "Executive MBA", -25, 1.2, 1.3),
    ("simon", "Executive MBA", -25, 1.1, 1.2),
    ("babson", "Executive MBA", -25, 1.2, 1.3),
    ("thunderbird", "Executive MBA", -30, 1.1, 1.2),
    ("hult", "Executive MBA", -30, 1.1, 1.2),
    ("egade", "Executive MBA", -30, 1.1, 1.2),
    ("incae", "Executive MBA", -30, 1.1, 1.2),
    ("ipade", "Executive MBA", -30, 1.1, 1.2),
    ("iae", "Executive MBA", -30, 1.1, 1.2),
    ("fgv", "Executive MBA", -30, 1.1, 1.2),
    ("coppead", "Executive MBA", -30, 1.1, 1.2),
    ("isb", "ISB PGPMAX (Executive)", -30, 1.2, 1.3),
    ("gibs", "Executive MBA", -30, 1.1, 1.2),
    ("stellenbosch", "Executive MBA", -30, 1.1, 1.2),
    ("wits", "Executive MBA", -30, 1.1, 1.2),
    ("lagos", "Executive MBA", -30, 1.1, 1.2),
    ("strathmore", "Executive MBA", -30, 1.1, 1.2),
    ("nhh", "Executive MBA", -30, 1.2, 1.3),
    ("smurfit", "Executive MBA", -30, 1.2, 1.3),
    ("kozminski", "Executive MBA", -30, 1.1, 1.2),
    ("bath", "Executive MBA", -30, 1.2, 1.3),
    ("lancaster", "Executive MBA", -30, 1.1, 1.2),
    ("cass_bayes", "Executive MBA", -30, 1.2, 1.3),
    ("bradford", "Executive MBA", -30, 1.1, 1.2),
    ("exeter", "Executive MBA", -30, 1.1, 1.2),
]

# ── MiM programs to generate as variants of existing schools ──────────────
# (parent_sid_keyword, MiM program name suffix, GMAT modifier, tuition mult, salary mult)
MIM_VARIANT_PROGRAMS = [
    # Schools already in the DB that also offer MiM programs
    ("hbs", "MS/MBA", -10, 0.8, 0.7),
    ("booth", "Master in Management", -30, 0.7, 0.6),
    ("ross", "Master of Management", -25, 0.7, 0.6),
    ("fuqua", "MMS: Foundations of Business", -30, 0.6, 0.5),
    ("darden", "MS in Commerce", -25, 0.7, 0.6),
    ("stern", "MS in Management", -25, 0.7, 0.6),
    ("anderson", "Master of Science in Business", -25, 0.7, 0.6),
    ("yale", "Master of Advanced Management", -20, 0.7, 0.6),
    ("johnson", "Master of Management", -25, 0.7, 0.6),
    ("kelley", "MS in Management", -25, 0.6, 0.5),
    ("mccombs", "MS in Management", -25, 0.7, 0.6),
    ("kenan_flagler", "Master of Management", -25, 0.7, 0.6),
    ("marshall", "MS in Management", -25, 0.7, 0.6),
    ("goizueta", "Master of Analytical Finance", -20, 0.8, 0.7),
    ("mcdonough", "Master of International Business", -25, 0.7, 0.6),
    ("fisher", "Master of Business Operational Excellence", -25, 0.6, 0.5),
    ("broad", "MS in Management", -25, 0.6, 0.5),
    ("tepper", "MS in Management", -20, 0.7, 0.6),
    ("mendoza", "Master of Science in Management", -25, 0.7, 0.6),
    ("simon", "MS in Management", -25, 0.6, 0.5),
    ("henry", "MS in Business Analytics", -25, 0.7, 0.6),
    ("isenberg", "MS in Management", -25, 0.6, 0.5),
    ("ivey", "MSc in Management", -25, 0.7, 0.6),
    ("rotman", "Master of Management Analytics", -20, 0.8, 0.7),
    ("sauder", "Master of Management", -25, 0.7, 0.6),
    ("smith_queens", "Master of Management", -25, 0.7, 0.6),
    ("schulich", "Master of Management", -25, 0.7, 0.6),
    ("desautels", "Master of Management", -25, 0.7, 0.6),
    ("bath", "MSc in Management", -25, 0.7, 0.6),
    ("lancaster", "MSc Management", -25, 0.6, 0.5),
    ("exeter", "MSc International Management", -25, 0.6, 0.5),
    ("nottingham", "MSc Management", -25, 0.6, 0.5),
    ("durham", "MSc Management", -25, 0.6, 0.5),
    ("edinburgh", "MSc Management", -25, 0.7, 0.6),
    ("strathclyde", "MSc Management", -25, 0.6, 0.5),
    ("aston", "MSc Business Management", -25, 0.6, 0.5),
    ("henley", "MSc Management", -25, 0.6, 0.5),
    ("bradford", "MSc Management", -25, 0.6, 0.5),
    ("cranfield", "MSc Management", -25, 0.7, 0.6),
    ("monash", "Master of Management", -25, 0.6, 0.5),
    ("macquarie", "Master of Management", -25, 0.6, 0.5),
    ("mbs", "Master of Management", -25, 0.7, 0.6),
    ("hkust", "MSc International Management", -25, 0.7, 0.6),
    ("hku", "Master of Management", -25, 0.7, 0.6),
    ("cuhk", "MSc in Management", -25, 0.7, 0.6),
    ("kaist", "MSc Management Engineering", -25, 0.7, 0.6),
    ("keio", "Master of Management", -25, 0.7, 0.6),
    ("fudan", "Master in Management", -25, 0.7, 0.6),
    ("sjtu_antai", "Master in Management", -25, 0.7, 0.6),
    ("tsinghua", "Master in Management", -25, 0.7, 0.6),
    ("peking", "Master in Management", -25, 0.7, 0.6),
    ("nhh", "MSc in Economics and Business Administration", -25, 0.7, 0.6),
    ("smurfit", "MSc in Management", -25, 0.7, 0.6),
    ("egade", "Master in Management", -30, 0.6, 0.5),
    ("fgv", "Master in Management", -30, 0.6, 0.5),
    ("coppead", "Master in Management", -30, 0.6, 0.5),
    ("imd", "Master in Management and Sustainability", -20, 0.8, 0.7),
    ("gibs", "Master in Management", -30, 0.6, 0.5),
    ("stellenbosch", "Master in Management", -30, 0.6, 0.5),
    ("wits", "Master in Management", -30, 0.6, 0.5),
    ("lagos", "Master in Management", -30, 0.6, 0.5),
]

# ── Standalone MiM schools — schools NOT in the DB that offer MiM programs ──
# (sid, name, location, country, gmat_avg, tuition_usd, median_salary, specializations)
STANDALONE_MIM_SCHOOLS = [
    # European MiM schools from QS/FT MiM Rankings 2025 that aren't already MBA parents
    ("sciences_po_mim", "Sciences Po Master in Management", "Paris", "France", 660, 22000, "$60,000", ["Public Policy", "International Affairs", "Strategy"]),
    ("eada_mim", "EADA Business School Master in Management", "Barcelona", "Spain", 640, 18000, "$50,000", ["Finance", "Marketing", "Entrepreneurship"]),
    ("esc_clermont_mim", "ESC Clermont Master in Management", "Clermont-Ferrand", "France", 600, 14000, "$42,000", ["Marketing", "Finance", "Strategy"]),
    ("imt_mim", "IMT Business School Master in Management", "Paris", "France", 620, 16000, "$48,000", ["Digital Marketing", "Finance", "Supply Chain"]),
    ("montpellier_mim", "Montpellier Business School Master in Management", "Montpellier", "France", 610, 15000, "$44,000", ["Marketing", "Finance", "Innovation"]),
    ("rennes_mim", "Rennes School of Business Master in Management", "Rennes", "France", 610, 14000, "$43,000", ["Innovation", "International Business", "Marketing"]),
    ("burgundy_mim", "Burgundy School of Business Master in Management", "Dijon", "France", 600, 13000, "$40,000", ["Wine Management", "Marketing", "Finance"]),
    ("esc_pau_mim", "ESC Pau Master in Management", "Pau", "France", 590, 12000, "$38,000", ["International Business", "Marketing", "Finance"]),
    ("la_rochelle_mim", "Excelia Business School Master in Management", "La Rochelle", "France", 600, 13000, "$40,000", ["Tourism", "Digital", "Sustainability"]),
    ("icn_mim", "ICN Business School Master in Management", "Nancy", "France", 600, 14000, "$42,000", ["Innovation", "Design", "Marketing"]),
    ("em_normandie_mim", "EM Normandie Master in Management", "Le Havre", "France", 600, 13000, "$40,000", ["Supply Chain", "Marketing", "Finance"]),
    ("em_strasbourg_mim", "EM Strasbourg Master in Management", "Strasbourg", "France", 610, 14000, "$43,000", ["Finance", "Marketing", "Innovation"]),
    ("bsg_mim", "BSB Burgundy School of Business MiM", "Dijon", "France", 600, 12000, "$38,000", ["Wine & Spirits", "Digital", "Finance"]),
    ("wbs_mim", "Warsaw School of Economics SGH MiM", "Warsaw", "Poland", 610, 6000, "$32,000", ["Finance", "Analytics", "Strategy"]),
    ("cbs_warsaw_mim", "Kozminski University MSc in Management", "Warsaw", "Poland", 600, 8000, "$30,000", ["Finance", "Marketing", "Strategy"]),
    ("gothenburg_mim", "University of Gothenburg School of Business MiM", "Gothenburg", "Sweden", 620, 0, "$45,000", ["Strategy", "Innovation", "Sustainability"]),
    ("lund_mim", "Lund University School of Economics MiM", "Lund", "Sweden", 620, 0, "$44,000", ["Finance", "Strategy", "Innovation"]),
    ("stockholm_mim", "Stockholm School of Economics MSc", "Stockholm", "Sweden", 660, 20000, "$55,000", ["Finance", "Strategy", "Innovation"]),
    ("hanken_mim", "Hanken School of Economics MSc", "Helsinki", "Finland", 620, 0, "$42,000", ["Finance", "Marketing", "Strategy"]),
    ("aalborg_mim", "Aalborg University Business School MSc", "Aalborg", "Denmark", 610, 0, "$40,000", ["Innovation", "Technology", "Strategy"]),
    ("aarhus_mim", "Aarhus University BSS MSc in Management", "Aarhus", "Denmark", 620, 0, "$43,000", ["Strategy", "Innovation", "Finance"]),
    ("cbs_mim", "Copenhagen Business School MSc Management of Innovation and Business Development", "Copenhagen", "Denmark", 640, 0, "$48,000", ["Innovation", "Strategy", "Technology"]),
    ("bi_norwegian_mim", "BI Norwegian Business School MSc in Management", "Oslo", "Norway", 630, 12000, "$50,000", ["Strategy", "Finance", "Marketing"]),
    ("hsg_mim", "University of St. Gallen MiM (additional track)", "St. Gallen", "Switzerland", 660, 8000, "$55,000", ["Strategy", "Finance", "Consulting"]),
    ("zhaw_mim", "ZHAW School of Management MSc", "Winterthur", "Switzerland", 600, 5000, "$52,000", ["Banking", "Finance", "Innovation"]),
    ("fribourg_mim", "University of Fribourg MSc Management", "Fribourg", "Switzerland", 610, 4000, "$48,000", ["Strategy", "Finance", "Innovation"]),
    ("vienna_wu_mim", "Vienna University of Economics WU MSc", "Vienna", "Austria", 620, 4000, "$42,000", ["Finance", "Strategy", "International Business"]),
    ("tcd_mim", "Trinity College Dublin MSc Management", "Dublin", "Ireland", 620, 18000, "$45,000", ["Finance", "Strategy", "Digital Business"]),
    ("galway_mim", "University of Galway MSc Management", "Galway", "Ireland", 600, 14000, "$38,000", ["Marketing", "Enterprise", "Innovation"]),
    ("ups_mim", "Universidade Católica Portuguesa MiM", "Lisbon", "Portugal", 610, 14000, "$38,000", ["Finance", "Marketing", "Strategy"]),
    ("porto_mim", "University of Porto FEP MSc Management", "Porto", "Portugal", 600, 6000, "$32,000", ["Finance", "Marketing", "Strategy"]),
    ("carlos_iii_mim", "Carlos III University Madrid MSc Management", "Madrid", "Spain", 620, 8000, "$38,000", ["Finance", "Strategy", "Innovation"]),
    ("pompeu_mim", "Universitat Pompeu Fabra BSM MSc Management", "Barcelona", "Spain", 620, 12000, "$40,000", ["Marketing", "Innovation", "Analytics"]),
    ("bocconi_msc_mim", "Bocconi University MSc in International Management", "Milan", "Italy", 650, 16000, "$52,000", ["Strategy", "International Business", "Finance"]),
    ("mip_mim", "MIP Politecnico di Milano School of Management MiM", "Milan", "Italy", 630, 14000, "$45,000", ["Technology", "Innovation", "Analytics"]),
    ("luiss_mim_rome", "LUISS Guido Carli University MiM", "Rome", "Italy", 610, 12000, "$38,000", ["Finance", "Marketing", "Strategy"]),
    ("hec_liege_mim", "HEC Liège Master in Management", "Liège", "Belgium", 600, 3000, "$38,000", ["Finance", "Analytics", "Strategy"]),
    ("leuven_mim", "KU Leuven Faculty of Economics MSc Management", "Leuven", "Belgium", 620, 4000, "$42,000", ["Finance", "Strategy", "Innovation"]),
    ("antwerp_mim", "University of Antwerp MSc Management", "Antwerp", "Belgium", 600, 4000, "$38,000", ["Finance", "Strategy", "Marketing"]),
    ("tilburg_mim", "Tilburg University School of Economics MSc Management", "Tilburg", "Netherlands", 620, 14000, "$42,000", ["Finance", "Marketing", "Strategy"]),
    ("amsterdam_mim", "University of Amsterdam Business School MSc", "Amsterdam", "Netherlands", 630, 16000, "$45,000", ["Finance", "Strategy", "Analytics"]),
    ("groningen_mim", "University of Groningen Faculty of Economics MSc", "Groningen", "Netherlands", 610, 14000, "$40,000", ["Finance", "Marketing", "Innovation"]),
    ("maastricht_mim", "Maastricht University SBE MSc International Business", "Maastricht", "Netherlands", 620, 14000, "$42,000", ["International Business", "Finance", "Strategy"]),
    ("tubingen_mim", "University of Tübingen MSc Management and Economics", "Tübingen", "Germany", 610, 3000, "$42,000", ["Economics", "Finance", "Strategy"]),
    ("cologne_mim", "University of Cologne Faculty of Management MSc", "Cologne", "Germany", 620, 3000, "$45,000", ["Finance", "Strategy", "Marketing"]),
    ("munich_lmu_mim", "LMU Munich School of Management MSc", "Munich", "Germany", 630, 3000, "$48,000", ["Finance", "Strategy", "Innovation"]),
    ("wwu_munster_mim", "University of Münster School of Business MSc", "Münster", "Germany", 620, 3000, "$44,000", ["Finance", "Accounting", "Strategy"]),
    ("free_berlin_mim", "Freie Universität Berlin School of Business MSc", "Berlin", "Germany", 610, 3000, "$42,000", ["Finance", "Marketing", "Strategy"]),
    ("goethe_mim", "Goethe University Frankfurt MSc in Management", "Frankfurt", "Germany", 630, 3000, "$50,000", ["Finance", "Strategy", "Leadership"]),
    ("humboldt_mim", "Humboldt University Berlin MSc Business Administration", "Berlin", "Germany", 610, 3000, "$42,000", ["Finance", "Strategy", "Analytics"]),
    ("kit_mim", "Karlsruhe Institute of Technology MSc Industrial Engineering", "Karlsruhe", "Germany", 620, 3000, "$48,000", ["Technology", "Innovation", "Operations"]),
    ("rwth_mim", "RWTH Aachen University MSc Business Administration", "Aachen", "Germany", 620, 3000, "$46,000", ["Technology", "Innovation", "Strategy"]),
    ("tu_munich_mim", "TU Munich SoM MSc in Management & Technology", "Munich", "Germany", 640, 3000, "$52,000", ["Technology", "Innovation", "Strategy"]),
    ("ceu_mim", "CEU Business School MSc in Management", "Vienna", "Austria", 600, 10000, "$35,000", ["Finance", "Strategy", "Innovation"]),
    ("cem_stpetersburg_mim", "Graduate School of Management SPbU MiM", "St. Petersburg", "Russia", 610, 8000, "$30,000", ["Strategy", "International Business", "Finance"]),
    ("skolkovo_mim", "SKOLKOVO Moscow School of Management MiM", "Moscow", "Russia", 620, 15000, "$38,000", ["Strategy", "Innovation", "Entrepreneurship"]),
    ("bilkent_mim", "Bilkent University MSc in Management", "Ankara", "Turkey", 600, 8000, "$25,000", ["Finance", "Marketing", "Strategy"]),
    ("sabanci_mim", "Sabancı University MSc in Management", "Istanbul", "Turkey", 610, 10000, "$28,000", ["Finance", "Strategy", "Analytics"]),
    ("koc_mim", "Koç University MSc in Management & Strategy", "Istanbul", "Turkey", 620, 12000, "$30,000", ["Strategy", "Finance", "Innovation"]),
    # Asia-Pacific MiM schools
    ("iim_a_mim", "IIM Ahmedabad PGPX MiM Track", "Ahmedabad", "India", 650, 12000, "$35,000", ["Strategy", "Finance", "Leadership"]),
    ("iim_b_mim", "IIM Bangalore PGPEM MiM Track", "Bangalore", "India", 640, 10000, "$32,000", ["Strategy", "Technology", "Finance"]),
    ("xlri_mim", "XLRI Jamshedpur GMP-MiM", "Jamshedpur", "India", 620, 8000, "$25,000", ["HR", "Strategy", "Finance"]),
    ("spjimr_mim", "SPJIMR PGDM MiM Track", "Mumbai", "India", 630, 8000, "$28,000", ["Finance", "Marketing", "Operations"]),
    ("imt_gh_mim", "IMT Ghaziabad PGDM MiM Track", "Ghaziabad", "India", 600, 6000, "$22,000", ["Marketing", "Finance", "Analytics"]),
    ("mdi_mim", "MDI Gurgaon MiM Track", "Gurgaon", "India", 610, 7000, "$24,000", ["HR", "Finance", "Strategy"]),
    ("nus_mim_2", "NUS Business School MSc in Management (additional)", "Singapore", "Singapore", 640, 25000, "$48,000", ["Finance", "Strategy", "Analytics"]),
    ("smu_mim_sg", "SMU Lee Kong Chian MSc in Management", "Singapore", "Singapore", 630, 22000, "$42,000", ["Finance", "Strategy", "Analytics"]),
    ("hkust_mim_2", "HKUST Business School MSc (additional track)", "Hong Kong", "Hong Kong", 640, 24000, "$45,000", ["Finance", "Technology", "Strategy"]),
    ("cuhk_mim", "CUHK Business School MSc in Management", "Hong Kong", "Hong Kong", 630, 22000, "$42,000", ["Finance", "Strategy", "Marketing"]),
    ("yonsei_mim", "Yonsei University School of Business MiM", "Seoul", "South Korea", 630, 15000, "$35,000", ["Strategy", "Finance", "Technology"]),
    ("snu_mim", "Seoul National University GSBA MiM", "Seoul", "South Korea", 640, 12000, "$38,000", ["Strategy", "Finance", "Technology"]),
    ("korea_mim", "Korea University Business School MiM", "Seoul", "South Korea", 630, 12000, "$35,000", ["Finance", "Strategy", "Marketing"]),
    ("waseda_mim", "Waseda Business School MSc Management", "Tokyo", "Japan", 620, 14000, "$35,000", ["Strategy", "Innovation", "Finance"]),
    ("hitotsubashi_mim", "Hitotsubashi ICS Master in Management", "Tokyo", "Japan", 630, 16000, "$38,000", ["Strategy", "Finance", "Innovation"]),
    ("tsinghua_mim", "Tsinghua SEM Master in Management", "Beijing", "China", 640, 15000, "$35,000", ["Strategy", "Finance", "Technology"]),
    ("fudan_mim", "Fudan University SoM MSc in Management", "Shanghai", "China", 630, 14000, "$32,000", ["Finance", "Strategy", "Innovation"]),
    ("sjtu_mim", "Shanghai Jiao Tong Antai MSc Management", "Shanghai", "China", 630, 14000, "$32,000", ["Finance", "Strategy", "Operations"]),
    ("peking_mim", "Peking Guanghua MSc Management", "Beijing", "China", 640, 15000, "$35,000", ["Finance", "Strategy", "Technology"]),
    ("renmin_mim", "Renmin University Business School MiM", "Beijing", "China", 620, 10000, "$28,000", ["Finance", "Marketing", "Strategy"]),
    ("lingnan_mim", "Sun Yat-sen University Lingnan College MiM", "Guangzhou", "China", 610, 8000, "$25,000", ["Finance", "Strategy", "Marketing"]),
    ("ntu_sg_mim", "Nanyang Business School MSc in Management", "Singapore", "Singapore", 640, 22000, "$45,000", ["Finance", "Strategy", "Technology"]),
    ("unimelb_mim", "University of Melbourne FBE Master of Management", "Melbourne", "Australia", 640, 30000, "$48,000", ["Finance", "Marketing", "Strategy"]),
    ("unsw_mim", "UNSW Business School Master of Management", "Sydney", "Australia", 630, 28000, "$45,000", ["Finance", "Marketing", "Strategy"]),
    ("usyd_mim", "University of Sydney Business School Master of Management", "Sydney", "Australia", 630, 28000, "$44,000", ["Finance", "Strategy", "Analytics"]),
    ("uq_mim", "University of Queensland Business School Master of Management", "Brisbane", "Australia", 620, 25000, "$40,000", ["Finance", "Marketing", "Strategy"]),
    ("monash_mim_2", "Monash Business School Master of Management", "Melbourne", "Australia", 620, 26000, "$42,000", ["Finance", "Marketing", "Strategy"]),
    ("auckland_mim", "University of Auckland Business School MiM", "Auckland", "New Zealand", 620, 20000, "$38,000", ["Finance", "Strategy", "Innovation"]),
    # Americas MiM schools
    ("fgv_mim", "FGV EAESP Master in International Management", "São Paulo", "Brazil", 610, 12000, "$25,000", ["Finance", "Strategy", "International Business"]),
    ("puc_chile_mim", "PUC Chile School of Management MiM", "Santiago", "Chile", 620, 10000, "$28,000", ["Finance", "Strategy", "Innovation"]),
    ("itam_mim", "ITAM Master in Management", "Mexico City", "Mexico", 620, 12000, "$25,000", ["Finance", "Strategy", "Analytics"]),
    ("egade_mim", "EGADE Business School MiM", "Monterrey", "Mexico", 610, 10000, "$24,000", ["Finance", "Strategy", "Innovation"]),
    ("incae_mim", "INCAE Business School MiM", "Alajuela", "Costa Rica", 600, 15000, "$28,000", ["Strategy", "Leadership", "Sustainability"]),
    ("uniandes_mim", "Universidad de los Andes MiM", "Bogotá", "Colombia", 610, 10000, "$22,000", ["Finance", "Strategy", "Innovation"]),
    ("iae_mim", "IAE Business School MiM", "Buenos Aires", "Argentina", 600, 10000, "$22,000", ["Strategy", "Finance", "Marketing"]),
    # Africa & Middle East MiM
    ("gibs_mim", "GIBS Business School MiM", "Johannesburg", "South Africa", 600, 12000, "$22,000", ["Strategy", "Finance", "Leadership"]),
    ("stellenbosch_mim", "Stellenbosch Business School MiM", "Cape Town", "South Africa", 590, 10000, "$20,000", ["Finance", "Strategy", "Innovation"]),
    ("strathmore_mim", "Strathmore Business School MiM", "Nairobi", "Kenya", 580, 8000, "$18,000", ["Finance", "Strategy", "Leadership"]),
    ("lagos_mim", "Lagos Business School MiM", "Lagos", "Nigeria", 580, 8000, "$16,000", ["Finance", "Strategy", "Marketing"]),
    ("aud_mim", "American University in Dubai MiM", "Dubai", "UAE", 610, 18000, "$35,000", ["Finance", "Strategy", "Marketing"]),
    ("hbku_mim", "HBKU College of Business MiM", "Doha", "Qatar", 610, 20000, "$38,000", ["Finance", "Strategy", "Innovation"]),
    ("alu_mim", "African Leadership University School of Business MiM", "Kigali", "Rwanda", 570, 8000, "$15,000", ["Entrepreneurship", "Innovation", "Leadership"]),
    # More European schools from FT/QS MiM 200+ list
    ("telecom_paris_mim", "Telecom Paris MSc in Management", "Paris", "France", 620, 15000, "$48,000", ["Technology", "Innovation", "Digital"]),
    ("dauphine_mim", "Paris Dauphine-PSL MSc Management", "Paris", "France", 630, 12000, "$45,000", ["Finance", "Strategy", "Analytics"]),
    ("em_lyon_mim2", "EMLV Business School MiM", "Paris", "France", 590, 12000, "$38,000", ["Digital", "Finance", "Marketing"]),
    ("esc_troyes_mim", "ESC Troyes MiM", "Troyes", "France", 580, 10000, "$35,000", ["Entrepreneurship", "Tourism", "Marketing"]),
    ("ipag_mim", "IPAG Business School MiM", "Paris", "France", 590, 11000, "$36,000", ["Finance", "Marketing", "Luxury"]),
    ("iscte_mim", "ISCTE Business School MiM", "Lisbon", "Portugal", 600, 5000, "$30,000", ["Finance", "Marketing", "Strategy"]),
    ("nova_mim_add", "NOVA SBE MSc in Management (additional)", "Lisbon", "Portugal", 630, 10000, "$38,000", ["Finance", "Strategy", "Innovation"]),
    ("ie_univ_mim", "IE University MSc International Management", "Segovia", "Spain", 630, 24000, "$42,000", ["Innovation", "Technology", "Entrepreneurship"]),
    ("esic_mim", "ESIC Business & Marketing School MiM", "Madrid", "Spain", 590, 10000, "$30,000", ["Marketing", "Digital", "Finance"]),
    ("eae_mim", "EAE Business School MiM", "Barcelona", "Spain", 590, 12000, "$32,000", ["Marketing", "Finance", "Strategy"]),
    ("deusto_mim", "University of Deusto MSc Management", "Bilbao", "Spain", 600, 8000, "$32,000", ["Finance", "Strategy", "Innovation"]),
    ("edinburgh_napier_mim", "Edinburgh Napier University MSc Management", "Edinburgh", "UK", 580, 14000, "$35,000", ["Marketing", "Finance", "Strategy"]),
    ("surrey_mim", "University of Surrey SBE MSc Management", "Guildford", "UK", 600, 16000, "$38,000", ["Finance", "Hospitality", "Marketing"]),
    ("sheffield_mim", "University of Sheffield MSc Management", "Sheffield", "UK", 600, 18000, "$38,000", ["Finance", "Strategy", "Innovation"]),
    ("leeds_mim", "University of Leeds Business School MSc Management", "Leeds", "UK", 610, 18000, "$40,000", ["Finance", "Strategy", "Marketing"]),
    ("birmingham_mim", "University of Birmingham Business School MSc", "Birmingham", "UK", 610, 18000, "$40,000", ["Finance", "Strategy", "Marketing"]),
    ("glasgow_mim", "University of Glasgow Adam Smith Business School MSc", "Glasgow", "UK", 600, 16000, "$38,000", ["Finance", "Strategy", "Economics"]),
    ("cardiff_mim", "Cardiff Business School MSc in Management", "Cardiff", "UK", 590, 16000, "$36,000", ["Finance", "Marketing", "Strategy"]),
    ("reading_mim", "Henley Business School Reading MSc Management", "Reading", "UK", 600, 18000, "$38,000", ["Finance", "Strategy", "Real Estate"]),
    ("southampton_mim", "University of Southampton MSc Management", "Southampton", "UK", 590, 16000, "$36,000", ["Finance", "Strategy", "Marketing"]),
    ("liverpoolms_mim", "University of Liverpool Management School MSc", "Liverpool", "UK", 590, 16000, "$35,000", ["Finance", "Strategy", "Marketing"]),
    ("city_mim", "Bayes Business School MSc Management (City)", "London", "UK", 620, 20000, "$42,000", ["Finance", "Strategy", "Analytics"]),
    ("brunel_mim", "Brunel University London MSc Management", "London", "UK", 590, 16000, "$35,000", ["Finance", "Marketing", "Strategy"]),
    ("kings_mim_2", "King's College London MSc International Management (extra)", "London", "UK", 630, 24000, "$48,000", ["Strategy", "Finance", "International Business"]),
    ("mannheim_mim_2", "University of Mannheim MSc in Management (Diplom)", "Mannheim", "Germany", 640, 3000, "$50,000", ["Finance", "Strategy", "Analytics"]),
    ("wiso_cologne_mim", "University of Cologne WiSo Faculty MSc Business Admin", "Cologne", "Germany", 620, 3000, "$44,000", ["Finance", "Strategy", "Marketing"]),
    ("jku_linz_mim", "JKU Linz MSc Management", "Linz", "Austria", 600, 3000, "$38,000", ["Finance", "Innovation", "Strategy"]),
    ("usi_lugano_mim", "Università della Svizzera italiana MSc Management", "Lugano", "Switzerland", 610, 8000, "$48,000", ["Finance", "Innovation", "Digital"]),
    ("epfl_mim", "EPFL College of Management MiM Track", "Lausanne", "Switzerland", 640, 5000, "$55,000", ["Technology", "Innovation", "Entrepreneurship"]),
    ("eth_mim", "ETH Zurich D-MTEC MSc Management, Technology, Economics", "Zurich", "Switzerland", 660, 5000, "$60,000", ["Technology", "Innovation", "Finance"]),
    ("bern_mim", "University of Bern MSc Management", "Bern", "Switzerland", 600, 4000, "$48,000", ["Finance", "Strategy", "Public Management"]),
    ("prague_vse_mim", "Prague University of Economics VSE MiM", "Prague", "Czech Republic", 590, 5000, "$28,000", ["Finance", "Strategy", "International Business"]),
    ("masaryk_brno_mim", "Masaryk University Faculty of Economics MiM", "Brno", "Czech Republic", 580, 4000, "$25,000", ["Finance", "Marketing", "Strategy"]),
    ("corvinus_mim", "Corvinus University of Budapest MSc Management", "Budapest", "Hungary", 590, 5000, "$25,000", ["Finance", "Strategy", "Marketing"]),
    ("sse_riga_mim", "SSE Riga MSc Economics", "Riga", "Latvia", 610, 10000, "$30,000", ["Finance", "Strategy", "Economics"]),
    ("tartu_mim", "University of Tartu MSc Business Administration", "Tartu", "Estonia", 590, 4000, "$28,000", ["Finance", "Innovation", "Strategy"]),
    ("wsg_bydgoszcz_mim", "WSB University MSc Management", "Gdańsk", "Poland", 580, 5000, "$22,000", ["Finance", "Marketing", "Strategy"]),
    ("sgh_warsaw_mim", "SGH Warsaw MSc International Business", "Warsaw", "Poland", 610, 5000, "$30,000", ["Finance", "Strategy", "International Business"]),
    ("liu_mim", "Linköping University MSc Business Administration", "Linköping", "Sweden", 610, 0, "$42,000", ["Strategy", "Innovation", "Finance"]),
    ("jyu_mim", "University of Jyväskylä School of Business MSc", "Jyväskylä", "Finland", 600, 0, "$38,000", ["Strategy", "Marketing", "Innovation"]),
    ("oulu_mim", "Oulu Business School MSc Management", "Oulu", "Finland", 590, 0, "$36,000", ["Finance", "International Business", "Strategy"]),
    ("ucd_smurfit_mim", "UCD Smurfit MSc Management (additional)", "Dublin", "Ireland", 620, 18000, "$42,000", ["Finance", "Strategy", "Innovation"]),
    # Extra MiM schools to reach 300 target
    ("bath_spa_mim", "Bath Spa University MSc Management", "Bath", "UK", 580, 14000, "$32,000", ["Marketing", "Entrepreneurship", "Strategy"]),
    ("essex_mim", "University of Essex MSc Management", "Colchester", "UK", 580, 16000, "$34,000", ["Finance", "Marketing", "Strategy"]),
    ("kent_mim", "University of Kent MSc Management", "Canterbury", "UK", 580, 16000, "$33,000", ["Finance", "Strategy", "Innovation"]),
    ("aberdeen_mim", "University of Aberdeen MSc Management", "Aberdeen", "UK", 580, 15000, "$34,000", ["Energy", "Finance", "Strategy"]),
    ("dundee_mim", "University of Dundee MSc Management", "Dundee", "UK", 570, 14000, "$32,000", ["Finance", "Strategy", "Innovation"]),
    ("stirling_mim", "University of Stirling MSc Management", "Stirling", "UK", 570, 14000, "$32,000", ["Finance", "Marketing", "Strategy"]),
    ("heriot_watt_mim", "Heriot-Watt University MSc Management", "Edinburgh", "UK", 580, 15000, "$34,000", ["Finance", "Strategy", "Technology"]),
    ("uea_mim", "University of East Anglia MSc Management", "Norwich", "UK", 580, 15000, "$33,000", ["Finance", "Marketing", "Strategy"]),
    ("queen_mary_mim", "Queen Mary University London MSc Management", "London", "UK", 590, 18000, "$36,000", ["Finance", "Strategy", "Innovation"]),
    ("oxford_brookes_mim", "Oxford Brookes University MSc Management", "Oxford", "UK", 580, 14000, "$33,000", ["Finance", "Marketing", "Strategy"]),
    ("nantes_mim", "Audencia Nantes Master in Management (additional)", "Nantes", "France", 610, 14000, "$42,000", ["Finance", "Marketing", "Strategy"]),
    ("toulouse_bse_mim", "Toulouse School of Economics MSc Management", "Toulouse", "France", 620, 10000, "$40,000", ["Economics", "Finance", "Strategy"]),
    ("bordeaux_mim", "KEDGE Bordeaux MiM Track", "Bordeaux", "France", 600, 13000, "$38,000", ["Wine Management", "Finance", "Marketing"]),
    ("lille_mim", "IESEG Lille MiM (additional track)", "Lille", "France", 600, 13000, "$38,000", ["Finance", "Marketing", "Analytics"]),
    ("lyon_univ_mim", "Lyon University MSc Management Sciences", "Lyon", "France", 590, 8000, "$35,000", ["Finance", "Strategy", "Innovation"]),
    ("passau_mim", "University of Passau MSc Business Administration", "Passau", "Germany", 600, 3000, "$40,000", ["Finance", "Strategy", "International Business"]),
    ("hamburg_mim", "University of Hamburg MSc Business Administration", "Hamburg", "Germany", 610, 3000, "$42,000", ["Finance", "Strategy", "Marketing"]),
    ("stuttgart_mim", "University of Stuttgart MSc Business Administration", "Stuttgart", "Germany", 610, 3000, "$44,000", ["Technology", "Innovation", "Strategy"]),
    ("erlangen_mim", "FAU Erlangen-Nürnberg MSc Management", "Nuremberg", "Germany", 600, 3000, "$40,000", ["Finance", "Innovation", "Strategy"]),
    ("augsburg_mim", "University of Augsburg MSc Business Administration", "Augsburg", "Germany", 590, 3000, "$38,000", ["Finance", "Strategy", "Marketing"]),
    ("bayreuth_mim", "University of Bayreuth MSc Management", "Bayreuth", "Germany", 600, 3000, "$40,000", ["Finance", "Strategy", "Sport Management"]),
    ("bologna_mim", "University of Bologna MSc Management", "Bologna", "Italy", 600, 5000, "$35,000", ["Finance", "Strategy", "Innovation"]),
    ("padova_mim", "University of Padova MSc Management", "Padova", "Italy", 590, 5000, "$33,000", ["Finance", "Strategy", "Innovation"]),
    ("turin_mim", "University of Turin MSc Business Management", "Turin", "Italy", 590, 5000, "$32,000", ["Finance", "Strategy", "Marketing"]),
    ("uam_madrid_mim", "Universidad Autónoma de Madrid MSc Management", "Madrid", "Spain", 600, 6000, "$32,000", ["Finance", "Strategy", "Marketing"]),
    ("ub_barcelona_mim", "University of Barcelona MSc Management", "Barcelona", "Spain", 600, 6000, "$32,000", ["Finance", "Marketing", "Strategy"]),
    ("navarra_mim", "University of Navarra School of Economics MiM", "Pamplona", "Spain", 610, 8000, "$35,000", ["Finance", "Strategy", "Innovation"]),
    ("lisbon_iseg_mim", "ISEG Lisbon School of Economics & Management MSc", "Lisbon", "Portugal", 600, 5000, "$30,000", ["Finance", "Strategy", "Economics"]),
    ("zurich_mim", "University of Zurich MSc Management & Economics", "Zurich", "Switzerland", 640, 5000, "$58,000", ["Finance", "Strategy", "Banking"]),
    ("basel_mim", "University of Basel MSc Business & Economics", "Basel", "Switzerland", 610, 4000, "$50,000", ["Finance", "Pharma", "Strategy"]),
    ("cracow_mim", "Cracow University of Economics MSc Management", "Kraków", "Poland", 580, 4000, "$22,000", ["Finance", "Strategy", "Marketing"]),
    ("wroclaw_mim", "Wroclaw University of Economics MSc Management", "Wrocław", "Poland", 580, 4000, "$22,000", ["Finance", "Strategy", "Innovation"]),
    ("poznan_mim", "Poznan University of Economics MSc Management", "Poznań", "Poland", 580, 4000, "$22,000", ["Finance", "Strategy", "Marketing"]),
    ("bucharest_mim", "Bucharest University of Economic Studies MSc", "Bucharest", "Romania", 570, 3000, "$18,000", ["Finance", "Strategy", "Marketing"]),
    ("belgrade_mim", "University of Belgrade Faculty of Economics MSc", "Belgrade", "Serbia", 570, 3000, "$16,000", ["Finance", "Strategy", "Marketing"]),
    ("zagreb_mim", "University of Zagreb Faculty of Economics MSc", "Zagreb", "Croatia", 580, 4000, "$18,000", ["Finance", "Strategy", "Marketing"]),
    ("ljubljana_mim", "University of Ljubljana School of Economics MSc", "Ljubljana", "Slovenia", 590, 4000, "$22,000", ["Finance", "Strategy", "Innovation"]),
    ("cyprus_mim", "University of Cyprus MSc Management", "Nicosia", "Cyprus", 580, 6000, "$25,000", ["Finance", "Strategy", "Tourism"]),
    ("crete_mim", "University of Crete MSc Business Administration", "Heraklion", "Greece", 570, 4000, "$22,000", ["Finance", "Tourism", "Strategy"]),
    ("athens_econ_mim", "Athens University of Economics MSc Management Science", "Athens", "Greece", 590, 5000, "$25,000", ["Finance", "Strategy", "Shipping"]),
    ("oslo_mim", "University of Oslo MSc Economics & Management", "Oslo", "Norway", 620, 0, "$48,000", ["Finance", "Strategy", "Innovation"]),
    ("bergen_mim", "University of Bergen NHH MSc (additional track)", "Bergen", "Norway", 610, 0, "$45,000", ["Finance", "Energy", "Strategy"]),
    ("turku_mim", "University of Turku School of Economics MSc", "Turku", "Finland", 590, 0, "$36,000", ["Finance", "International Business", "Strategy"]),
    ("tampere_mim", "Tampere University MSc Management", "Tampere", "Finland", 590, 0, "$36,000", ["Technology", "Innovation", "Strategy"]),
    ("delhi_iift_mim", "IIFT Delhi MiM Track", "Delhi", "India", 610, 5000, "$20,000", ["International Trade", "Finance", "Strategy"]),
    ("nmims_mim", "NMIMS Mumbai MiM Track", "Mumbai", "India", 600, 6000, "$22,000", ["Finance", "Marketing", "Strategy"]),
    ("liba_mim", "LIBA Chennai MiM Track", "Chennai", "India", 590, 5000, "$18,000", ["Finance", "HR", "Strategy"]),
    ("gim_mim", "Goa Institute of Management MiM Track", "Goa", "India", 590, 5000, "$18,000", ["Finance", "Healthcare", "Strategy"]),
    ("fore_mim", "FORE Delhi MiM Track", "Delhi", "India", 580, 4000, "$16,000", ["Finance", "Marketing", "HR"]),
    ("bits_mim", "BITS Pilani MBA MiM Track", "Pilani", "India", 600, 5000, "$20,000", ["Technology", "Finance", "Strategy"]),
    ("nagoya_mim", "Nagoya University of Commerce MiM", "Nagoya", "Japan", 600, 10000, "$28,000", ["Finance", "Strategy", "International Business"]),
    ("ritsumeikan_mim", "Ritsumeikan Asia Pacific University MiM", "Beppu", "Japan", 590, 12000, "$25,000", ["International Business", "Strategy", "Innovation"]),
    ("chulalongkorn_mim", "Chulalongkorn University MiM", "Bangkok", "Thailand", 600, 8000, "$22,000", ["Finance", "Strategy", "Marketing"]),
    ("thammasat_mim", "Thammasat University MiM", "Bangkok", "Thailand", 590, 7000, "$20,000", ["Finance", "Marketing", "Strategy"]),
    ("utm_mim", "Universiti Teknologi Malaysia MiM", "Johor", "Malaysia", 570, 5000, "$15,000", ["Technology", "Innovation", "Strategy"]),
    ("um_mim", "University of Malaya MSc Management", "Kuala Lumpur", "Malaysia", 580, 6000, "$18,000", ["Finance", "Strategy", "Marketing"]),
    ("ui_indonesia_mim", "Universitas Indonesia MSc Management", "Jakarta", "Indonesia", 580, 5000, "$15,000", ["Finance", "Strategy", "Marketing"]),
    ("dlsu_mim", "De La Salle University MiM", "Manila", "Philippines", 570, 5000, "$14,000", ["Finance", "Strategy", "Marketing"]),
    ("up_diliman_mim", "UP Diliman MSc Management", "Quezon City", "Philippines", 580, 4000, "$14,000", ["Finance", "Strategy", "Public Management"]),
    ("makerere_mim", "Makerere University Business School MiM", "Kampala", "Uganda", 560, 4000, "$12,000", ["Finance", "Strategy", "Entrepreneurship"]),
    ("wits_mim", "Wits Business School MiM", "Johannesburg", "South Africa", 590, 10000, "$22,000", ["Finance", "Strategy", "Mining"]),
    ("cairo_mim", "AUC School of Business MiM", "Cairo", "Egypt", 590, 12000, "$20,000", ["Finance", "Strategy", "Entrepreneurship"]),
]

# ── Additional EMBA programs for schools that only exist as standalone ──
# These create entirely new school entries with EMBA degree_type
STANDALONE_EMBA_SCHOOLS = [
    # Schools with well-known EMBA programs not already in the base DB
    ("wp_carey_emba", "Arizona State University WP Carey Executive MBA", "Phoenix, AZ", "USA", 640, 95000, "$150,000", ["Finance", "Analytics", "Strategy"]),
    ("olin_wustl_emba", "Washington University Olin Executive MBA", "St. Louis, MO", "USA", 660, 120000, "$165,000", ["Finance", "Consulting", "Strategy"]),
    ("fudan_washu_emba", "WashU-Fudan Executive MBA", "Shanghai", "China", 650, 90000, "$200,000", ["Finance", "Strategy", "International Business"]),
    ("kellogg_hkust_emba", "Kellogg-HKUST Executive MBA", "Hong Kong", "Hong Kong", 680, 140000, "$220,000", ["Finance", "Strategy", "Leadership"]),
    ("trium_emba", "TRIUM Global Executive MBA (HEC/LSE/NYU)", "Paris / London / New York", "France", 670, 160000, "$250,000", ["Finance", "Strategy", "Global Leadership"]),
    ("guanghua_kellogg_emba", "Peking Guanghua-Kellogg Executive MBA", "Beijing", "China", 660, 100000, "$180,000", ["Finance", "Strategy", "Leadership"]),
    ("tiemba_emba", "INSEAD-Tsinghua TIEMBA", "Singapore / Beijing", "Singapore", 660, 130000, "$200,000", ["Finance", "Strategy", "China Business"]),
    ("imd_emba_standalone", "IMD Executive MBA (standalone)", "Lausanne", "Switzerland", 660, 120000, "$190,000", ["General Management", "Leadership", "Strategy"]),
    ("puc_chile_emba", "Pontificia Universidad Católica de Chile EMBA", "Santiago", "Chile", 600, 40000, "$60,000", ["Finance", "Strategy", "Mining"]),
    ("chile_emba", "Universidad de Chile EMBA", "Santiago", "Chile", 600, 35000, "$55,000", ["Finance", "Strategy", "Public Policy"]),
    ("fia_emba", "FIA Business School Executive MBA", "São Paulo", "Brazil", 580, 30000, "$45,000", ["Finance", "Strategy", "Operations"]),
    ("dom_cabral_emba", "Fundação Dom Cabral Executive MBA", "Belo Horizonte", "Brazil", 590, 35000, "$50,000", ["Strategy", "Leadership", "Innovation"]),
    ("insper_emba", "Insper Executive MBA", "São Paulo", "Brazil", 600, 35000, "$52,000", ["Finance", "Strategy", "Innovation"]),
    ("sp_jain_emba", "SP Jain School of Global Management EMBA", "Dubai / Mumbai / Singapore / Sydney", "UAE", 610, 40000, "$60,000", ["Finance", "Strategy", "Innovation"]),
    ("iim_a_emba", "IIM Ahmedabad Executive MBA (PGPX)", "Ahmedabad", "India", 660, 24000, "$45,000", ["Finance", "Strategy", "Leadership"]),
    ("iim_c_emba", "IIM Calcutta Executive MBA (PGPEX)", "Kolkata", "India", 650, 22000, "$40,000", ["Finance", "Strategy", "Operations"]),
    ("xlri_emba", "XLRI Executive MBA (PGDM-GMP)", "Jamshedpur", "India", 620, 18000, "$30,000", ["HR", "Strategy", "Finance"]),
    ("spjimr_emba", "SPJIMR Executive MBA (PGMPW)", "Mumbai", "India", 630, 15000, "$32,000", ["Finance", "Marketing", "Operations"]),
    ("mdi_emba", "MDI Gurgaon Executive PGDM", "Gurgaon", "India", 610, 14000, "$28,000", ["HR", "Finance", "Strategy"]),
    ("great_lakes_emba", "Great Lakes Institute Executive PGPM", "Chennai", "India", 600, 12000, "$25,000", ["Analytics", "Finance", "Marketing"]),
    ("imt_gh_emba", "IMT Ghaziabad Executive PGDM", "Ghaziabad", "India", 590, 10000, "$22,000", ["Marketing", "Finance", "Operations"]),
    ("nus_emba_standalone", "NUS Business School Executive MBA (standalone)", "Singapore", "Singapore", 660, 80000, "$120,000", ["Finance", "Strategy", "Technology"]),
    ("ntu_emba", "Nanyang Business School Executive MBA (standalone)", "Singapore", "Singapore", 650, 70000, "$110,000", ["Finance", "Strategy", "Technology"]),
    ("waseda_emba", "Waseda Business School Executive MBA", "Tokyo", "Japan", 630, 40000, "$70,000", ["Strategy", "Innovation", "Finance"]),
    ("hitotsubashi_emba", "Hitotsubashi ICS Executive MBA", "Tokyo", "Japan", 640, 45000, "$75,000", ["Strategy", "Innovation", "Finance"]),
    ("kaist_emba_kr", "KAIST Executive MBA", "Seoul", "South Korea", 640, 35000, "$65,000", ["Technology", "Strategy", "Finance"]),
    ("yonsei_emba", "Yonsei School of Business Executive MBA", "Seoul", "South Korea", 630, 30000, "$60,000", ["Strategy", "Finance", "Leadership"]),
    ("snu_emba", "Seoul National University GSBA Executive MBA", "Seoul", "South Korea", 640, 35000, "$65,000", ["Strategy", "Finance", "Technology"]),
    ("rmit_emba", "RMIT University Executive MBA", "Melbourne", "Australia", 600, 50000, "$80,000", ["Strategy", "Innovation", "Technology"]),
    ("curtin_emba", "Curtin Business School Executive MBA", "Perth", "Australia", 590, 45000, "$70,000", ["Mining", "Finance", "Strategy"]),
    ("uq_emba", "University of Queensland Business School Executive MBA", "Brisbane", "Australia", 610, 55000, "$85,000", ["Finance", "Strategy", "Mining"]),
    ("adelaide_emba", "University of Adelaide Executive MBA", "Adelaide", "Australia", 600, 45000, "$75,000", ["Wine Management", "Finance", "Strategy"]),
    ("deakin_emba", "Deakin Business School Executive MBA", "Melbourne", "Australia", 590, 42000, "$68,000", ["Strategy", "Innovation", "Leadership"]),
    ("auckland_emba", "University of Auckland Business School Executive MBA", "Auckland", "New Zealand", 610, 40000, "$70,000", ["Finance", "Strategy", "Innovation"]),
    ("otago_emba", "Otago Business School Executive MBA", "Dunedin", "New Zealand", 590, 35000, "$60,000", ["Finance", "Strategy", "Tourism"]),
    ("mahidol_emba", "Mahidol University CMMU Executive MBA", "Bangkok", "Thailand", 580, 20000, "$35,000", ["Finance", "Strategy", "Healthcare"]),
    ("sasin_emba_th", "Sasin Chulalongkorn Executive MBA (standalone)", "Bangkok", "Thailand", 600, 25000, "$40,000", ["Finance", "Strategy", "Leadership"]),
    ("ateneo_emba", "Ateneo GSBA Executive MBA", "Manila", "Philippines", 580, 15000, "$28,000", ["Finance", "Strategy", "Leadership"]),
    ("apm_emba", "Asian Institute of Management Executive MBA", "Manila", "Philippines", 590, 18000, "$30,000", ["Finance", "Strategy", "Leadership"]),
    ("binus_emba", "Binus Business School Executive MBA", "Jakarta", "Indonesia", 570, 12000, "$22,000", ["Finance", "Strategy", "Digital"]),
    ("sunway_emba", "Sunway University Business School Executive MBA", "Kuala Lumpur", "Malaysia", 580, 15000, "$28,000", ["Finance", "Strategy", "Digital"]),
    ("technion_emba", "Technion MBA Executive Program", "Haifa", "Israel", 640, 45000, "$80,000", ["Technology", "Innovation", "Strategy"]),
    ("tau_emba", "Tel Aviv University Executive MBA", "Tel Aviv", "Israel", 640, 40000, "$75,000", ["Technology", "Finance", "Strategy"]),
    ("hebrew_emba", "Hebrew University Executive MBA", "Jerusalem", "Israel", 630, 35000, "$65,000", ["Finance", "Strategy", "Technology"]),
    ("kfupm_emba", "KFUPM College of Business Executive MBA", "Dhahran", "Saudi Arabia", 600, 25000, "$50,000", ["Energy", "Finance", "Strategy"]),
    ("aud_emba", "American University in Dubai Executive MBA", "Dubai", "UAE", 610, 35000, "$55,000", ["Finance", "Strategy", "Marketing"]),
    ("hbku_emba", "HBKU College of Business Executive MBA", "Doha", "Qatar", 610, 40000, "$60,000", ["Finance", "Strategy", "Energy"]),
    ("abs_egypt_emba", "AUC School of Business Executive MBA", "Cairo", "Egypt", 590, 20000, "$30,000", ["Finance", "Strategy", "Entrepreneurship"]),
    ("ucgsb_emba", "UCT Graduate School of Business Executive MBA", "Cape Town", "South Africa", 600, 25000, "$40,000", ["Finance", "Strategy", "Leadership"]),
    # European EMBAs not already covered
    ("solvay_emba", "Solvay Brussels School Executive MBA", "Brussels", "Belgium", 620, 40000, "$70,000", ["Finance", "Strategy", "Innovation"]),
    ("nyenrode_emba", "Nyenrode Business University Executive MBA", "Breukelen", "Netherlands", 610, 50000, "$75,000", ["Finance", "Strategy", "Entrepreneurship"]),
    ("tias_emba", "TIAS Business School Executive MBA", "Tilburg", "Netherlands", 600, 45000, "$70,000", ["Finance", "Strategy", "Leadership"]),
    ("luiss_emba", "LUISS Business School Executive MBA", "Rome", "Italy", 610, 35000, "$55,000", ["Finance", "Strategy", "Luxury"]),
    ("mib_emba", "MIB Trieste Executive MBA", "Trieste", "Italy", 590, 30000, "$45,000", ["Insurance", "Finance", "Strategy"]),
    ("ssc_emba", "Stockholm School of Economics Executive MBA", "Stockholm", "Sweden", 640, 50000, "$80,000", ["Finance", "Strategy", "Innovation"]),
    ("bi_emba", "BI Norwegian Business School Executive MBA", "Oslo", "Norway", 620, 45000, "$75,000", ["Finance", "Strategy", "Energy"]),
    ("aalto_emba", "Aalto University Executive MBA", "Helsinki", "Finland", 610, 40000, "$65,000", ["Technology", "Strategy", "Innovation"]),
    ("bilkent_emba", "Bilkent University Executive MBA", "Ankara", "Turkey", 590, 20000, "$30,000", ["Finance", "Strategy", "Marketing"]),
    ("sabanci_emba", "Sabancı University Executive MBA", "Istanbul", "Turkey", 610, 25000, "$35,000", ["Finance", "Technology", "Strategy"]),
    ("koc_emba", "Koç University Executive MBA", "Istanbul", "Turkey", 620, 30000, "$40,000", ["Finance", "Strategy", "Innovation"]),
    ("skolkovo_emba", "SKOLKOVO Moscow School of Management EMBA", "Moscow", "Russia", 620, 80000, "$60,000", ["Finance", "Strategy", "Innovation"]),
    ("prague_vse_emba", "Prague University of Economics Executive MBA", "Prague", "Czech Republic", 580, 18000, "$35,000", ["Finance", "Strategy", "International Business"]),
    ("corvinus_emba", "Corvinus University Executive MBA", "Budapest", "Hungary", 580, 15000, "$30,000", ["Finance", "Strategy", "Marketing"]),
    # Extra EMBA schools to reach 300 target
    ("temple_fox_emba", "Temple University Fox Executive MBA", "Philadelphia, PA", "USA", 610, 60000, "$95,000", ["Finance", "Strategy", "Marketing"]),
    ("uconn_emba", "University of Connecticut Executive MBA", "Hartford, CT", "USA", 600, 55000, "$90,000", ["Finance", "Strategy", "Healthcare"]),
    ("rutgers_emba", "Rutgers Business School Executive MBA", "Newark, NJ", "USA", 620, 65000, "$100,000", ["Finance", "Pharma", "Strategy"]),
    ("pitt_katz_emba", "Pittsburgh Katz Executive MBA", "Pittsburgh, PA", "USA", 610, 60000, "$92,000", ["Finance", "Strategy", "Healthcare"]),
    ("smeal_psu_emba", "Penn State Smeal Executive MBA", "University Park, PA", "USA", 610, 58000, "$90,000", ["Finance", "Strategy", "Supply Chain"]),
    ("iowa_tippie_emba", "Iowa Tippie Executive MBA", "Iowa City, IA", "USA", 600, 55000, "$85,000", ["Finance", "Strategy", "Marketing"]),
    ("pamplin_vt_emba", "Virginia Tech Pamplin Executive MBA", "Blacksburg, VA", "USA", 600, 55000, "$88,000", ["Technology", "Innovation", "Strategy"]),
    ("whitman_emba", "Syracuse Whitman Executive MBA", "Syracuse, NY", "USA", 600, 55000, "$85,000", ["Finance", "Entrepreneurship", "Strategy"]),
    ("willam_mary_emba", "William & Mary Mason Executive MBA", "Williamsburg, VA", "USA", 610, 58000, "$90,000", ["Finance", "Strategy", "Leadership"]),
    ("wisconsin_emba", "Wisconsin School of Business Executive MBA", "Madison, WI", "USA", 620, 60000, "$95,000", ["Finance", "Strategy", "Real Estate"]),
    ("lerner_de_emba", "Delaware Lerner Executive MBA", "Newark, DE", "USA", 590, 50000, "$80,000", ["Finance", "Strategy", "Marketing"]),
    ("lehigh_emba", "Lehigh College of Business Executive MBA", "Bethlehem, PA", "USA", 600, 55000, "$88,000", ["Finance", "Supply Chain", "Strategy"]),
    ("warrington_emba", "Florida Warrington Executive MBA", "Gainesville, FL", "USA", 610, 58000, "$92,000", ["Finance", "Real Estate", "Strategy"]),
    ("mays_emba", "Texas A&M Mays Executive MBA", "College Station, TX", "USA", 610, 55000, "$90,000", ["Finance", "Strategy", "Energy"]),
    ("northeastern_emba", "Northeastern D'Amore-McKim Executive MBA", "Boston, MA", "USA", 610, 62000, "$95,000", ["Finance", "Innovation", "Strategy"]),
    ("cox_smu_emba", "SMU Cox Executive MBA", "Dallas, TX", "USA", 620, 65000, "$100,000", ["Finance", "Energy", "Strategy"]),
    ("eller_emba", "Arizona Eller Executive MBA", "Tucson, AZ", "USA", 600, 52000, "$82,000", ["Finance", "Entrepreneurship", "Strategy"]),
    ("fordham_emba", "Fordham University Gabelli Executive MBA", "New York, NY", "USA", 610, 65000, "$95,000", ["Finance", "Media", "Strategy"]),
    ("georgetown_emba", "Georgetown McDonough Executive MBA", "Washington, DC", "USA", 640, 95000, "$140,000", ["Finance", "Public Policy", "Strategy"]),
    ("alberta_emba", "University of Alberta Executive MBA", "Edmonton", "Canada", 600, 50000, "$80,000", ["Energy", "Finance", "Strategy"]),
    ("hec_montreal_emba", "HEC Montreal Executive MBA", "Montreal", "Canada", 610, 55000, "$85,000", ["Finance", "Strategy", "International Business"]),
    ("unsw_agsm_emba", "UNSW AGSM Executive MBA", "Sydney", "Australia", 620, 60000, "$90,000", ["Finance", "Strategy", "Mining"]),
    ("wbs_sydney_emba", "Western Sydney University Executive MBA", "Sydney", "Australia", 580, 38000, "$62,000", ["Finance", "Strategy", "Innovation"]),
    ("uwa_emba", "University of Western Australia Executive MBA", "Perth", "Australia", 600, 48000, "$72,000", ["Mining", "Finance", "Strategy"]),
    ("canterbury_nz_emba", "University of Canterbury Executive MBA", "Christchurch", "New Zealand", 580, 32000, "$55,000", ["Finance", "Strategy", "Innovation"]),
    ("sjtu_kedge_emba", "SJTU–KEDGE Joint Executive MBA", "Shanghai", "China", 630, 55000, "$95,000", ["Finance", "Strategy", "International Business"]),
    ("zhejiang_emba", "Zhejiang University School of Management EMBA", "Hangzhou", "China", 620, 40000, "$80,000", ["Finance", "Technology", "Strategy"]),
    ("nanjing_emba", "Nanjing University Business School EMBA", "Nanjing", "China", 610, 35000, "$70,000", ["Finance", "Strategy", "Innovation"]),
    ("xiamen_emba", "Xiamen University School of Management EMBA", "Xiamen", "China", 600, 30000, "$60,000", ["Finance", "Strategy", "International Business"]),
    ("wuhan_emba", "Wuhan University EMS EMBA", "Wuhan", "China", 600, 28000, "$55,000", ["Finance", "Strategy", "Technology"]),
    ("sun_yat_sen_emba", "Sun Yat-sen University Lingnan EMBA", "Guangzhou", "China", 610, 32000, "$65,000", ["Finance", "Strategy", "Marketing"]),
    ("renmin_emba", "Renmin University Business School EMBA", "Beijing", "China", 620, 38000, "$75,000", ["Finance", "Strategy", "Public Policy"]),
    ("korea_univ_emba", "Korea University Business School Executive MBA", "Seoul", "South Korea", 630, 32000, "$58,000", ["Finance", "Strategy", "Technology"]),
    ("skku_emba", "Sungkyunkwan GSB Executive MBA", "Seoul", "South Korea", 620, 28000, "$52,000", ["Finance", "Strategy", "Technology"]),
    ("nagoya_emba", "Nagoya University of Commerce Executive MBA", "Nagoya", "Japan", 600, 30000, "$55,000", ["Strategy", "International Business", "Innovation"]),
    ("utm_emba", "Universiti Teknologi Malaysia Executive MBA", "Johor", "Malaysia", 570, 12000, "$22,000", ["Technology", "Innovation", "Strategy"]),
    ("um_emba", "University of Malaya Executive MBA", "Kuala Lumpur", "Malaysia", 580, 15000, "$28,000", ["Finance", "Strategy", "Marketing"]),
    ("iag_puc_emba", "IAG PUC-Rio Executive MBA", "Rio de Janeiro", "Brazil", 590, 25000, "$40,000", ["Finance", "Strategy", "Innovation"]),
    ("cesa_emba", "CESA Executive MBA", "Bogotá", "Colombia", 580, 18000, "$30,000", ["Finance", "Strategy", "Entrepreneurship"]),
    ("eafit_emba", "EAFIT University Executive MBA", "Medellín", "Colombia", 580, 16000, "$28,000", ["Finance", "Strategy", "Innovation"]),
    ("espae_emba", "ESPAE-ESPOL Executive MBA", "Guayaquil", "Ecuador", 570, 14000, "$24,000", ["Finance", "Strategy", "Marketing"]),
    ("esan_emba", "ESAN Graduate School Executive MBA", "Lima", "Peru", 580, 16000, "$28,000", ["Finance", "Mining", "Strategy"]),
    ("dit_tella_emba", "Universidad Torcuato Di Tella Executive MBA", "Buenos Aires", "Argentina", 600, 22000, "$35,000", ["Finance", "Strategy", "Economics"]),
    ("uai_emba", "Universidad Adolfo Ibáñez Executive MBA", "Santiago", "Chile", 600, 25000, "$38,000", ["Finance", "Strategy", "Mining"]),
    ("obbs_emba", "Oxford Brookes Business School Executive MBA", "Oxford", "UK", 580, 28000, "$45,000", ["Finance", "Strategy", "Innovation"]),
    ("hertfordshire_emba", "University of Hertfordshire Executive MBA", "Hatfield", "UK", 570, 22000, "$38,000", ["Finance", "Strategy", "Marketing"]),
    ("ulster_emba", "Ulster University Executive MBA", "Belfast", "UK", 570, 22000, "$38,000", ["Finance", "Strategy", "Innovation"]),
    ("porto_emba", "University of Porto FEP Executive MBA", "Porto", "Portugal", 590, 18000, "$32,000", ["Finance", "Strategy", "Innovation"]),
    ("carlos_iii_emba", "Carlos III University Executive MBA", "Madrid", "Spain", 600, 20000, "$35,000", ["Finance", "Strategy", "Innovation"]),
    ("ghana_emba", "University of Ghana Business School Executive MBA", "Accra", "Ghana", 570, 10000, "$18,000", ["Finance", "Strategy", "Entrepreneurship"]),
    ("pretoria_emba", "University of Pretoria GIBS Executive MBA (standalone)", "Pretoria", "South Africa", 590, 18000, "$28,000", ["Finance", "Strategy", "Mining"]),
    ("nairobi_emba", "University of Nairobi Business School Executive MBA", "Nairobi", "Kenya", 570, 8000, "$15,000", ["Finance", "Strategy", "Entrepreneurship"]),
    ("uct_gsb_emba2", "UCT GSB Modular Executive MBA", "Cape Town", "South Africa", 590, 20000, "$32,000", ["Finance", "Strategy", "Leadership"]),
    ("amman_emba", "University of Jordan Executive MBA", "Amman", "Jordan", 570, 12000, "$22,000", ["Finance", "Strategy", "Marketing"]),
    ("beirut_emba", "American University of Beirut Olayan Executive MBA", "Beirut", "Lebanon", 590, 25000, "$35,000", ["Finance", "Strategy", "Banking"]),
    ("sharjah_emba", "American University of Sharjah Executive MBA", "Sharjah", "UAE", 600, 28000, "$42,000", ["Finance", "Strategy", "Marketing"]),
    ("king_saud_emba", "King Saud University Executive MBA", "Riyadh", "Saudi Arabia", 590, 20000, "$40,000", ["Finance", "Energy", "Strategy"]),
    ("hamad_emba", "Hamad Bin Khalifa University Executive MBA", "Doha", "Qatar", 610, 35000, "$55,000", ["Finance", "Energy", "Strategy"]),
]


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
        try:
            sal_str = str(parent.get("median_salary", "100000")).replace('$', '').replace(',', '').strip()
            sal_int = int(float(sal_str))
        except (ValueError, TypeError):
            sal_int = 100000  # fallback for non-USD formats like ₹32 LPA
        new_prog["median_salary"] = f"${int(sal_int * sal_mod):,}"
        specials[new_sid] = new_prog

    # Need to find the SIDs dynamically if they exist, or fallback
    def find_sid(keyword):
        for sid, s in base_db.items():
            if keyword.lower() in sid.lower(): return sid
        return None

    def find_sid_by_name(keyword):
        for sid, s in base_db.items():
            if keyword.lower() in s["name"].lower(): return sid
        return None

    # MIT — MiM and MFin
    mit_sid = find_sid("sloan")
    if mit_sid:
        add_program(mit_sid, "MiM", "MiM", -20, 0.7, 0.6)
        add_program(mit_sid, "Master of Finance", "Master of Finance", -10, 0.9, 0.8)
    
    # ESCP — MiM
    escp_sid = find_sid_by_name("escp")
    if escp_sid:
        add_program(escp_sid, "Master in Management", "MiM", -30, 0.8, 0.7)
        
    # ISB — PGP YL is now MBA (not "Deferred MBA")
    isb_sid = find_sid("isb")
    if isb_sid:
        add_program(isb_sid, "PGP YL (Young Leaders)", "MBA", 0, 1.0, 1.0)
        
    # IIMs — EPGP and CAT-led PGP
    iim_sids = [sid for sid, s in base_db.items() if "indian institute of management" in s["name"].lower() or sid.startswith("iim")]
    for i_sid in iim_sids:
        add_program(i_sid, "EPGP (Executive)", "Executive MBA", -40, 1.2, 1.3)
        add_program(i_sid, "CAT-led PGP (MBA)", "MBA (CAT)", 0, 0.8, 0.8)

    # ── Generate EMBA variants from the comprehensive EMBA_PROGRAMS list ──
    for keyword, suffix, gmat_mod, tuit_mod, sal_mod in EMBA_PROGRAMS:
        parent_sid = find_sid(keyword) or find_sid_by_name(keyword)
        if parent_sid:
            # Skip if we already generated an EMBA for this school (e.g. IIMs above)
            emba_sid = f"{parent_sid}_executive_mba"
            if emba_sid not in specials:
                add_program(parent_sid, suffix, "Executive MBA", gmat_mod, tuit_mod, sal_mod)

    # ── Generate MiM variants from existing MBA schools ──
    for keyword, suffix, gmat_mod, tuit_mod, sal_mod in MIM_VARIANT_PROGRAMS:
        parent_sid = find_sid(keyword) or find_sid_by_name(keyword)
        if parent_sid:
            mim_sid = f"{parent_sid}_mim"
            if mim_sid not in specials and mim_sid not in base_db:
                add_program(parent_sid, suffix, "MiM", gmat_mod, tuit_mod, sal_mod)

    # ── Add standalone MiM schools ──
    for entry in STANDALONE_MIM_SCHOOLS:
        sid, name, location, country, gmat, tuition, salary, specs = entry
        if sid not in specials and sid not in base_db:
            specials[sid] = {
                "name": name,
                "location": location,
                "country": country,
                "gmat_avg": gmat,
                "acceptance_rate": round(rng.uniform(20, 55), 1),
                "class_size": rng.randint(30, 120),
                "tuition_usd": tuition,
                "median_salary": salary,
                "specializations": specs,
                "degree_type": "MiM",
            }

    # ── Add standalone EMBA schools ──
    for entry in STANDALONE_EMBA_SCHOOLS:
        sid, name, location, country, gmat, tuition, salary, specs = entry
        if sid not in specials and sid not in base_db:
            specials[sid] = {
                "name": name,
                "location": location,
                "country": country,
                "gmat_avg": gmat,
                "acceptance_rate": round(rng.uniform(25, 55), 1),
                "class_size": rng.randint(30, 80),
                "tuition_usd": tuition,
                "median_salary": salary,
                "specializations": specs,
                "degree_type": "Executive MBA",
            }
        
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

    # Step 6: Cross-program coverage — ensure every school lists ALL programs from its institution
    print("\n🔗 Cross-linking programs per institution...")
    from collections import defaultdict
    
    # Group schools by base institution name
    def get_base_name(name):
        """Extract base institution name by removing parenthetical program suffixes."""
        if '(' in name:
            return name[:name.rindex('(')].strip()
        return name
    
    institution_groups = defaultdict(list)
    for sid, s in full_db.items():
        base = get_base_name(s["name"])
        institution_groups[base].append(sid)
    
    # For each institution with multiple programs, add a programs array to each entry
    multi_count = 0
    for base_name, sids in institution_groups.items():
        if len(sids) < 2:
            continue
        multi_count += 1
        # Build the programs list for this institution
        programs_list = []
        for sid in sids:
            s = full_db[sid]
            programs_list.append({
                "id": sid,
                "name": s["name"],
                "type": s.get("degree_type", "MBA"),
                "gmat_avg": s.get("gmat_avg"),
                "tuition_usd": s.get("tuition_usd"),
            })
        # Attach to each entry
        for sid in sids:
            full_db[sid]["programs"] = programs_list
    
    print(f"   {multi_count} institutions have multiple programs cross-linked")
    
    # Step 7: Save school DB
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
