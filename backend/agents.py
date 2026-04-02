import os
import json
from enum import Enum
from typing import TypedDict, List, Dict, Any
from logging_config import setup_logging

logger = setup_logging()

# ── Model Configuration ──────────────────────────────────────────────────────
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")
CLAUDE_MAX_TOKENS = 2000

# LangChain & LLM Integration
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# LlamaIndex & RAG Integration (Optional for Evals)
try:
    from llama_index.core import VectorStoreIndex, StorageContext
    from llama_index.core.settings import Settings
    from llama_index.vector_stores.qdrant import QdrantVectorStore
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    from qdrant_client import QdrantClient
    HAS_LLAMA_INDEX = True
except ImportError:
    HAS_LLAMA_INDEX = False

# Load env variables for API keys
from dotenv import load_dotenv
load_dotenv()

class AgentType(str, Enum):
    IDLE = "idle"
    CHIEF_OF_STAFF = "chief_of_staff"
    CONSULTANT = "admissions_consultant"
    INTERVIEWER = "interviewer"
    WRITER = "writer"

# ── School Database — loaded from generated JSON + scraped overlay ────────
_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
_SCHOOL_DB_PATH = os.path.join(_DATA_DIR, "school_db_full.json")
_SCRAPED_DB_PATH = os.path.join(_DATA_DIR, "school_db_scraped.json")
_DISCOVERY_LIST_PATH = os.path.join(_DATA_DIR, "discovery_list.json")
_INFO_SITES_DIR = os.path.join(_DATA_DIR, "info_sites")

import re
_HEX_PATTERN = re.compile(r'^[0-9a-f]{6,}$')


def _load_school_db():
    """Load school DB from JSON, filtering out AI-generated placeholder schools,
    then overlay any scraped data on top.

    Real schools have human-readable IDs (e.g. 'hbs', 'insead', 'iim_mumbai').
    Fake/generated schools have hex-hash IDs (e.g. '5495916da71a').
    Scraped data from the pipeline takes priority over synthetic data.
    """
    if os.path.exists(_SCHOOL_DB_PATH):
        with open(_SCHOOL_DB_PATH, "r") as f:
            raw_db = json.load(f)
        db = {sid: school for sid, school in raw_db.items() if not _HEX_PATTERN.match(sid)}
        logger.info("Loaded %d real schools (filtered from %d total) from %s", len(db), len(raw_db), _SCHOOL_DB_PATH)
    else:
        logger.warning("school_db_full.json not found, using minimal fallback")
        db = {
            "hbs": {"name": "Harvard Business School", "location": "Boston, MA, USA", "country": "USA", "gmat_avg": 730, "acceptance_rate": 9.5, "class_size": 945, "tuition_usd": 74910, "median_salary": "$175,000", "specializations": ["General Management", "Finance", "Entrepreneurship"], "essay_prompts": ["As we review your application, what more would you like us to know?"]},
            "gsb": {"name": "Stanford GSB", "location": "Stanford, CA, USA", "country": "USA", "gmat_avg": 738, "acceptance_rate": 6.2, "class_size": 436, "tuition_usd": 76950, "median_salary": "$182,500", "specializations": ["Entrepreneurship", "Social Innovation", "Tech"], "essay_prompts": ["What matters most to you, and why?", "Why Stanford?"]},
        }

    # Overlay scraped data — real values from the scraper pipeline take priority
    scraped_count = _overlay_scraped_data(db)
    if scraped_count:
        logger.info("Overlaid scraped data for %d schools", scraped_count)

    # Backfill missing core fields from discovery_list.json
    backfilled = _backfill_from_discovery(db)
    if backfilled:
        logger.info("Backfilled core fields for %d schools from discovery_list", backfilled)

    # Overlay info site data (rankings, essay tips, class profiles)
    info_count = _overlay_info_site_data(db)
    if info_count:
        logger.info("Overlaid info site data for %d schools", info_count)

    # Ensure every school has data_quality metadata
    _ensure_data_quality(db)

    return db


def _overlay_scraped_data(db: dict) -> int:
    """Merge scraped school data on top of the base DB in-place.

    Returns the number of schools that received scraped data.
    """
    if not os.path.exists(_SCRAPED_DB_PATH):
        return 0

    try:
        with open(_SCRAPED_DB_PATH, "r") as f:
            scraped = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        logger.warning("Could not load scraped DB: %s", e)
        return 0

    if not isinstance(scraped, dict):
        return 0

    count = 0
    for school_id, scraped_fields in scraped.items():
        if not isinstance(scraped_fields, dict):
            continue

        # Skip entries that are just error records
        meta = scraped_fields.get("_meta", {})
        if meta.get("error"):
            continue
        if "error" in scraped_fields and len(scraped_fields) <= 3:
            continue

        if school_id not in db:
            new_entry = {k: v for k, v in scraped_fields.items() if k != "_meta"}
            new_fields = [k for k in new_entry if k not in {"data_quality", "confidence", "data_source", "_meta"}]
            if "data_quality" not in new_entry and new_fields:
                new_entry["data_quality"] = {
                    "verified_fields": new_fields,
                    "confidence": 0.9 if len(new_fields) >= 5 else 0.6,
                    "last_scraped": meta.get("scraped_at") or "2026-03-17",
                    "source": "scraped",
                }
            db[school_id] = new_entry
            count += 1
            continue

        # Selective overwrite: scraped non-null values win
        _INTERNAL_FIELDS = {"confidence", "data_quality", "_meta", "data_source"}
        verified_fields = []
        for key, value in scraped_fields.items():
            if key == "_meta":
                continue
            if key == "data_quality":
                db[school_id][key] = value
            elif value is not None:
                db[school_id][key] = value
                if key not in _INTERNAL_FIELDS:
                    verified_fields.append(key)

        # Auto-generate data_quality if the extract didn't include one
        if "data_quality" not in db[school_id] and verified_fields:
            db[school_id]["data_quality"] = {
                "verified_fields": verified_fields,
                "confidence": 0.9 if len(verified_fields) >= 5 else 0.6,
                "last_scraped": meta.get("scraped_at") or "2026-03-17",
                "source": "scraped",
            }
        count += 1

    return count


def _backfill_from_discovery(db: dict) -> int:
    """Fill missing name/country/location from discovery_list.json.

    Schools added by the scraper merge often lack these core fields because
    the extraction prompt focuses on admissions data, not basic metadata.
    The discovery_list always has name, country, and location.
    """
    if not os.path.exists(_DISCOVERY_LIST_PATH):
        return 0
    try:
        with open(_DISCOVERY_LIST_PATH, "r") as f:
            disc = json.load(f)
    except (json.JSONDecodeError, IOError):
        return 0

    disc_map = {s["id"]: s for s in disc if isinstance(s, dict) and "id" in s}
    _BACKFILL_FIELDS = ["name", "country", "location"]
    count = 0
    for school_id, school in db.items():
        if school_id not in disc_map:
            # Fallback: derive name from ID if completely missing
            if not school.get("name"):
                school["name"] = school_id.replace("_", " ").title()
                count += 1
            continue
        src = disc_map[school_id]
        filled_any = False
        for field in _BACKFILL_FIELDS:
            if not school.get(field) and src.get(field):
                school[field] = src[field]
                filled_any = True
        # Also backfill website URL if missing
        if not school.get("website") and src.get("website"):
            school["website"] = src["website"]
        if filled_any:
            count += 1
    return count


def _overlay_info_site_data(db: dict) -> int:
    """Merge extracted info site data (rankings, essay tips, class profiles).

    Info sites like Clear Admit, Poets & Quants, and Stacy Blackman provide
    supplementary data (GMAT averages, class sizes, essay tips) that can fill
    gaps in the primary school DB.
    """
    if not os.path.exists(_INFO_SITES_DIR):
        return 0

    # School name → ID mapping for fuzzy matching
    name_to_id: Dict[str, str] = {}
    for sid, school in db.items():
        name = (school.get("name") or "").lower().strip()
        if name:
            name_to_id[name] = sid
            # Add common short forms
            for suffix in [" school of business", " business school", " school of management"]:
                if name.endswith(suffix):
                    name_to_id[name.replace(suffix, "")] = sid

    count = 0
    for site_dir in os.listdir(_INFO_SITES_DIR):
        site_path = os.path.join(_INFO_SITES_DIR, site_dir)
        if not os.path.isdir(site_path):
            continue

        for fname in os.listdir(site_path):
            if not fname.endswith("_extracted.json"):
                continue
            fpath = os.path.join(site_path, fname)
            try:
                with open(fpath, "r") as f:
                    extracted = json.load(f)
            except (json.JSONDecodeError, IOError):
                continue

            data_type = extracted.get("type")
            data = extracted.get("data")
            if not data:
                continue

            # Handle different extraction types
            if data_type == "school_profile" and isinstance(data, dict):
                count += _merge_school_profile(db, name_to_id, data, site_dir)
            elif data_type == "school_profile" and isinstance(data, list):
                # Some extractions return a list of school profiles
                for profile in data:
                    if isinstance(profile, dict):
                        count += _merge_school_profile(db, name_to_id, profile, site_dir)
            elif data_type == "rankings" and isinstance(data, list):
                for entry in data:
                    if isinstance(entry, dict):
                        count += _merge_ranking_entry(db, name_to_id, entry, site_dir)

    return count


def _merge_school_profile(db: dict, name_to_id: Dict[str, str], profile: dict, source: str) -> int:
    """Merge a single school profile from info site data."""
    school_name = (profile.get("school_name") or "").lower().strip()
    if not school_name:
        return 0

    # Try to find matching school
    sid = name_to_id.get(school_name)
    if not sid:
        # Try partial match
        for db_name, db_sid in name_to_id.items():
            if school_name in db_name or db_name in school_name:
                sid = db_sid
                break
    if not sid or sid not in db:
        return 0

    school = db[sid]
    updated = False

    # Merge numeric fields only if missing or clearly better
    _NUMERIC_MERGE = {
        "avg_gmat": "gmat_avg",
        "gmat_avg": "gmat_avg",
        "class_size": "class_size",
        "women_percentage": "women_pct",
        "international_percentage": "international_pct",
        "acceptance_rate": "acceptance_rate",
    }
    for src_key, dst_key in _NUMERIC_MERGE.items():
        val = profile.get(src_key)
        if val is not None and isinstance(val, (int, float)):
            if not school.get(dst_key):
                school[dst_key] = val
                updated = True

    # Track info site source
    school.setdefault("_info_sources", [])
    if source not in school["_info_sources"]:
        school["_info_sources"].append(source)

    return 1 if updated else 0


def _merge_ranking_entry(db: dict, name_to_id: Dict[str, str], entry: dict, source: str) -> int:
    """Merge a ranking entry (rank, tuition) from info site data."""
    school_name = (entry.get("school_name") or "").lower().strip()
    if not school_name:
        return 0

    sid = name_to_id.get(school_name)
    if not sid:
        for db_name, db_sid in name_to_id.items():
            if school_name in db_name or db_name in school_name:
                sid = db_sid
                break
    if not sid or sid not in db:
        return 0

    school = db[sid]
    updated = False

    # Merge rank
    rank = entry.get("rank")
    if rank and isinstance(rank, int):
        school.setdefault("rankings", {})[source] = rank
        updated = True

    # Merge tuition if we have it and school doesn't
    tuition_str = entry.get("tuition")
    if tuition_str and not school.get("tuition_usd"):
        # Parse "$99,692" → 99692
        cleaned = re.sub(r'[^\d.]', '', str(tuition_str))
        if cleaned:
            try:
                school["tuition_usd"] = int(float(cleaned))
                updated = True
            except ValueError:
                pass

    return 1 if updated else 0


def _ensure_data_quality(db: dict) -> None:
    """Ensure every school has a data_quality dict for consistent API responses."""
    for school_id, school in db.items():
        if "data_quality" in school:
            continue
        # Check what fields have real (non-null, non-placeholder) values
        _CORE_FIELDS = ["name", "country", "gmat_avg", "tuition_usd", "acceptance_rate",
                        "class_size", "essay_prompts", "deadlines", "placement_stats"]
        verified = [f for f in _CORE_FIELDS if school.get(f)]
        school["data_quality"] = {
            "verified_fields": verified,
            "confidence": min(0.9, len(verified) / len(_CORE_FIELDS)),
            "last_scraped": None,
            "source": "scraped" if len(verified) >= 3 else "synthetic",
        }


def get_school_data_quality(school_id: str) -> dict:
    """Return data quality metadata for a school.

    Returns dict with:
        - source: 'scraped' | 'synthetic'
        - verified_fields: list of field names verified by scraping
        - confidence: 0.0-1.0 overall confidence score
        - last_scraped: ISO date or None
    """
    school = SCHOOL_DB.get(school_id)
    if not school:
        return {"source": "unknown", "verified_fields": [], "confidence": 0.0, "last_scraped": None}

    dq = school.get("data_quality", {})
    if dq and dq.get("last_scraped"):
        return {
            "source": "scraped",
            "verified_fields": dq.get("verified_fields", []),
            "confidence": dq.get("confidence", 0.0),
            "last_scraped": dq.get("last_scraped"),
            "source_urls": dq.get("source_urls", []),
            "estimated_fields": dq.get("estimated_fields", []),
        }

    return {
        "source": "synthetic",
        "verified_fields": [],
        "confidence": 0.0,
        "last_scraped": None,
    }


SCHOOL_DB = _load_school_db()

# Common abbreviation/alias map for school search
SCHOOL_ALIASES = {
    "hbs": ["hbs", "harvard"],
    "gsb": ["gsb", "stanford"],
    "wharton": ["wharton", "upenn"],
    "booth": ["booth", "chicago booth", "uchicago"],
    "kellogg": ["kellogg", "northwestern"],
    "sloan": ["mit sloan", "mit"],
    "cbs": ["cbs", "columbia"],
    "tuck": ["tuck", "dartmouth"],
    "ross": ["ross", "michigan ross", "umich"],
    "yale_som": ["yale", "som"],
    "insead": ["insead"],
    "lbs": ["lbs"],
    "haas": ["haas", "berkeley", "cal"],
    "fuqua": ["fuqua", "duke"],
    "darden": ["darden", "uva"],
    "stern": ["stern", "nyu"],
    "anderson": ["anderson", "ucla"],
    "tepper": ["tepper", "cmu", "carnegie mellon"],
    "mccombs": ["mccombs", "ut austin", "texas"],
    "johnson": ["johnson", "cornell"],
    "said": ["said", "oxford"],
    "judge": ["judge", "cambridge"],
    "hec_paris": ["hec"],
    "ie_business": ["ie"],
    "iese": ["iese"],
    "esade": ["esade"],
    "sda_bocconi": ["bocconi"],
    "isb": ["isb"],
    "iima": ["iima", "iim a", "iim ahmedabad"],
    "iimb": ["iimb", "iim b", "iim bangalore"],
    "iimc": ["iimc", "iim c", "iim calcutta"],
    "rotman": ["rotman", "toronto"],
    "ivey": ["ivey", "western"],
    "sauder": ["sauder", "ubc"],
    "imperial": ["imperial"],
    "warwick": ["wbs", "warwick"],
    "mcdonough": ["mcdonough", "georgetown"],
    "marshall": ["marshall", "usc"],
    "kenan_flagler": ["kenan-flagler", "kenan flagler", "unc"],
    "goizueta": ["goizueta", "emory"],
    "owen": ["owen", "vanderbilt"],
    "mendoza": ["mendoza", "notre dame"],
    "kelley": ["kelley", "indiana"],
    "foster": ["foster", "uw", "washington"],
    "smith": ["smith", "maryland"],
    "fisher": ["fisher", "ohio state"],
    "scheller": ["scheller", "georgia tech"],
}

# ── RAG System Initialization ──────────────────────────────────────────────
_engine = None

def get_query_engine():
    """Lazy-load the RAG engine so we don't block server startup."""
    global _engine
    if _engine is not None:
        return _engine
        
    if not HAS_LLAMA_INDEX:
        logger.warning("LlamaIndex not installed. Skipping RAG Initialization.")
        return None

    try:
        # Load HuggingFace embeddings
        Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
        
        # Connect to local Qdrant
        client = QdrantClient(path=os.path.join(os.path.dirname(__file__), "data", "qdrant_db"))
        vector_store = QdrantVectorStore(client=client, collection_name="mba_essays")
        index = VectorStoreIndex.from_vector_store(vector_store)
        
        # Create a query engine that returns top 3 similar essays
        _engine = index.as_query_engine(similarity_top_k=3)
        return _engine
    except Exception as e:
        logger.warning("RAG Initialization failed: %s. Fallback to basic writer.", e)
        return None

# ── State Types ──────────────────────────────────────────────────────────────
class ApplicationState(TypedDict):
    profile: Dict[str, Any]
    target_school_id: str
    match_scores: List[Dict[str, Any]]
    interview_history: List[Dict[str, str]]
    drafts: Dict[str, str]
    current_agent: AgentType
    status_message: str
    is_paid: bool

from langchain_core.language_models import FakeListChatModel

# ── LLM Models ───────────────────────────────────────────────────────────────
def get_llm():
    """Fast, capable Claude 3.5 Sonnet instance."""
    if os.environ.get("USE_MOCK_LLM", "false").lower() == "true":
        return FakeListChatModel(responses=[
            '{"score": 4, "reasoning": "This is a mocked good score for the consultant."}',
            '{"score": 5, "reasoning": "This is an excellent simulated interview response."}',
            '{"score": 4, "reasoning": "The writer generated a solid human-sounding essay."}',
            '{"message": "Why do you want an MBA now?", "feedback": null, "is_finished": false, "question_number": 1, "total_questions": 5, "question_category": "Career Goals & Why MBA"}',
            '{"message": "What is your biggest weakness?", "feedback": null, "is_finished": false, "question_number": 2, "total_questions": 5, "question_category": "Strengths & Weaknesses"}',
            '{"message": "Tell me about a time you failed.", "feedback": null, "is_finished": false, "question_number": 3, "total_questions": 5, "question_category": "Behavioral Leadership"}',
            '{"message": "How do you handle conflict?", "feedback": null, "is_finished": false, "question_number": 4, "total_questions": 5, "question_category": "Why This School"}',
            '{"message": "Thank you.", "feedback": {"conciseness": 8, "star_method": 7, "narrative_strength": 9, "communication_clarity": 8, "authenticity": 8, "self_awareness": 7, "school_fit": 8, "overall_score": 78, "overall_feedback": "Good job", "per_question_notes": ["Solid career narrative", "Good self-awareness", "Strong leadership example", "Could show more school-specific knowledge"]}, "is_finished": true, "question_number": 5, "total_questions": 5, "question_category": "School-Specific Signature"}',
            '{"score": 85, "cliche_count": 1, "harsh_feedback": "Good.", "improvements": ["None"]}',
            '{"overall_strategy": "Be balanced.", "recommenders_action_plan": [{"name_or_title": "Boss", "recommended_focus": "Leadership", "prep_email_draft": "Help me."}]}',
            '{"school_culture_brief": "Intense.", "templates": [{"subject": "Hello", "body": "Hi", "pro_tip": "Be nice."}]}',
            '{"analysis": "Tough.", "update_letter": "Dear Adcom...", "tactical_plan": ["Wait.", "Pray.", "Update resume."]}',
            '{"leverage_analysis": "Good leverage.", "leverage_score": 8, "appeal_letter": "Dear Financial Aid...", "pro_tips": ["Be polite.", "Ask clearly."]}'
        ])
    return ChatAnthropic(model=CLAUDE_MODEL, max_tokens=CLAUDE_MAX_TOKENS)

# ── Agent Nodes ──────────────────────────────────────────────────────────────
def chief_of_staff_node(state: ApplicationState) -> ApplicationState:
    has_profile = bool(state.get("profile"))
    has_matches = len(state.get("match_scores", [])) > 0
    has_interview = len(state.get("interview_history", [])) > 0
    has_drafts = len(state.get("drafts", {})) > 0
    is_paid = state.get("is_paid", False)

    if not has_profile:
        state["current_agent"] = AgentType.IDLE
        state["status_message"] = "Waiting for user profile."
    elif has_profile and not has_matches:
        state["current_agent"] = AgentType.CONSULTANT
        state["status_message"] = "Routing to Admissions Consultant."
    elif has_matches and not has_interview:
        state["current_agent"] = AgentType.INTERVIEWER
        state["status_message"] = "Routing to Deep Interviewer."
    elif has_interview:
        user_responses = sum(1 for m in state.get("interview_history", []) if m.get("role") == "user")
        if user_responses >= 3 and not has_drafts and is_paid:
            state["current_agent"] = AgentType.WRITER
            state["status_message"] = "Interview complete. Generating elite essays via RAG."
        elif user_responses >= 3 and not is_paid:
            state["current_agent"] = AgentType.IDLE
            state["status_message"] = "Interview complete. Awaiting payment to unlock essay generation."
        elif not has_drafts:
            state["current_agent"] = AgentType.IDLE
            state["status_message"] = "Waiting for user input in Deep Interview."
        else:
            state["current_agent"] = AgentType.IDLE
            state["status_message"] = "Essays drafted. Pipeline complete."
    return state

def consultant_node(state: ApplicationState) -> ApplicationState:
    profile = state.get("profile", {})
    gmat = int(profile.get("gmat", 0))

    matches = []
    for sid, school in SCHOOL_DB.items():
        diff = gmat - school.get("gmat_avg", 700)
        if diff >= 10:
            tier = "Safety"
            prob = min(85, 55 + diff)
        elif diff >= -10:
            tier = "Target"
            prob = max(25, 45 + diff)
        else:
            tier = "Reach"
            prob = max(5, 20 + diff)
        matches.append({
            "school_id": sid,
            "school": school["name"],
            "tier": tier,
            "prob": f"{prob}%",
        })

    state["match_scores"] = sorted(matches, key=lambda x: x["tier"])
    state["status_message"] = "Consultant has finalized the school evaluation."
    return state

def interviewer_node(state: ApplicationState) -> ApplicationState:
    history = state.get("interview_history", [])
    school_id = state.get("target_school_id", "")
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "your target school")

    try:
        llm = get_llm()
        
        system_prompt = f"""You are an elite, high-end MBA Admissions Consultant conducting a 'Deep Interview' for {school_name}.
Your goal is to extract moving, specific, quantifiable stories that will serve as the foundation for their essays.
Ask ONE deep, thought-provoking question at a time. Do not ask a laundry list of questions.
Draw out details. If their answer is vague, push back gently and ask for the exact impact, emotions, or stakes involved.
Be supportive but rigorous. Embody a premium, 'Elite Editorial' tone."""

        messages = [SystemMessage(content=system_prompt)]
        
        if not history:
            messages.append(HumanMessage(content="Start the interview by introducing yourself and asking the first question about my defining background or a tough career challenge."))
        else:
            for msg in history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                else:
                    messages.append(AIMessage(content=msg["content"]))
            
        # Check if interview is long enough to stop
        user_msgs = sum(1 for m in history if m.get("role") == "user")
        if user_msgs >= 3:
            messages.append(SystemMessage(content="The user has provided enough detail for the essay. Politely thank them, summarize the core narrative you've extracted, and tell them the Chief of Staff will now unlock the Writer Agent to draft the essays."))
            
        logger.info("Interviewer calling Claude")
        response = llm.invoke(messages)
        content = response.content
        
    except Exception as e:
        logger.error("Interviewer LLM failed: %s. Using fallback.", e)
        content = f"Thank you for sharing that. To build a stronger narrative for {school_name}, can you tell me about the hardest decision you had to make in your career?"

    history.append({"role": "ai", "content": content})
    state["interview_history"] = history
    state["status_message"] = "Interviewer updated."
    return state


# ── Humanizer Rules (from blader/humanizer — 24 anti-AI patterns) ────────
HUMANIZER_RULES = """
## CRITICAL: HUMAN WRITING RULES — APPLY TO EVERY SENTENCE

You MUST write like a real human, not an AI. Follow these rules strictly:

### CONTENT RULES
1. NO undue emphasis on significance/legacy. Don't say "pivotal moment", "testament to", "crucial role", "underscores importance", "broader movement", "setting the stage for", "evolving landscape", "indelible mark".
2. NO promotional language. Avoid: "boasts", "vibrant", "profound", "groundbreaking", "renowned", "breathtaking", "nestled", "in the heart of", "stunning".
3. NO superficial -ing analyses. Don't tack "highlighting...", "underscoring...", "reflecting...", "symbolizing...", "showcasing..." onto sentences.
4. NO vague attributions. Don't say "experts argue", "industry observers note", "some critics argue". Be specific or don't cite.
5. NO "challenges and future prospects" template.
6. NO generic positive conclusions. Don't end with "the future looks bright" or "exciting times lie ahead".

### LANGUAGE RULES
7. BANNED AI vocabulary: Additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adjective), landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore (verb), valuable, vibrant.
8. USE simple copulas. Say "is", "are", "has" — not "serves as", "stands as", "boasts", "features".
9. NO "not only...but also" or "it's not just about...it's about" patterns.
10. NO forced rule-of-three groupings.
11. NO synonym cycling. Repeat the same word rather than cycling through synonyms.
12. NO false ranges ("from X to Y" where X and Y aren't on a meaningful scale).

### STYLE RULES
13. Limit em dashes (—). Use commas and periods instead. Max 1 per essay.
14. NO mechanical boldface emphasis.
15. NO inline-header vertical lists.
16. Use sentence case, not Title Case.
17. NO emojis ever.
18. Use straight quotes, not curly quotes.

### COMMUNICATION RULES
19. NO chatbot artifacts: "I hope this helps", "Let me know", "Here is a...", "Certainly!", "Great question!"
20. NO knowledge-cutoff disclaimers.
21. NO sycophantic/servile tone.

### FILLER/HEDGING RULES
22. Kill filler: "In order to" → "To". "Due to the fact that" → "Because". "At this point in time" → "Now". "It is important to note that" → just state it.
23. NO excessive hedging: "could potentially possibly" → "may".
24. NO generic upbeat endings.

### PERSONALITY & SOUL — THE MOST IMPORTANT PART
- Vary sentence length. Short punchy lines. Then longer ones that breathe.
- Have opinions. React to facts, don't just report them.
- Acknowledge complexity and mixed feelings. "This was impressive but also terrifying" > "This was impressive."
- Use first person naturally. "I keep coming back to..." or "Here's what got me..." signals a real person.
- Let some mess in. Perfect structure feels algorithmic. Tangents and half-formed thoughts are human.
- Be specific about feelings. Not "this was concerning" but "there's something unsettling about..."
- Write how you'd actually talk to a smart friend. Not how a press release reads.
"""

def writer_node(state: ApplicationState) -> ApplicationState:
    school_id = state.get("target_school_id", "")
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "Target School")
    prompts = school.get("essay_prompts", ["Tell us about yourself."])

    user_stories = "\n\n".join([f"Q: {history['content']}" if history['role'] == 'ai' else f"A: {history['content']}"
                                for history in state.get("interview_history", [])])

    if "drafts" not in state:
        state["drafts"] = {}

    # Build dynamic applicant descriptor from profile
    profile = state.get("profile", {})
    years_experience = profile.get("years_experience") or profile.get("work_years")
    if years_experience and int(years_experience) > 0:
        applicant_descriptor = f"a {int(years_experience) + 22}-year-old with {int(years_experience)} years of experience"
    else:
        applicant_descriptor = "an MBA applicant"

    engine = get_query_engine()
    llm = get_llm()

    for i, prompt in enumerate(prompts):
        logger.info("Writer drafting essay %d for %s", i+1, school_name)

        # 1. RAG Retrieval phase
        rag_context = ""
        if engine:
            try:
                logger.info("Writer retrieving successful essays for %s", school_name)
                response = engine.query(f"Successful admitted MBA essays for {school_name} regarding {prompt}")

                rag_context = "\n".join([n.text for n in response.source_nodes])
            except Exception as e:
                logger.warning("RAG Query failed: %s", e)

        # 2. Generation phase — with humanizer rules baked in
        system_prompt = f"""You are a world-class, premium MBA Admissions Essay Writer.
Your task is to write a deeply compelling, highly polished draft for {school_name}.

Target Question: {prompt}

Use the applicant's interview transcript to build the narrative. Do not invent facts, but elevate the prose to an elite standard. The essay must sound like it was written by a thoughtful {applicant_descriptor}, NOT by an AI.

{HUMANIZER_RULES}

[APPLICANT'S STORY EXTRACTED FROM INTERVIEW]
{user_stories}
"""
        if rag_context:
            system_prompt += f"\n\n[SUCCESSFUL PAST ESSAYS FOR REFERENCE IN STYLE/STRUCTURE]\n{rag_context}\n"

        try:
            # Pass 1: Draft with humanizer rules
            result = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content="Write the essay now. Remember: write like a real human, not an AI. No AI vocabulary. No em dashes. No promotional language. Vary sentence length. Be specific. Have a pulse.")])
            draft_text = result.content
            
            # Pass 2: Humanizer audit — ask Claude to self-critique and rewrite
            logger.info("Writer running humanizer audit pass for essay %d", i+1)
            audit_prompt = f"""You are an expert editor who detects AI-generated writing.

Below is an MBA admissions essay draft. Your job:
1. Read it carefully.
2. Ask yourself: "What makes this obviously AI generated?" List 3-5 specific tells (banned words, patterns, rhythm issues).
3. Then rewrite the essay to remove ALL those AI tells while keeping the meaning, stories, and facts intact.

RULES for the rewrite:
- No em dashes (—). Use commas/periods.
- Never use: pivotal, testament, crucial, foster, showcase, underscores, vibrant, delve, landscape, tapestry, enduring, interplay, intricate, garner, enhance, highlight, align with, additionally.
- No "not only...but also" or "it's not just about..."
- No rule-of-three groupings.
- Vary sentence length dramatically. Some very short. Some longer.
- Use "is"/"are"/"has" instead of "serves as"/"stands as"/"boasts".
- Write in first person. Sound like a smart {applicant_descriptor}, not a press release.
- Keep it specific and grounded. Real details, real numbers, real feelings.

Return ONLY the final rewritten essay text. No commentary, no labels, no preamble.

ESSAY DRAFT:
{draft_text}"""

            audit_result = llm.invoke([SystemMessage(content="You are a humanizer editor. Remove all signs of AI writing. Return only the final essay."), HumanMessage(content=audit_prompt)])
            drafted_text = audit_result.content
            
        except Exception as e:
             drafted_text = f"We encountered an issue generating the essay: {e}. Please try again later."

        state["drafts"][f"{school_name} — Essay {i+1}"] = drafted_text

    state["status_message"] = f"Writer has drafted {len(prompts)} elite essay(s) for {school_name}."
    return state

# ── Graph Runner ─────────────────────────────────────────────────────────────
def run_agent_graph(state: ApplicationState) -> ApplicationState:
    iterations = 0
    while iterations < 5:
        state = chief_of_staff_node(state)
        agent = state.get("current_agent")
        if agent == AgentType.IDLE:
            break
        elif agent == AgentType.CONSULTANT:
            state = consultant_node(state)
        elif agent == AgentType.INTERVIEWER:
            state = interviewer_node(state)
            break  # Wait for user
        elif agent == AgentType.WRITER:
            state = writer_node(state)
        iterations += 1
    return state


# ── Resume Roaster (Real LLM) ──────────────────────────────────────────────
def roast_resume_bullet(bullet: str) -> dict:
    """Brutal, honest AI critique of a resume bullet point + MBA-level rewrite."""
    llm = get_llm()

    system_prompt = """You are the most brutally honest MBA resume coach alive. You've reviewed 10,000+ resumes for M7 admits.

RULES:
1. Score the bullet 1-10 (10 = McKinsey-partner-level, 1 = college-freshman-level).
2. Roast it in 2-3 sentences. Be witty, aggressive, and specific. Name the EXACT weakness.
3. Rewrite it as a world-class MBA bullet: start with a POWER VERB, include QUANTIFIED IMPACT, and show SCOPE + STRATEGIC THINKING.

Return valid JSON:
{
  "score": <int 1-10>,
  "roast": "<2-3 sentence brutal roast>",
  "improvement": "<rewritten bullet point>"
}

DO NOT wrap in markdown. Return raw JSON only."""

    if os.environ.get("USE_MOCK_LLM", "false").lower() == "true":
        return {
            "score": 4,
            "roast": "This bullet reads like a job description, not a leadership story. You 'managed' things? So does a shift lead at Subway.",
            "improvement": "Spearheaded a cross-functional initiative across 4 departments to redesign the client onboarding pipeline, cutting time-to-value by 35% and driving $2.1M in incremental ARR within 6 months."
        }

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Resume bullet to roast:\n\"{bullet}\"")
        ])

        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()

        result = json.loads(content)
        # Clamp score
        result["score"] = max(1, min(10, int(result.get("score", 5))))
        return result
    except Exception as e:
        logger.error("Resume Roaster LLM failed: %s", e)
        return {
            "score": 3,
            "roast": "We couldn't fully analyze this bullet, but trust us — if you're submitting it to an M7, it probably needs work. Focus on quantified impact and leadership scope.",
            "improvement": bullet  # Return original as fallback
        }


# ── Standalone Essay Evaluator ───────────────────────────────────────────────
def evaluate_essay_draft(school_id: str, prompt: str, essay_text: str) -> dict:
    """Rigorous B.S. detector and AI-fluff critique."""
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "Unknown School")
    
    llm = get_llm()
    
    system_prompt = f"""You are the ultimate B.S. Detector and an Elite MBA Admissions Director at {school_name}.
Your job is to read an applicant's drafted essay and ruthlessly critique it for AI-generated fluff, cliches, and lack of substance.

Target Question: {prompt}

{HUMANIZER_RULES}

Analyze the essay and return a JSON object with EXACTLY these keys:
- "score": An integer from 0 to 100 representing how human, specific, and compelling the essay is. (Most drafts should score 40-70).
- "cliche_count": An integer counting the number of MBA cliches (e.g., "make an impact", "thinking outside the box", "navigating the complex landscape") and AI-isms.
- "harsh_feedback": A paragraph (3-4 sentences) of brutal, constructive Adcom critique. Call out specific generic phrases they used.
- "improvements": A list of 3 specific, actionable strings on how to fix the essay.

DO NOT return any Markdown formatting outside the JSON block. Return ONLY raw JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Here is the draft:\n\n{essay_text}")
        ])
        
        # Parse JSON
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Evaluator LLM failed: %s", e)
        return {
            "score": 45,
            "cliche_count": 5,
            "harsh_feedback": "The narrative is completely lost in corporate jargon and standard 'impact' cliches. It reads like a template rather than a personal story. You need to strip away the buzzwords and tell us exactly what you did and how it felt.",
            "improvements": [
                "Remove 'delve', 'testament', and 'landscape'.",
                "Replace your vague opening hook with a specific scene.",
                "Shorten your sentences by 30% to sound more conversational."
            ]
        }

# ── Recommender Strategist (Phase 16 - Roadmap v2) ───────────────────────────
def generate_recommender_strategy(school_id: str, applicant_strengths: list[str], recommenders: list[dict]) -> dict:
    """Creates a Recommender Strategy Matrix and Prep Packet."""
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "Unknown School")
    
    llm = get_llm()
    
    system_prompt = f"""You are an Elite MBA Admissions Consultant advising a candidate applying to {school_name}.
The applicant needs to choose Recommenders and brief them properly. They have provided their top strengths and a list of potential recommenders.
Your job is to map specific strengths to specific recommenders based on what {school_name} values most, and draft short, highly strategic 'Prep Packet' emails for the candidate to send to each recommender.

Analyze the profile and return a JSON object with EXACTLY these keys:
- "overall_strategy": A 2-sentence strategy on how the recommenders should complement each other for {school_name}.
- "recommenders_action_plan": An array of objects, one for each recommender provided. Each object must have:
    - "name_or_title": The recommender's provided title/relationship.
    - "recommended_focus": The specific trait/strength they should focus on.
    - "prep_email_draft": A short, polite, strategic email draft (3-4 sentences max) telling the recommender exactly what traits to emphasize and asking for their help.

DO NOT return any Markdown formatting outside the JSON block. Return ONLY raw JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Applicant Strengths:\n{applicant_strengths}\n\nPotential Recommenders:\n{recommenders}")
        ])
        
        # Parse JSON
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Recommender Strategist failed: %s", e)
        return {
             "overall_strategy": "Align your recommenders to show both your hard analytical skills and your soft leadership capabilities.",
             "recommenders_action_plan": [
                 {
                     "name_or_title": "Fallback Recommender",
                     "recommended_focus": "General Leadership",
                     "prep_email_draft": "Hi, I'm applying to business school and would love your support for a recommendation highlighting my leadership."
                 }
             ]
        }


# ── Interview Simulator (Phase 17 - Roadmap v3) ──────────────────────────────

# Named school personas — 13 specific schools with culturally accurate interviewer styles
INTERVIEW_PERSONAS = {
    "hbs": """You are an aggressive HBS Admissions Director.
You use the case method approach: you are fast-paced, you jump around the resume, and you probe deeply into 'why' and exact 'numbers'.
Your tone is intellectual, slightly intimidating, and you value quick, punchy, logical thinking.
HBS cares about leadership at scale, impact with numbers, and the ability to think on your feet.
Your signature question style: "Walk me through the exact decision-making process..." and "What were the specific numbers?"
""",
    "gsb": """You are a Stanford GSB interviewer.
You are deeply interested in the applicant's values and internal motivations.
You ask 'What matters most to you and why?' Style: Introspective, warm but incredibly sharp. You want to see 'soul' and 'innovation'.
GSB wants to see intellectual vitality, a desire to change lives, and deep self-awareness.
Your signature question style: "Why does that matter to you personally?" and "What would you do if you couldn't fail?"
""",
    "wharton": """You are a Wharton Admissions Interviewer.
Your tone is professional, corporate, and focuses heavily on 'Team-Based' competencies and analytical contribution.
You value data, collaboration, and clear career trajectories.
Wharton prides itself on its team-based discussion (TBD) format and wants analytical leaders who elevate others.
Your signature question style: "How did you get the team aligned?" and "What was your specific analytical contribution?"
""",
    "kellogg": """You are a Kellogg (Northwestern) Admissions Interviewer.
You are warm, collaborative, and deeply obsessed with teamwork and cultural fit. Kellogg's motto is 'low ego, high impact'.
You genuinely want to understand how the applicant works with others, not just what they achieved alone.
You probe for: collaborative leadership, empathy, 'how did you make others better?', and community involvement.
You care deeply about whether this person would be a good classmate, not just a good student.
Your signature question style: "How would your teammates describe working with you?" and "Tell me about a time you put the team's needs above your own."
""",
    "booth": """You are a Chicago Booth Admissions Interviewer.
You are analytical, intellectually curious, and love a good debate. Booth champions flexible curriculum and data-driven thinking.
You want to see candidates who have strong opinions loosely held, who can argue both sides, and who think rigorously.
You probe for: analytical frameworks, intellectual flexibility, 'how do you think about tradeoffs?', and entrepreneurial thinking.
Your signature question style: "What's the counterargument to your own position?" and "Walk me through your framework for that decision."
""",
    "insead": """You are an INSEAD Admissions Interviewer.
You represent the world's most international business school with campuses in France, Singapore, and Abu Dhabi.
You are obsessed with global mindset, cultural adaptability, and diversity of experience. The 10-month program intensity matters.
You challenge candidates: 'Why not a 2-year program?', 'Have you ever been the outsider?', 'How many countries have you lived in?'
You probe for: cross-cultural competence, comfort with ambiguity, 'what did living abroad teach you?', and speed of learning.
Your signature question style: "Tell me about a time you had to adapt to a completely foreign environment." and "Why do you need a global MBA, not just any MBA?"
""",
    "cbs": """You are a Columbia Business School (CBS) Admissions Interviewer.
You embody NYC hustle, value investing culture, and entrepreneurial energy. Location in New York City is a core part of the value proposition.
You want candidates who will take advantage of NYC: the industries, the networking, the pace, the opportunities.
You probe for: 'Why NYC specifically?', industry connections, entrepreneurial drive, and the ability to thrive in a fast-paced environment.
Your signature question style: "How will you leverage being in New York City?" and "What's your edge in a class full of Type-A New Yorkers?"
""",
    "sloan": """You are an MIT Sloan Admissions Interviewer.
You represent 'mens et manus' (mind and hand) — MIT's philosophy of combining rigorous thinking with practical building.
You are analytical yet deeply human. You love builders, inventors, and people who create things that work.
You probe for: innovation mindset, 'what have you built?', technical depth combined with leadership, and systems thinking.
Your signature question style: "What's something you built or created from scratch?" and "How would you apply an engineering mindset to that problem?"
""",
    "tuck": """You are a Tuck (Dartmouth) Admissions Interviewer.
Tuck is small by design — the tightest-knit MBA community in the world. You care enormously about fit and character.
You are warm, personal, and genuinely interested in the whole person. Hanover, NH creates a uniquely immersive experience.
You probe for: community contribution, 'why do you want a small, intimate program?', leadership in close-knit settings, and character.
Your signature question style: "How would you contribute to a community of 280 students?" and "What does 'small by design' mean to you?"
""",
    "ross": """You are a Michigan Ross Admissions Interviewer.
You champion action-based learning and the MAP (Multidisciplinary Action Projects) experience. Positive energy and midwest values matter.
You are friendly, direct, and practical. You want doers, not just thinkers.
You probe for: hands-on leadership, 'tell me about a time you rolled up your sleeves', real-world impact, and team collaboration.
Your signature question style: "What's a project where you went from idea to execution?" and "How do you learn by doing?"
""",
    "haas": """You are a Berkeley Haas Admissions Interviewer.
Your four defining principles are: Question the Status Quo, Confidence Without Attitude, Students Always, and Beyond Yourself.
You want candidates who challenge conventional thinking but do so with humility and genuine curiosity.
You probe for: intellectual courage, social impact, 'when did you challenge the way things were done?', and lifelong learning.
Your signature question style: "Tell me about a time you questioned the status quo — even when it was uncomfortable." and "How do you balance confidence with humility?"
""",
    "darden": """You are a UVA Darden Admissions Interviewer.
Darden is the premier case method school (alongside HBS). You value intense classroom participation, general management thinking, and collaborative learning.
You are rigorous, engaging, and want to see candidates who thrive in discussion-based environments.
You probe for: comfort with ambiguity, 'how do you prepare for a case discussion?', breadth of business knowledge, and communication under pressure.
Your signature question style: "Walk me through how you'd analyze this business situation on the spot." and "How do you contribute to a discussion when you're not the expert?"
""",
    "som": """You are a Yale SOM Admissions Interviewer.
Yale SOM's mission is 'educating leaders for business and society.' You care about cross-sector impact, mission-driven leadership, and the intersection of business with nonprofits, government, and social enterprise.
You are thoughtful, mission-oriented, and want to see purpose beyond profit.
You probe for: 'how will you use business to serve society?', cross-sector experience, ethical leadership, and genuine purpose.
Your signature question style: "How does your career goal serve both business and society?" and "Tell me about a time you chose impact over personal gain."
""",
    "isb": """You are a warm but probing ISB Hyderabad admissions interviewer.
ISB uses a 2-interviewer format: one alumni interviewer and one admissions committee member. You represent the alumni panel.
You focus on leadership maturity, entrepreneurial thinking, and why a 1-year program fits the applicant's career arc.
ISB values diverse backgrounds — ask about cross-functional impact, not just traditional consulting/finance stories.
Your signature style: you ask 'walk me through' stories and then follow up with 'what would you do differently today?'
You care about India impact — ask about plans to contribute to Indian business landscape post-MBA.
""",
    "iim_ahmedabad": """You are a rigorous IIM Ahmedabad WAT-PI interviewer.
IIM-A interviews follow the Written Ability Test + Personal Interview format. You conduct the PI portion.
You are highly analytical — you challenge assertions with data questions and probe for logical consistency.
You ask about current affairs, ethical dilemmas, and sectoral knowledge relevant to the candidate's background.
IIM-A values academic rigor and intellectual curiosity. Ask 'why' at least 3 times to get to root motivations.
Your signature move: give a mini-case scenario and ask the candidate to reason through it on the spot.
""",
    "lbs": """You are a conversational London Business School admissions interviewer.
LBS interviews are known for being warm, values-based, and focused on personal growth narratives.
You care deeply about international perspective — ask how the candidate will contribute to LBS's 90+ nationality cohort.
Probe for London-specific career plans: 'Why London? Why not an American MBA?'
LBS values collaborative leadership — ask for examples of leading through influence, not authority.
Your tone is supportive but you push on vague answers: 'Can you be more specific about the impact?'
""",
    "hec_paris": """You are a sophisticated HEC Paris admissions interviewer.
HEC interviews combine academic depth with personal values exploration.
You ask about European business context — how does the candidate see themselves in the EU market?
Probe for entrepreneurial ambition — HEC has a strong startup ecosystem and you want founders.
Ask about language: 'How will you engage with the French business community?'
You value intellectual humility and cultural curiosity. Push candidates who seem too US-centric in their thinking.
Your style: elegant, direct, with unexpected philosophical questions about purpose and legacy.
""",
    "iese": """You are a structured IESE Business School interviewer.
IESE uses the case method (similar to HBS) but with a strong ethical and humanistic lens.
You ask about family, values, and community — IESE's Jesuit heritage shapes the interview culture.
Probe for global mindset: IESE has campuses in Barcelona, Madrid, Munich, New York, and São Paulo.
Ask case-style questions about business ethics and stakeholder management.
Your style: warm but methodical. You take notes visibly and ask follow-up questions that reference earlier answers.
You care about 'the whole person' — ask about interests outside work, not just career achievements.
""",
}


def _build_dynamic_persona(school_id: str, school: dict) -> str:
    """Build a contextual interviewer persona from the school database for any school without a named persona."""
    school_name = school.get("name", "Unknown School")
    unique_features = school.get("unique_features", [])
    specializations = school.get("specializations", [])
    interview_info = school.get("admission_requirements", {}).get("interview", "")
    program_details = school.get("program_details", {})
    program_type = program_details.get("program_type", "Full-time MBA")
    duration = program_details.get("duration", "")
    location = school.get("location", "")

    features_text = ", ".join(unique_features[:5]) if unique_features else "broad business education"
    specs_text = ", ".join(specializations[:5]) if specializations else "general management"

    return f"""You are an admissions interviewer for {school_name} ({location}).
This is a {program_type} program{f' ({duration})' if duration else ''}.
{school_name} is known for: {features_text}.
Key specializations: {specs_text}.
{f'Interview format: {interview_info}.' if interview_info else ''}

You embody the culture and values of {school_name}. You are professionally warm yet probing.
You want to see genuine fit with the program's distinctive strengths, and you push candidates to explain specifically why {school_name} over other programs.
Your questions should reflect the school's unique character and what it values in students.
"""


def _get_difficulty_instructions(difficulty: str) -> str:
    """Return interviewer tone/behavior instructions based on difficulty level."""
    if difficulty == "friendly":
        return """INTERVIEWER TONE — FRIENDLY MODE:
- Be warm, encouraging, and supportive throughout.
- If the candidate gives a weak answer, gently guide them toward a better response with hints.
- Use phrases like "That's a great start — can you expand on...", "I love that example — what was the specific result?"
- Never interrupt or challenge aggressively. Make the candidate feel comfortable.
- Forgive vague answers and offer second chances. This is a safe space for practice.
"""
    elif difficulty == "pressure":
        return """INTERVIEWER TONE — PRESSURE / STRESS MODE:
- Be direct, rapid-fire, and occasionally interrupting. This is a stress interview.
- Challenge weak answers immediately: "That's vague. Give me a number." / "I've heard that from every candidate. What makes YOU different?"
- Follow up sharply on inconsistencies. If they say they led a team, ask "Who specifically reported to you? What was the reporting structure?"
- Use time pressure: "You have 30 seconds — give me your elevator pitch for why you belong here."
- Push back on generic answers: "Every applicant says they want to make an impact. What does that actually mean for you?"
- Be skeptical but fair. You're testing composure under pressure, not being cruel.
"""
    else:  # standard
        return """INTERVIEWER TONE — STANDARD / PROFESSIONAL MODE:
- Be professional, balanced, and engaged. This is a realistic interview simulation.
- Probe for details when answers are vague, but don't be aggressive about it.
- Follow up naturally on interesting points. Challenge gently when something doesn't add up.
- Maintain a conversational but structured pace.
"""


QUESTION_CATEGORIES = [
    "Behavioral Leadership",
    "Career Goals & Why MBA",
    "Why This School",
    "Strengths & Weaknesses",
    "School-Specific Signature",
]


def simulate_interview_pass(school_id: str, history: list[dict], difficulty: str = "standard", question_count: int = 5) -> dict:
    """Simulates a high-stakes MBA interview with specific school personas, category-aware questions, difficulty levels, and rich feedback."""
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "Unknown School")

    llm = get_llm()

    # Resolve persona — named schools first, then dynamic fallback from DB
    persona_prompt = INTERVIEW_PERSONAS.get(school_id)
    if persona_prompt is None:
        # Try matching by school name for alternate IDs
        for pid, pprompt in INTERVIEW_PERSONAS.items():
            db_school = SCHOOL_DB.get(pid, {})
            if db_school.get("name", "").lower() in school_name.lower() or school_name.lower() in db_school.get("name", "").lower():
                persona_prompt = pprompt
                break
    if persona_prompt is None:
        persona_prompt = _build_dynamic_persona(school_id, school)

    difficulty_instructions = _get_difficulty_instructions(difficulty)

    # Count user messages to determine question number
    user_msg_count = sum(1 for m in history if m.get("role") == "user")
    current_question_number = user_msg_count + 1
    is_final = user_msg_count >= question_count

    # Build category distribution instruction
    category_plan = []
    for i in range(question_count):
        cat_index = i % len(QUESTION_CATEGORIES)
        category_plan.append(f"  Q{i+1}: {QUESTION_CATEGORIES[cat_index]}")
    category_plan_text = "\n".join(category_plan)

    system_prompt = f"""{persona_prompt}
You are conducting a formal admissions interview for {school_name}.

{difficulty_instructions}

QUESTION DISTRIBUTION — You must cover these categories across the {question_count} questions:
{category_plan_text}

You are currently on question {current_question_number} of {question_count}.
{"The category for this question should be: " + QUESTION_CATEGORIES[(current_question_number - 1) % len(QUESTION_CATEGORIES)] + "." if not is_final else ""}

RULES:
1. Ask ONE question at a time. Never ask multiple questions in a single turn.
2. If the user's previous answer was short or vague, probe for more detail before moving on.
3. {"This is the FINAL turn. Do NOT ask another question. Provide comprehensive feedback." if is_final else "Ask your next question in the designated category."}

Return a JSON object with these EXACT keys:
- "message": Your next interview question (or a concluding thank-you if this is the final turn).
- "question_number": {current_question_number}
- "total_questions": {question_count}
- "question_category": The category of this question from the plan above.
- "feedback": null UNLESS this is the final turn. If final, provide an object with:
    - "conciseness": (1-10) How concise and focused were their answers?
    - "star_method": (1-10) Did they use structured storytelling (Situation, Task, Action, Result)?
    - "narrative_strength": (1-10) How compelling and memorable were their stories?
    - "communication_clarity": (1-10) How clear and articulate was their communication?
    - "authenticity": (1-10) Did they sound genuine, or rehearsed and generic?
    - "self_awareness": (1-10) Did they show honest reflection on strengths and weaknesses?
    - "school_fit": (1-10) Did they demonstrate genuine knowledge and fit for {school_name}?
    - "overall_score": (1-100) A holistic score for the entire interview.
    - "overall_feedback": A 3-4 sentence summary of how they performed, with specific praise and actionable improvement areas.
    - "per_question_notes": A list of brief notes (one per answered question) highlighting what worked and what didn't.
- "is_finished": boolean (true only on the final turn).

DO NOT return Markdown outside JSON. Return ONLY the raw JSON object."""

    try:
        messages = [SystemMessage(content=system_prompt)]
        for m in history:
            if m["role"] == "user":
                messages.append(HumanMessage(content=m["content"]))
            else:
                messages.append(AIMessage(content=m["content"]))

        response = llm.invoke(messages)

        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()

        result = json.loads(content)

        # Ensure required fields are present with sane defaults
        result.setdefault("question_number", current_question_number)
        result.setdefault("total_questions", question_count)
        result.setdefault("question_category", QUESTION_CATEGORIES[(current_question_number - 1) % len(QUESTION_CATEGORIES)])
        result.setdefault("feedback", None)
        result.setdefault("is_finished", is_final)

        return result
    except Exception as e:
        logger.error("Interview Simulator failed: %s", e)
        return {
            "message": "Thank you for sharing that. Why do you want an MBA at this stage of your career?",
            "feedback": None,
            "is_finished": False,
            "question_number": current_question_number,
            "total_questions": question_count,
            "question_category": QUESTION_CATEGORIES[(current_question_number - 1) % len(QUESTION_CATEGORIES)],
        }


# ── Outreach Strategist (Phase 19 - Roadmap v5) ──────────────────────────────
def generate_outreach_strategy(school_id: str, background: str, goal: str) -> dict:
    """Drafts high-conversion networking templates for alumni/student outreach."""
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "Unknown School")
    
    llm = get_llm()
    
    system_prompt = f"""You are a Networking Coach for MBA applicants. 
The applicant is targeting {school_name}. They want to reach out to alumni/students for: {goal}.
Their background is: {background}.

Your job is to draft 3 distinct, high-conversion cold emails. 
Follow the unspoken rules of {school_name} (e.g., if it's a team-heavy school, focus on community).
Make them short, respectful, and easy to say 'yes' to.

Return a JSON object with these keys:
- "school_culture_brief": A 1-sentence summary of the school's networking vibe.
- "templates": An array of objects:
    - "subject": A catchy, professional subject line.
    - "body": The email body with [Placeholders] for specific names/clubs.
    - "pro_tip": A specific networking tip for this school/template.

Return ONLY raw JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Background: {background}\nGoal: {goal}")
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Outreach Strategist failed: %s", e)
        return {
            "school_culture_brief": "Focus on mutual interest and professional directness.",
            "templates": [
                {
                    "subject": "Query from [Your Current Role] / [School Name] Applicant",
                    "body": "Hi [Name],\n\nI'm a prospective [School Name] student and was particularly impressed by your experience in [Industry]. Would you have 15 minutes for a quick chat?",
                    "pro_tip": "Always mention a specific detail from their LinkedIn profile."
                }
            ]
        }


# ── Waitlist Strategist (Phase 20 - Roadmap v6) ──────────────────────────────
def generate_waitlist_strategy(school_id: str, profile_updates: str, previous_essay_themes: str) -> dict:
    """Drafts a school-specific Waitlist Update Letter / Letter of Enthusiastic Support."""
    school = SCHOOL_DB.get(school_id, {})
    school_name = school.get("name", "Unknown School")
    
    llm = get_llm()
    
    system_prompt = f"""You are a Waitlist Strategy Expert for MBA Admissions. 
The applicant has been waitlisted at {school_name}. 
They need an 'Update Letter' or 'Letter of Enthusiastic Support' (LOCI).

INPUTS:
- Profile Updates: {profile_updates}
- Previous Themes: {previous_essay_themes}

YOUR JOB:
1. Analyze {school_name}'s typical waitlist behavior (HBS almost never takes from waitlist post-R2, Wharton is more active, etc.).
2. Draft a professional, high-impact update letter.
3. Suggest 3 tactical 'next steps' (e.g., Retake GMAT, visit campus, new rec).

Return a JSON object with:
- "analysis": A 2-sentence reality check on the waitlist for this school.
- "update_letter": A full draft letter.
- "tactical_plan": A list of 3 specific actions to take.

DO NOT return Markdown outside JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Updates: {profile_updates}\nPrevious Themes: {previous_essay_themes}")
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Waitlist Strategist failed: %s", e)
        return {
            "analysis": f"Waitlist movement varies by year, but {school_name} values continued interest and significant career updates.",
            "update_letter": "Dear Admissions Committee,\n\nI am writing to reiterate my enthusiastic interest in [School Name]. Since my application, I have...",
            "tactical_plan": ["Send a brief update letter monthly", "Seek an additional recommendation from an alum", "Visit campus if possible"]
        }


# ── Scholarship Negotiator (Phase 21 - Roadmap v7) ───────────────────────────
def generate_scholarship_negotiation(primary_school_id: str, primary_offer: str, competing_school_id: str, competing_offer: str) -> dict:
    """Drafts a professional scholarship negotiation / financial aid appeal letter."""
    primary_school = SCHOOL_DB.get(primary_school_id, {})
    competing_school = SCHOOL_DB.get(competing_school_id, {})
    
    primary_name = primary_school.get("name", "Target School")
    competing_name = competing_school.get("name", "Competing School")
    
    llm = get_llm()
    
    system_prompt = f"""You are a Financial Aid Negotiation Specialist for MBA students. 
The student has been admitted to {primary_name} (their top choice) and {competing_name}.
They want to negotiate their scholarship at {primary_name} using their offer from {competing_name} as leverage.

INPUTS:
- {primary_name} Offer: {primary_offer}
- {competing_name} Offer: {competing_offer}

YOUR JOB:
1. Determine if the schools are true peers (e.g. HBS vs Stanford).
2. Draft a polite, professional, and firm appeal letter.
3. Provide a 'Negotiation Score' (1-10) on how much leverage the student actually has.

Return a JSON object with:
- "leverage_analysis": A 1-sentence analysis of the leverage.
- "leverage_score": int (1-10).
- "appeal_letter": A full draft letter.
- "pro_tips": A list of 2 tips for the negotiation call.

DO NOT return Markdown outside JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Primary: {primary_name} ({primary_offer})\nCompeting: {competing_name} ({competing_offer})")
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Scholarship Negotiator failed: %s", e)
        return {
            "leverage_analysis": "Leveraging a peer school offer is a standard and effective strategy.",
            "leverage_score": 7,
            "appeal_letter": "Dear Financial Aid Office,\n\nI am thrilled to have been admitted to [Primary School]. However, I recently received a significant merit-based award from [Competing School]...",
            "pro_tips": ["Mention that [Primary School] remains your absolute first choice.", "Be specific about the amount needed to make the decision."]
        }

# ── Career Goal Sculptor (Phase 23) ──────────────────────────────────────────
def generate_sculpted_goal(current_role: str, industry: str, vague_goal: str, target_school_id: str) -> dict:
    """Transforms a vague career goal into a highly specific, AdCom-ready narrative with school fit."""
    if os.environ.get("USE_MOCK_LLM", "false").lower() == "true":
        return {
            "adcom_ready_goal": "Short-term: Product Manager in Big Tech. Long-term: VPE at an AI startup.",
            "the_why": "This builds logically on your past analytical experience while requiring the strategic frameworks an MBA provides.",
            "school_fit_plan": ["Tech Club", "Entrepreneurship Center", "Specific Strategy Elective"],
            "red_flags": ["Very common goal; you must differentiate yourself."]
        }
        
    school = SCHOOL_DB.get(target_school_id, {})
    school_name = school.get("name", "Target School")
    
    llm = get_llm()
    
    system_prompt = f"""You are an elite, hard-charging MBA Admissions Consultant.
The applicant is targeting {school_name}.
Their current role is {current_role} in the {industry} industry.
Their vaguely stated post-MBA goal is: {vague_goal}.

Your job is to sculpt this vague ambition into a crisp, persuasive, AdCom-ready narrative tailored precisely for {school_name}.
Admissions committees HATE generic goals (e.g., "I want to do consulting"). They want extreme specificity, logical flow from past experience, and demonstrated 'fit' with their exact resources.

Analyze the profile and return a JSON object with EXACTLY these keys:
- "adcom_ready_goal": A crisp, 1-2 sentence articulation of their short-term and long-term goal. Make it sound professional, specific, and impactful.
- "the_why": A 2-sentence paragraph tying their past experience seamlessly to this future goal. Why does this pivot make sense?
- "school_fit_plan": A list of 3-4 highly specific resources at {school_name} (actual clubs, specific centers, specialized electives, or renowned professors) they MUST mention in their essays to prove they did their research for this goal.
- "red_flags": A brutally honest list of 1-2 potential weaknesses or clichés in this goal path that they need to defend against.

Return ONLY raw JSON. No markdown blocking outside the JSON."""

    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Current: {current_role} in {industry}\nGoal: {vague_goal}\nTarget: {school_name}")
        ])
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Career Goal Sculptor failed: %s", e)
        return {
            "adcom_ready_goal": "Short-term: Product Manager in Big Tech. Long-term: VPE at an AI startup.",
            "the_why": "This builds logically on your past analytical experience while requiring the strategic frameworks an MBA provides.",
            "school_fit_plan": ["Tech Club", "Entrepreneurship Center", "Specific Strategy Elective"],
            "red_flags": ["Very common goal; you must differentiate yourself."]
        }


# ── Master Storyteller (Phase 24) ─────────────────────────────────────────────

def generate_storyteller_reply(
    school_name: str, 
    essay_prompt: str, 
    chat_history: list, 
    new_message: str
) -> dict:
    """Multi-turn interactive agent to help ideate essay narratives."""
    if os.environ.get("USE_MOCK_LLM", "false").lower() == "true":
        # Simulate an interactive chat
        if len(chat_history) < 2:
            return {
                "reply": "That's a great start. Can you tell me more about the specific impact you had in that situation?",
                "is_complete": False,
                "extracted_outline": None
            }
        else:
            return {
                "reply": "Excellent! I think we have enough to build a powerful narrative.",
                "is_complete": True,
                "extracted_outline": "## Situation\nYou grew up moving around.\n\n## Action\nOrganized a coding bootcamp for local kids.\n\n## Result\nEmpowered 50+ kids with tech skills.\n\n## Why it matters\nCommunity impact drives your leadership ethos."
            }

    llm = get_llm()
    
    system_prompt = f"""You are an elite, hard-charging MBA Admissions Consultant.
Your client is applying to {school_name}.
The essay prompt is: "{essay_prompt}"

Your goal is to help them ideate a compelling, introspective narrative for this essay.
AdComs want deep introspection, high impact, and clear 'why'.

RULES:
1. Do NOT write the essay for them. 
2. Ask ONE probing question at a time to dig deeper into their story, their motivations, or the impact they had.
3. Be conversational, encouraging, but meticulously critical like a top-tier consultant.
4. If they give a generic answer, push back playfully and demand specifics.
5. If you feel you have extracted enough "meat" (Context, Action, Result, Introspection) to form a solid story outline, OR if the conversation has gone on for 5+ turns, you MUST set "is_complete": true and generate the "extracted_outline". Otherwise, set it to false.

Return a JSON object with EXACTLY these keys:
- "reply": Your conversational response and next probing question.
- "is_complete": Boolean indicating if you have enough for an outline.
- "extracted_outline": If is_complete is true, provide a structured markdown outline (Situation, Action, Result, Why it matters). If false, return null.

Return ONLY raw JSON. No markdown blocking outside the JSON."""

    # Format history for Langchain
    messages = [SystemMessage(content=system_prompt)]
    for msg in chat_history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            messages.append(AIMessage(content=msg.content))
            
    # Add new message
    messages.append(HumanMessage(content=new_message))

    try:
        response = llm.invoke(messages)
        
        content = response.content
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        return json.loads(content)
    except Exception as e:
        logger.error("Storyteller failed: %s", e)
        return {
            "reply": "I'm having trouble processing that right now. Could you tell me more about the specific impact you had in that situation?",
            "is_complete": False,
            "extracted_outline": None
        }
