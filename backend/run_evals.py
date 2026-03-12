import json
import time
from agents import get_llm, SCHOOL_DB, ApplicationState, chief_of_staff_node, consultant_node, interviewer_node, writer_node, AgentType
from eval_judge import evaluate_consultant, evaluate_interviewer, evaluate_writer
from logging_config import setup_logging

logger = setup_logging()

# Synthetic Ground Truth Profiles
TEST_PROFILES = [
    {
        "id": "profile_1_tech_pm",
        "description": "Tech PM aiming for HBS. High GMAT, good experience.",
        "profile": {
            "gmat": 750,
            "gpa": 3.8,
            "industry_background": "Product Management at Big Tech",
            "years_experience": 4
        },
        "target_school": "hbs",
        "simulated_user_responses": [
            "I launched a new AI feature that increased retention by 15%, but the hardest part was getting buy-in from the eng team who thought it was impossible.",
            "I built a working prototype over the weekend to show them it could work.",
            "I want an MBA to transition into venture capital and fund early-stage AI startups."
        ]
    },
    {
        "id": "profile_2_consultant",
        "description": "MBB Consultant aiming for GSB. Average GMAT for GSB, strong soft skills.",
        "profile": {
            "gmat": 730,
            "gpa": 3.6,
            "industry_background": "Management Consulting at MBB",
            "years_experience": 3
        },
        "target_school": "gsb",
        "simulated_user_responses": [
            "My most defining moment was leading a pro-bono education project in rural India.",
            "I realized that scaling impact requires not just good ideas, but sustainable financial models.",
            "I want to build an ed-tech startup focused on skills training for the global south."
        ]
    }
]

def run_eval_pipeline():
    logger.info("=================================")
    logger.info("Starting LLM-as-a-Judge Pipeline")
    logger.info("=================================")
    
    results = {
        "timestamp": time.time(),
        "profiles_tested": len(TEST_PROFILES),
        "scores": {
            "consultant": [],
            "interviewer": [],
            "writer": []
        },
        "logs": []
    }

    for idx, test_case in enumerate(TEST_PROFILES):
        logger.info("\n--- Evaluating Profile %d: %s ---", idx+1, test_case["id"])
        
        state: ApplicationState = {
            "profile": test_case["profile"],
            "target_school_id": test_case["target_school"],
            "match_scores": [],
            "interview_history": [],
            "drafts": {},
            "current_agent": AgentType.IDLE,
            "status_message": "",
            "is_paid": True # To allow writer
        }

        eval_log = {"profile_id": test_case["id"], "scores": {}}

        # 1. Test Consultant
        logger.info("Running Consultant...")
        state = consultant_node(state)
        consultant_score = evaluate_consultant(state["profile"], state["match_scores"])
        logger.info("Consultant Score: %s/5 - %s", consultant_score.get("score"), consultant_score.get("reasoning"))
        results["scores"]["consultant"].append(consultant_score.get("score", 0))
        eval_log["scores"]["consultant"] = consultant_score

        # 2. Test Interviewer (Simulate turning conversation)
        logger.info("Running Interviewer (Simulating User)...")
        # First AI question
        state = interviewer_node(state)
        
        for user_resp in test_case["simulated_user_responses"]:
            state["interview_history"].append({"role": "user", "content": user_resp})
            state = interviewer_node(state)

        interviewer_score = evaluate_interviewer(SCHOOL_DB[test_case["target_school"]]["name"], state["interview_history"])
        logger.info("Interviewer Score: %s/5 - %s", interviewer_score.get("score"), interviewer_score.get("reasoning"))
        results["scores"]["interviewer"].append(interviewer_score.get("score", 0))
        eval_log["scores"]["interviewer"] = interviewer_score

        # 3. Test Writer
        logger.info("Running Writer (2-pass Humanizer)...")
        state = writer_node(state)
        
        # Evaluate the first essay draft against the rules
        school_name = SCHOOL_DB[test_case["target_school"]]["name"]
        prompt = SCHOOL_DB[test_case["target_school"]].get("essay_prompts", [""])[0]
        essay_key = list(state["drafts"].keys())[0]
        draft = state["drafts"][essay_key]

        writer_score = evaluate_writer(school_name, prompt, draft, state["interview_history"])
        logger.info("Writer Score: %s/5 - %s", writer_score.get("score"), writer_score.get("reasoning"))
        results["scores"]["writer"].append(writer_score.get("score", 0))
        eval_log["scores"]["writer"] = writer_score

        results["logs"].append(eval_log)

    # Calculate Averages
    logger.info("\n=================================")
    logger.info("          FINAL SCORES           ")
    logger.info("=================================")
    
    avg_scores = {}
    for agent, scores in results["scores"].items():
        avg = sum(scores) / len(scores) if scores else 0
        avg_scores[agent] = round(avg, 2)
        logger.info("%s Average: %s/5", agent.capitalize(), round(avg, 2))
    
    results["averages"] = avg_scores

    # Save to disk
    with open("eval_results.json", "w") as f:
        json.dump(results, f, indent=2)
    logger.info("Saved full results to eval_results.json")

    return results

if __name__ == "__main__":
    run_eval_pipeline()
