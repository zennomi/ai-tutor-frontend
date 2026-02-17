import { create } from "zustand";

export type ObjectiveAnswer =
  | {
      kind: "MULTIPLE_CHOICE";
      answerIndex: number;
    }
  | {
      kind: "TRUE_FALSE";
      answers: Record<number, boolean>;
    };

export type QuestionAnswer =
  | ObjectiveAnswer
  | {
      kind: "ESSAY";
      text: string;
    };

export type ReviewItem = {
  score: number;
  maxScore: number;
  isAnswered: boolean;
  userAnswerText: string;
  correctAnswerText: string;
  essayFeedback?: string;
  essayStatus?: "graded" | "failed";
};

export type ResultSummary = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  answeredCount: number;
  questionCount: number;
  timeSpentSeconds: number;
  reviewItems: ReviewItem[];
};

export const TAKE_TEST_DEFAULT_DURATION_MINUTES = 15;
export const TAKE_TEST_MIN_DURATION_MINUTES = 1;
export const TAKE_TEST_MAX_DURATION_MINUTES = 180;

type TakeTestSessionState = {
  hasHydrated: boolean;
  activeQuestionIndex: number;
  answersByIndex: Record<number, QuestionAnswer>;
  bookmarkedIndices: number[];
  isStarted: boolean;
  durationMinutes: number;
  startedAt: number | null;
  timeLeftSeconds: number;
  isSubmitted: boolean;
  isSubmitting: boolean;
  resultSummary: ResultSummary | null;
  failedEssayIndices: number[];
  isQuestionNavOpen: boolean;
};

type TakeTestSessionActions = {
  hydrateSession: () => void;
  resetSession: () => void;
  setActiveQuestionIndex: (activeQuestionIndex: number) => void;
  setAnswerByIndex: (index: number, answer: QuestionAnswer) => void;
  toggleBookmarkedIndex: (index: number) => void;
  setDurationMinutes: (durationMinutes: number) => void;
  startTest: (params: {
    durationMinutes: number;
    startedAt: number;
    timeLeftSeconds: number;
  }) => void;
  setTimeLeftSeconds: (timeLeftSeconds: number) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setIsSubmitted: (isSubmitted: boolean) => void;
  setResultSummary: (resultSummary: ResultSummary | null) => void;
  setFailedEssayIndices: (failedEssayIndices: number[]) => void;
  setQuestionNavOpen: (isQuestionNavOpen: boolean) => void;
};

type TakeTestSessionStore = TakeTestSessionState & TakeTestSessionActions;

function createInitialState(): TakeTestSessionState {
  return {
    hasHydrated: false,
    activeQuestionIndex: 0,
    answersByIndex: {},
    bookmarkedIndices: [],
    isStarted: false,
    durationMinutes: TAKE_TEST_DEFAULT_DURATION_MINUTES,
    startedAt: null,
    timeLeftSeconds: TAKE_TEST_DEFAULT_DURATION_MINUTES * 60,
    isSubmitted: false,
    isSubmitting: false,
    resultSummary: null,
    failedEssayIndices: [],
    isQuestionNavOpen: false,
  };
}

export const useTakeTestSessionStore = create<TakeTestSessionStore>()(
  (set) => ({
    ...createInitialState(),
    hydrateSession: () => {
      set({ hasHydrated: true });
    },
    resetSession: () => {
      set({ ...createInitialState() });
    },
    setActiveQuestionIndex: (activeQuestionIndex) => {
      set({ activeQuestionIndex });
    },
    setAnswerByIndex: (index, answer) => {
      set((state) => ({
        answersByIndex: {
          ...state.answersByIndex,
          [index]: answer,
        },
      }));
    },
    toggleBookmarkedIndex: (index) => {
      set((state) => {
        if (state.bookmarkedIndices.includes(index)) {
          return {
            bookmarkedIndices: state.bookmarkedIndices.filter(
              (value) => value !== index
            ),
          };
        }

        return {
          bookmarkedIndices: [...state.bookmarkedIndices, index].sort(
            (left, right) => left - right
          ),
        };
      });
    },
    setDurationMinutes: (durationMinutes) => {
      set({ durationMinutes });
    },
    startTest: ({ durationMinutes, startedAt, timeLeftSeconds }) => {
      set({
        durationMinutes,
        startedAt,
        timeLeftSeconds,
        isStarted: true,
      });
    },
    setTimeLeftSeconds: (timeLeftSeconds) => {
      set({ timeLeftSeconds });
    },
    setIsSubmitting: (isSubmitting) => {
      set({ isSubmitting });
    },
    setIsSubmitted: (isSubmitted) => {
      set({ isSubmitted });
    },
    setResultSummary: (resultSummary) => {
      set({ resultSummary });
    },
    setFailedEssayIndices: (failedEssayIndices) => {
      set({ failedEssayIndices });
    },
    setQuestionNavOpen: (isQuestionNavOpen) => {
      set({ isQuestionNavOpen });
    },
  })
);
