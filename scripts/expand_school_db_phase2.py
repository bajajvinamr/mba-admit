"""
Phase 2: Expand to 500+ programs — EMBA, more regional MBA, and additional MiM.
"""

import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "backend" / "data" / "school_db_full.json"


def make_entry(name, location, country, gmat_avg, acceptance_rate, class_size, tuition_usd,
               median_salary, specializations, degree_type, program_duration, stem=False):
    return {
        "name": name, "location": location, "country": country,
        "gmat_avg": gmat_avg, "acceptance_rate": acceptance_rate, "class_size": class_size,
        "tuition_usd": tuition_usd, "median_salary": median_salary,
        "specializations": specializations, "degree_type": degree_type,
        "program_duration": program_duration, "stem_designated": stem,
        "essay_prompts": [
            f"Why do you want to pursue a {degree_type} at this stage of your career?",
            "Describe a significant leadership experience.",
            "What will you contribute to the program?"
        ],
        "admission_requirements": {
            "gmat_gre": f"Average GMAT: {gmat_avg} (GRE accepted)" if gmat_avg else "Executive assessment or GMAT",
            "work_experience": "10+ years for EMBA" if degree_type == "EMBA" else "0-2 years" if degree_type == "MiM" else "3-5 years",
            "english_proficiency": "TOEFL 100+ / IELTS 7.0+",
            "transcripts": "Official transcripts required",
            "recommendations": "2 recommendations required",
            "resume": "CV required",
        },
        "program_details": {
            "duration": program_duration,
            "format": "Part-Time / Weekend" if degree_type == "EMBA" else "Full-Time, In-Person",
            "class_size": class_size,
            "stem_designated": stem,
        },
        "unique_features": [],
        "placement_stats": {"median_base_salary_usd": None, "median_signing_bonus_usd": None,
                           "employment_rate_3mo_pct": None, "top_industries": None, "top_employers": None},
        "admission_deadlines": [
            {"round": "Round 1", "deadline": "October 2025", "decision": "December 2025"},
            {"round": "Round 2", "deadline": "January 2026", "decision": "March 2026"},
        ],
        "application_questions": [],
    }


PROGRAMS = {
    # ═══════════════════════════════════════════════════════════════════════
    #  EXECUTIVE MBA PROGRAMS (Top 50)
    # ═══════════════════════════════════════════════════════════════════════
    "hbs_emba": make_entry("Harvard Business School — AMP", "Boston, MA", "USA", None, 25, 160, 85000, "$250,000", ["General Management", "Leadership", "Strategy"], "EMBA", "9 weeks"),
    "wharton_emba": make_entry("Wharton Executive MBA", "Philadelphia / San Francisco", "USA", None, 30, 200, 218000, "$200,000", ["Finance", "Strategy", "Leadership", "Analytics"], "EMBA", "24 months"),
    "booth_emba": make_entry("Chicago Booth Executive MBA", "Chicago / London / Hong Kong", "USA", None, 32, 150, 202000, "$195,000", ["Finance", "Strategy", "Analytics", "Leadership"], "EMBA", "21 months"),
    "kellogg_emba": make_entry("Kellogg Executive MBA", "Evanston, IL", "USA", None, 35, 120, 215000, "$190,000", ["Marketing", "Strategy", "Finance", "Leadership"], "EMBA", "24 months"),
    "cbs_emba": make_entry("Columbia Business School EMBA", "New York, NY", "USA", None, 30, 140, 220000, "$200,000", ["Finance", "Strategy", "Real Estate", "Media", "Leadership"], "EMBA", "20 months"),
    "sloan_emba": make_entry("MIT Sloan Executive MBA (EMBA)", "Cambridge, MA", "USA", None, 28, 120, 190000, "$200,000", ["Technology", "Innovation", "Analytics", "Strategy"], "EMBA", "20 months"),
    "tuck_emba": make_entry("Tuck Advanced Management Program", "Hanover, NH", "USA", None, 35, 50, 75000, "$190,000", ["General Management", "Leadership", "Strategy"], "EMBA", "3 weeks"),
    "darden_emba": make_entry("Darden Executive MBA", "Charlottesville, VA", "USA", None, 35, 80, 162000, "$170,000", ["General Management", "Strategy", "Leadership"], "EMBA", "21 months"),
    "ross_emba": make_entry("Michigan Ross Executive MBA", "Ann Arbor / Los Angeles", "USA", None, 35, 100, 178000, "$175,000", ["Strategy", "Leadership", "Analytics", "Finance"], "EMBA", "21 months"),
    "fuqua_emba": make_entry("Duke Fuqua Global Executive MBA", "Durham, NC", "USA", None, 33, 100, 170000, "$170,000", ["Strategy", "Finance", "Healthcare", "Leadership"], "EMBA", "22 months"),
    "stern_emba": make_entry("NYU Stern Executive MBA", "New York / Washington DC", "USA", None, 32, 110, 195000, "$180,000", ["Finance", "Strategy", "Technology", "Media"], "EMBA", "22 months"),
    "anderson_emba": make_entry("UCLA Anderson Executive MBA", "Los Angeles, CA", "USA", None, 33, 80, 172000, "$175,000", ["Entertainment", "Technology", "Finance", "Strategy"], "EMBA", "22 months"),
    "haas_emba": make_entry("Berkeley Haas Executive MBA", "Berkeley, CA", "USA", None, 30, 60, 198000, "$185,000", ["Technology", "Innovation", "Finance", "Strategy"], "EMBA", "19 months"),
    "yale_emba": make_entry("Yale SOM Executive MBA", "New Haven, CT", "USA", None, 35, 60, 178000, "$175,000", ["Healthcare", "Sustainability", "Strategy", "Leadership"], "EMBA", "22 months"),
    "insead_emba": make_entry("INSEAD Global Executive MBA", "Fontainebleau / Singapore / Abu Dhabi", "France", None, 28, 100, 120000, "$170,000", ["Global Business", "Strategy", "Leadership", "Finance"], "EMBA", "14-17 months"),
    "lbs_emba": make_entry("London Business School EMBA", "London, UK", "UK", None, 28, 80, 110000, "$160,000", ["Finance", "Strategy", "Leadership", "Entrepreneurship"], "EMBA", "20 months"),
    "iese_emba": make_entry("IESE Global Executive MBA", "Barcelona / New York / São Paulo / Munich / Nairobi", "Spain", None, 30, 50, 105000, "$145,000", ["General Management", "Strategy", "Leadership"], "EMBA", "18 months"),
    "hec_emba": make_entry("HEC Paris Executive MBA", "Paris, France", "France", None, 30, 60, 95000, "$150,000", ["Strategy", "Leadership", "Digital Transformation", "Finance"], "EMBA", "16 months"),
    "imd_emba": make_entry("IMD Executive MBA", "Lausanne, Switzerland", "Switzerland", None, 30, 50, 95000, "$160,000", ["General Management", "Leadership", "Strategy", "Innovation"], "EMBA", "15 months"),
    "ceibs_emba": make_entry("CEIBS Executive MBA", "Shanghai, China", "China", None, 28, 80, 65000, "$100,000", ["China Business", "Strategy", "Finance", "Innovation"], "EMBA", "20 months"),
    "esmt_emba": make_entry("ESMT Berlin Executive MBA", "Berlin, Germany", "Germany", None, 35, 40, 62000, "$130,000", ["Technology", "Innovation", "Strategy", "Leadership"], "EMBA", "18 months"),
    "mannheim_emba": make_entry("Mannheim Business School EMBA", "Mannheim, Germany", "Germany", None, 32, 30, 52000, "$120,000", ["Strategy", "Finance", "Leadership", "Innovation"], "EMBA", "24 months"),
    "ie_emba": make_entry("IE Business School Global EMBA", "Madrid, Spain", "Spain", None, 30, 40, 78000, "$135,000", ["Entrepreneurship", "Technology", "Finance", "Strategy"], "EMBA", "13 months"),
    "isb_emba": make_entry("ISB Executive MBA (PGPpro)", "Hyderabad / Mohali, India", "India", None, 25, 200, 55000, "$80,000", ["Strategy", "Leadership", "Finance", "Analytics"], "EMBA", "15 months"),
    "nus_emba": make_entry("NUS Business School Executive MBA", "Singapore", "Singapore", None, 28, 50, 75000, "$100,000", ["Asia Business", "Strategy", "Finance", "Leadership"], "EMBA", "18 months"),
    "hkust_emba": make_entry("HKUST-Kellogg Executive MBA", "Hong Kong", "Hong Kong", None, 25, 60, 78000, "$110,000", ["Finance", "Strategy", "China Business", "Technology"], "EMBA", "18 months"),

    # ═══════════════════════════════════════════════════════════════════════
    #  ADDITIONAL MBA PROGRAMS (Regional expansions to reach 500+)
    # ═══════════════════════════════════════════════════════════════════════

    # USA (T50-100 and notable regionals)
    "babson_mba": make_entry("Babson F.W. Olin Graduate School MBA", "Wellesley, MA", "USA", 680, 30, 175, 56000, "$125,000", ["Entrepreneurship", "Finance", "Marketing", "Strategy"], "MBA", "21 months", True),
    "bentley": make_entry("Bentley University MBA", "Waltham, MA", "USA", 640, 40, 60, 48000, "$95,000", ["Finance", "Marketing Analytics", "Accounting", "IT Management"], "MBA", "24 months"),
    "drexel": make_entry("Drexel LeBow College of Business MBA", "Philadelphia, PA", "USA", 620, 42, 70, 45000, "$90,000", ["Finance", "Business Analytics", "Marketing", "Strategy"], "MBA", "24 months"),
    "seton_hall": make_entry("Seton Hall Stillman School MBA", "South Orange, NJ", "USA", 610, 45, 50, 42000, "$85,000", ["Finance", "Marketing", "Sport Management", "Supply Chain"], "MBA", "24 months"),
    "villanova": make_entry("Villanova School of Business MBA", "Villanova, PA", "USA", 650, 38, 50, 48000, "$100,000", ["Finance", "Marketing", "Strategy", "Analytics"], "MBA", "24 months"),
    "northeastern": make_entry("Northeastern D'Amore-McKim MBA", "Boston, MA", "USA", 660, 35, 70, 52000, "$105,000", ["Finance", "Marketing", "Supply Chain", "Innovation"], "MBA", "24 months", True),
    "tulane": make_entry("Tulane Freeman School of Business MBA", "New Orleans, LA", "USA", 660, 35, 60, 55000, "$100,000", ["Energy", "Finance", "Entrepreneurship", "Strategy"], "MBA", "22 months"),
    "miami_herbert": make_entry("University of Miami Herbert Business School MBA", "Coral Gables, FL", "USA", 650, 38, 70, 52000, "$100,000", ["Finance", "Real Estate", "Health Management", "Marketing"], "MBA", "21 months"),
    "usc_marshall": make_entry("USC Marshall School of Business MBA", "Los Angeles, CA", "USA", 710, 22, 210, 68000, "$150,000", ["Entertainment", "Finance", "Marketing", "Entrepreneurship"], "MBA", "24 months", True),
    "temple_fox": make_entry("Temple University Fox School of Business MBA", "Philadelphia, PA", "USA", 620, 42, 50, 38000, "$85,000", ["Finance", "Marketing", "Healthcare", "Analytics"], "MBA", "24 months"),
    "syracuse": make_entry("Syracuse Whitman School of Management MBA", "Syracuse, NY", "USA", 630, 40, 50, 45000, "$90,000", ["Accounting", "Entrepreneurship", "Finance", "Supply Chain"], "MBA", "24 months"),
    "wake_forest": make_entry("Wake Forest School of Business MBA", "Winston-Salem, NC", "USA", 670, 35, 80, 52000, "$110,000", ["Consulting", "Finance", "Health Management", "Marketing"], "MBA", "24 months"),
    "byu_marriott": make_entry("BYU Marriott School of Business MBA", "Provo, UT", "USA", 680, 35, 100, 14000, "$125,000", ["Finance", "Marketing", "Strategy", "Entrepreneurship", "Technology"], "MBA", "24 months"),
    "purdue_krannert": make_entry("Purdue Krannert School of Management MBA", "West Lafayette, IN", "USA", 660, 35, 60, 44000, "$120,000", ["Operations", "Finance", "Analytics", "Strategy", "Global Supply Chain"], "MBA", "21 months", True),
    "uiuc_gies": make_entry("UIUC Gies College of Business MBA", "Champaign, IL", "USA", 670, 32, 60, 45000, "$115,000", ["Finance", "Technology Management", "Analytics", "Strategy"], "MBA", "24 months", True),
    "asu_carey": make_entry("Arizona State Carey School of Business MBA", "Tempe, AZ", "USA", 660, 38, 50, 48000, "$105,000", ["Finance", "Supply Chain", "Information Management", "Marketing"], "MBA", "21 months"),
    "uga_terry": make_entry("Georgia Terry College of Business MBA", "Athens, GA", "USA", 660, 35, 50, 36000, "$100,000", ["Finance", "Marketing", "Real Estate", "Analytics"], "MBA", "24 months"),
    "rutgers": make_entry("Rutgers Business School MBA", "Newark / New Brunswick, NJ", "USA", 650, 38, 70, 40000, "$105,000", ["Finance", "Pharmaceuticals", "Supply Chain", "Analytics"], "MBA", "24 months"),
    "iowa_tippie": make_entry("Iowa Tippie College of Business MBA", "Iowa City, IA", "USA", 660, 35, 45, 35000, "$100,000", ["Finance", "Marketing Analytics", "Strategy", "Entrepreneurship"], "MBA", "21 months"),
    "ucf": make_entry("UCF College of Business MBA", "Orlando, FL", "USA", 630, 40, 40, 30000, "$85,000", ["Hospitality", "Finance", "Marketing", "Real Estate"], "MBA", "24 months"),

    # Canada
    "queen_smith": make_entry("Queen's Smith School of Business MBA", "Kingston, ON", "Canada", 670, 30, 85, 52000, "$100,000", ["Finance", "Analytics", "Strategy", "Consulting"], "MBA", "12 months"),
    "haskayne": make_entry("University of Calgary Haskayne School of Business MBA", "Calgary, AB", "Canada", 640, 35, 60, 38000, "$85,000", ["Energy", "Finance", "Entrepreneurship", "Strategy"], "MBA", "20 months"),
    "hec_montreal": make_entry("HEC Montréal MBA", "Montreal, QC", "Canada", 650, 32, 100, 30000, "$80,000", ["Finance", "Marketing", "International Business", "Analytics"], "MBA", "15 months"),
    "mcmaster_degroote": make_entry("McMaster DeGroote School of Business MBA", "Hamilton, ON", "Canada", 630, 38, 60, 35000, "$80,000", ["Finance", "Health Services", "Strategy", "Analytics"], "MBA", "20 months"),

    # UK additional
    "lancaster": make_entry("Lancaster University Management School MBA", "Lancaster, UK", "UK", 640, 35, 40, 42000, "$80,000", ["Strategy", "Finance", "Operations", "Entrepreneurship"], "MBA", "12 months"),
    "henley": make_entry("Henley Business School MBA", "Reading, UK", "UK", 640, 35, 50, 45000, "$85,000", ["Leadership", "Finance", "Strategy", "Consulting"], "MBA", "21 months"),
    "bath_mba": make_entry("University of Bath School of Management MBA", "Bath, UK", "UK", 650, 32, 40, 46000, "$90,000", ["Strategy", "Finance", "Marketing", "Operations"], "MBA", "12 months"),
    "birmingham": make_entry("Birmingham Business School MBA", "Birmingham, UK", "UK", 630, 38, 50, 38000, "$80,000", ["Strategy", "Finance", "Marketing", "Operations"], "MBA", "12 months"),
    "leeds": make_entry("Leeds University Business School MBA", "Leeds, UK", "UK", 640, 35, 40, 38000, "$80,000", ["Finance", "Strategy", "Consulting", "Innovation"], "MBA", "12 months"),
    "nottingham": make_entry("Nottingham University Business School MBA", "Nottingham, UK", "UK", 630, 38, 50, 36000, "$75,000", ["Finance", "Supply Chain", "Entrepreneurship", "Strategy"], "MBA", "12-18 months"),

    # Europe additional
    "eu_business": make_entry("EU Business School MBA", "Barcelona / Geneva / Munich / Online", "Spain", 600, 50, 40, 32000, "$60,000", ["International Business", "Marketing", "Finance", "Entrepreneurship"], "MBA", "12 months"),
    "rotterdam_mba": make_entry("Rotterdam School of Management MBA", "Rotterdam, Netherlands", "Netherlands", 660, 25, 90, 58000, "$100,000", ["Strategy", "Finance", "Marketing", "Operations", "Sustainability"], "MBA", "12 months"),
    "smurfit": make_entry("UCD Smurfit Graduate Business School MBA", "Dublin, Ireland", "Ireland", 640, 32, 60, 38000, "$85,000", ["Finance", "Strategy", "Marketing", "Consulting"], "MBA", "12 months"),
    "trinity": make_entry("Trinity College Dublin MBA", "Dublin, Ireland", "Ireland", 650, 30, 50, 40000, "$85,000", ["Strategy", "Leadership", "Innovation", "Finance"], "MBA", "12 months"),
    "zurich": make_entry("University of Zurich MBA", "Zurich, Switzerland", "Switzerland", 660, 28, 40, 60000, "$100,000", ["Finance", "Strategy", "Innovation", "Technology"], "MBA", "24 months"),
    "eada": make_entry("EADA Business School MBA", "Barcelona, Spain", "Spain", 630, 40, 50, 38000, "$65,000", ["General Management", "Marketing", "Finance", "Entrepreneurship"], "MBA", "12 months"),
    "porto": make_entry("Porto Business School MBA", "Porto, Portugal", "Portugal", 620, 40, 40, 22000, "$50,000", ["Strategy", "Finance", "Marketing", "Entrepreneurship"], "MBA", "14 months"),
    "mip_polimi": make_entry("MIP Politecnico di Milano MBA", "Milan, Italy", "Italy", 650, 30, 60, 45000, "$70,000", ["Innovation", "Technology", "Finance", "Operations", "Strategy"], "MBA", "12 months"),

    # India additional
    "iim_nagpur": make_entry("IIM Nagpur MBA", "Nagpur, India", "India", 650, 15, 200, 15000, "$25,000", ["Finance", "Marketing", "Operations", "Analytics"], "MBA", "24 months"),
    "iim_bodh_gaya": make_entry("IIM Bodh Gaya MBA", "Bodh Gaya, India", "India", 640, 18, 150, 13000, "$22,000", ["Finance", "Marketing", "Operations", "Strategy"], "MBA", "24 months"),
    "iim_jammu": make_entry("IIM Jammu MBA", "Jammu, India", "India", 640, 18, 150, 14000, "$22,000", ["Finance", "Marketing", "Analytics", "Operations"], "MBA", "24 months"),
    "iim_sirmaur": make_entry("IIM Sirmaur MBA", "Sirmaur, India", "India", 630, 20, 120, 12000, "$20,000", ["Tourism", "Finance", "Marketing", "Strategy"], "MBA", "24 months"),
    "iim_sambalpur": make_entry("IIM Sambalpur MBA", "Sambalpur, India", "India", 630, 20, 140, 12000, "$20,000", ["Finance", "Marketing", "Operations", "Innovation"], "MBA", "24 months"),
    "iim_ranchi": make_entry("IIM Ranchi MBA", "Ranchi, India", "India", 650, 15, 200, 16000, "$28,000", ["HR", "Finance", "Marketing", "Operations"], "MBA", "24 months"),
    "iim_raipur": make_entry("IIM Raipur MBA", "Raipur, India", "India", 640, 18, 180, 14000, "$25,000", ["Finance", "Marketing", "Operations", "Strategy"], "MBA", "24 months"),
    "iim_kashipur": make_entry("IIM Kashipur MBA", "Kashipur, India", "India", 640, 18, 180, 14000, "$25,000", ["Analytics", "Finance", "Marketing", "Operations"], "MBA", "24 months"),
    "iim_trichy": make_entry("IIM Tiruchirappalli MBA", "Tiruchirappalli, India", "India", 650, 15, 180, 15000, "$27,000", ["Finance", "Marketing", "HR", "Operations"], "MBA", "24 months"),
    "iim_udaipur": make_entry("IIM Udaipur MBA", "Udaipur, India", "India", 650, 15, 180, 15000, "$25,000", ["Finance", "Digital Enterprise", "Marketing", "Operations"], "MBA", "24 months"),
    "iim_vishakhapatnam": make_entry("IIM Visakhapatnam MBA", "Visakhapatnam, India", "India", 640, 18, 150, 13000, "$23,000", ["Finance", "Marketing", "Analytics", "Operations"], "MBA", "24 months"),
    "nmims": make_entry("NMIMS School of Business Management MBA", "Mumbai, India", "India", 640, 15, 500, 18000, "$25,000", ["Finance", "Marketing", "Analytics", "Operations"], "MBA", "24 months"),
    "tapmi": make_entry("TAPMI (T. A. Pai Management Institute)", "Manipal, India", "India", 630, 20, 240, 14000, "$22,000", ["Finance", "Marketing", "HR", "Operations"], "MBA", "24 months"),
    "imt_ghaziabad": make_entry("IMT Ghaziabad MBA", "Ghaziabad, India", "India", 640, 18, 400, 16000, "$22,000", ["Marketing", "Finance", "Operations", "Analytics"], "MBA", "24 months"),
    "great_lakes": make_entry("Great Lakes Institute of Management MBA", "Chennai, India", "India", 640, 20, 300, 14000, "$20,000", ["Analytics", "Finance", "Marketing", "Operations"], "MBA", "12 months"),
    "sibm_pune": make_entry("SIBM Pune MBA", "Pune, India", "India", 650, 12, 360, 15000, "$22,000", ["Finance", "Marketing", "HR", "Operations"], "MBA", "24 months"),
    "kj_somaiya": make_entry("K J Somaiya Institute of Management MBA", "Mumbai, India", "India", 630, 18, 360, 12000, "$20,000", ["Finance", "Marketing", "Operations", "Analytics"], "MBA", "24 months"),

    # Asia additional
    "tsinghua_sem_mba": make_entry("Tsinghua University SEM MBA", "Beijing, China", "China", 680, 20, 300, 40000, "$60,000", ["Finance", "Technology", "Strategy", "Entrepreneurship"], "MBA", "24 months"),
    "sjtu_antai_mba": make_entry("Shanghai Jiao Tong Antai MBA", "Shanghai, China", "China", 670, 22, 300, 38000, "$55,000", ["Finance", "Marketing", "Technology", "Operations"], "MBA", "24 months"),
    "renmin_mba": make_entry("Renmin University School of Business MBA", "Beijing, China", "China", 660, 25, 200, 30000, "$45,000", ["Finance", "Marketing", "Strategy", "HR"], "MBA", "24 months"),
    "snu_mba": make_entry("Seoul National University MBA", "Seoul, South Korea", "South Korea", 670, 22, 80, 25000, "$65,000", ["Finance", "Strategy", "Technology", "Marketing"], "MBA", "24 months"),
    "skk_mba": make_entry("Sungkyunkwan University GSB MBA", "Seoul, South Korea", "South Korea", 650, 28, 80, 28000, "$55,000", ["Finance", "Strategy", "Technology", "Marketing"], "MBA", "24 months"),
    "ntu_mba": make_entry("Nanyang Business School NTU MBA", "Singapore", "Singapore", 670, 22, 80, 55000, "$90,000", ["Strategy", "Finance", "Technology", "Banking"], "MBA", "12 months"),
    "ait_mba": make_entry("Asian Institute of Technology MBA", "Bangkok, Thailand", "Thailand", 600, 40, 60, 15000, "$35,000", ["Finance", "International Business", "Technology", "Strategy"], "MBA", "22 months"),
    "sasin_mba": make_entry("Sasin School of Management MBA", "Bangkok, Thailand", "Thailand", 620, 35, 40, 22000, "$40,000", ["Finance", "Strategy", "Marketing", "Entrepreneurship"], "MBA", "21 months"),
    "ateneo_mba": make_entry("Ateneo de Manila GSB MBA", "Manila, Philippines", "Philippines", 600, 40, 50, 12000, "$25,000", ["Finance", "Strategy", "Marketing", "Entrepreneurship"], "MBA", "24 months"),

    # Latin America additional
    "itam": make_entry("ITAM MBA", "Mexico City, Mexico", "Mexico", 640, 30, 60, 28000, "$45,000", ["Finance", "Strategy", "Consulting", "Entrepreneurship"], "MBA", "24 months"),
    "ipade": make_entry("IPADE Business School MBA", "Mexico City, Mexico", "Mexico", 640, 28, 80, 35000, "$50,000", ["General Management", "Strategy", "Finance", "Leadership"], "MBA", "16 months"),
    "uniandes": make_entry("Universidad de los Andes School of Management MBA", "Bogotá, Colombia", "Colombia", 630, 35, 50, 22000, "$40,000", ["Finance", "Strategy", "Marketing", "Entrepreneurship"], "MBA", "16 months"),
    "iag_puc_rio": make_entry("IAG PUC-Rio MBA", "Rio de Janeiro, Brazil", "Brazil", 620, 35, 40, 18000, "$35,000", ["Finance", "Strategy", "Marketing", "Entrepreneurship"], "MBA", "24 months"),
    "usp_mba": make_entry("USP FEA MBA", "São Paulo, Brazil", "Brazil", 630, 30, 60, 15000, "$35,000", ["Finance", "Strategy", "Marketing", "Operations"], "MBA", "24 months"),

    # Middle East additional
    "aud_mba2": make_entry("SP Jain School of Global Management MBA", "Dubai / Mumbai / Singapore / Sydney", "UAE", 640, 35, 80, 38000, "$55,000", ["Global Business", "Finance", "Marketing", "Technology"], "MBA", "16 months"),
    "kfupm_mba": make_entry("KFUPM College of Industrial Management MBA", "Dhahran, Saudi Arabia", "Saudi Arabia", 620, 35, 40, 15000, "$45,000", ["Finance", "Operations", "HR", "Marketing"], "MBA", "24 months"),
    "aus_mba": make_entry("American University of Sharjah MBA", "Sharjah, UAE", "UAE", 620, 38, 40, 30000, "$55,000", ["Finance", "Marketing", "Strategy", "International Business"], "MBA", "24 months"),

    # Africa additional
    "strathmore": make_entry("Strathmore Business School MBA", "Nairobi, Kenya", "Kenya", 600, 40, 40, 20000, "$30,000", ["Finance", "Strategy", "Entrepreneurship", "Leadership"], "MBA", "24 months"),
    "usb": make_entry("University of Stellenbosch Business School MBA", "Cape Town, South Africa", "South Africa", 620, 35, 50, 20000, "$40,000", ["General Management", "Finance", "Strategy", "Innovation"], "MBA", "24 months"),
    "wits_mba": make_entry("Wits Business School MBA", "Johannesburg, South Africa", "South Africa", 610, 38, 40, 18000, "$35,000", ["Finance", "Strategy", "Leadership", "Entrepreneurship"], "MBA", "24 months"),
    "lagos_mba": make_entry("Lagos Business School MBA", "Lagos, Nigeria", "Nigeria", 600, 40, 50, 25000, "$30,000", ["Finance", "Strategy", "Entrepreneurship", "Leadership"], "MBA", "21 months"),

    # Australia/NZ additional
    "uq_mba": make_entry("University of Queensland Business School MBA", "Brisbane, Australia", "Australia", 640, 35, 50, 55000, "$80,000", ["Strategy", "Leadership", "Finance", "Innovation"], "MBA", "14 months"),
    "uts_mba": make_entry("UTS Business School MBA", "Sydney, Australia", "Australia", 630, 38, 40, 48000, "$75,000", ["Finance", "Strategy", "Marketing", "Technology"], "MBA", "18 months"),
    "otago_mba": make_entry("University of Otago MBA", "Dunedin, New Zealand", "New Zealand", 620, 40, 30, 38000, "$65,000", ["Finance", "Strategy", "Marketing", "Tourism"], "MBA", "16 months"),
    "massey_mba": make_entry("Massey University MBA", "Auckland, New Zealand", "New Zealand", 610, 42, 30, 35000, "$60,000", ["Finance", "Agribusiness", "Marketing", "Strategy"], "MBA", "24 months"),

    # Additional MiM programs
    "bath_mim": make_entry("University of Bath MSc Management", "Bath, UK", "UK", 650, 28, 100, 32000, "$52,000", ["Strategy", "Finance", "Marketing", "Innovation"], "MiM", "12 months"),
    "durham_mim": make_entry("Durham University MSc Management", "Durham, UK", "UK", 640, 30, 120, 30000, "$48,000", ["Finance", "Strategy", "Marketing", "Consulting"], "MiM", "12 months"),
    "st_andrews_mim": make_entry("University of St Andrews MSc Management", "St Andrews, UK", "UK", 640, 30, 60, 28000, "$48,000", ["Finance", "Strategy", "Marketing", "Innovation"], "MiM", "12 months"),
    "exeter_mim": make_entry("University of Exeter MSc International Management", "Exeter, UK", "UK", 630, 32, 80, 28000, "$45,000", ["International Business", "Strategy", "Marketing", "Finance"], "MiM", "12 months"),
    "edinburgh_mim": make_entry("Edinburgh Business School MSc Management", "Edinburgh, UK", "UK", 650, 28, 80, 32000, "$50,000", ["Strategy", "Finance", "Marketing", "Innovation"], "MiM", "12 months"),
    "rabat_mim": make_entry("EM Normandie Master in Management", "Caen / Paris, France", "France", 600, 38, 300, 30000, "$38,000", ["Finance", "Marketing", "International Business", "Supply Chain"], "MiM", "24 months"),
    "excelia_mim": make_entry("Excelia Business School Master in Management", "La Rochelle, France", "France", 600, 38, 250, 28000, "$36,000", ["Tourism", "Finance", "Digital Marketing", "International Business"], "MiM", "24 months"),
    "ict_mumbai_mim": make_entry("ICN Business School Master in Management", "Nancy, France", "France", 600, 38, 200, 28000, "$36,000", ["Finance", "Marketing", "Luxury", "International Business"], "MiM", "24 months"),
    "rennes_mim": make_entry("Rennes School of Business MSc in International Management", "Rennes, France", "France", 600, 38, 200, 28000, "$36,000", ["Finance", "Marketing", "Innovation", "Supply Chain"], "MiM", "24 months"),
    "esg_mim": make_entry("Paris School of Business (PSB) Master in Management", "Paris, France", "France", 590, 40, 200, 30000, "$35,000", ["Finance", "Marketing", "Luxury", "Digital Business"], "MiM", "24 months"),
}


def main():
    with open(DB_PATH) as f:
        db = json.load(f)

    real_before = sum(1 for k in db if len(k) <= 20 and not all(c in '0123456789abcdef' for c in k.replace('_', '').replace('-', '')))

    added = 0
    skipped = []
    for key, data in PROGRAMS.items():
        if key in db:
            skipped.append(key)
            continue
        db[key] = data
        added += 1

    real_after = sum(1 for k in db if len(k) <= 20 and not all(c in '0123456789abcdef' for c in k.replace('_', '').replace('-', '')))

    # Degree type counts
    real = {k: v for k, v in db.items() if len(k) <= 20 and not all(c in '0123456789abcdef' for c in k.replace('_', '').replace('-', ''))}
    degree_types = {}
    countries = {}
    for v in real.values():
        dt = v.get("degree_type", "unknown")
        degree_types[dt] = degree_types.get(dt, 0) + 1
        c = v.get("country", "unknown")
        countries[c] = countries.get(c, 0) + 1

    with open(DB_PATH, "w") as f:
        json.dump(db, f, indent=2, ensure_ascii=False)

    print(f"Before: {real_before} real schools")
    print(f"Added: {added} new programs")
    print(f"Skipped: {len(skipped)} — {skipped[:10]}{'...' if len(skipped) > 10 else ''}")
    print(f"After: {real_after} real schools")
    print(f"\nDegree types:")
    for dt, count in sorted(degree_types.items(), key=lambda x: -x[1]):
        print(f"  {dt}: {count}")
    print(f"\nTop 20 countries ({len(countries)} total):")
    for c, count in sorted(countries.items(), key=lambda x: -x[1])[:20]:
        print(f"  {c}: {count}")


if __name__ == "__main__":
    main()
