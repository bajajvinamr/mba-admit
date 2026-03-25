export {
  useSchools,
  useSchoolSearch,
  useSchool,
  schoolKeys,
  type SearchFilters,
  type SearchRequest,
  type SchoolSummary,
  type SearchResponse,
} from "./useSchools";

export {
  useEssayPrompts,
  essayPromptKeys,
  type EssayPrompt,
  type EssayPromptsResponse,
} from "./useEssayPrompts";

export {
  useInterviewQuestions,
  interviewKeys,
  type InterviewQuestion,
  type InterviewCategory,
  type InterviewSchoolInfo,
  type InterviewQuestionsResponse,
  type InterviewFilters,
} from "./useInterviews";

export {
  useOutcomes,
  outcomeKeys,
  type OutcomesResponse,
} from "./useOutcomes";
