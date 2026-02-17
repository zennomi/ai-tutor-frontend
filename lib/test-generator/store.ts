import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  TEST_GENERATOR_DEFAULT_TITLE,
  TEST_GENERATOR_PERSISTED_STATE_KEY,
  TEST_GENERATOR_PERSISTED_STATE_VERSION,
} from "@/lib/constants";
import type {
  ExtractedQuestion,
  GeneratedDocxResult,
  GeneratedQuestion,
  TestGeneratorPipelineStep,
  TestGeneratorStreamEvent,
} from "@/lib/test-generator/schemas";
import type {
  GenerationOptions,
  ResumeSnapshot,
  TestGeneratorStepKey,
} from "@/lib/types";

const TEST_GENERATOR_READY_MESSAGE = "Sẵn sàng tạo đề kiểm tra mới";

const TEST_GENERATOR_DEFAULT_OPTIONS = {
  includeSolutions: true,
  shuffleQuestions: false,
  shuffleChoices: false,
} satisfies GenerationOptions;

type TestGeneratorPersistedState = {
  title: string;
  locale: "vi" | "en";
  options: GenerationOptions;
  statusMessage: string;
  currentStep: TestGeneratorStepKey;
  progress: number;
  markdownPreview: string;
  extractedItems: ExtractedQuestion[];
  generatedItems: GeneratedQuestion[];
  generatedPartials: Record<number, unknown>;
  generatedResult: GeneratedDocxResult | null;
  failedStep: TestGeneratorPipelineStep | null;
  failedGenerateIndex: number | undefined;
  resumeSnapshot: ResumeSnapshot | null;
};

type TestGeneratorStoreState = TestGeneratorPersistedState & {
  file: File | null;
  isRunning: boolean;
  hasHydrated: boolean;
};

type TestGeneratorStoreActions = {
  setFile: (file: File | null) => void;
  setTitle: (title: string) => void;
  setLocale: (locale: "vi" | "en") => void;
  setIncludeSolutions: (includeSolutions: boolean) => void;
  setShuffleQuestions: (shuffleQuestions: boolean) => void;
  setShuffleChoices: (shuffleChoices: boolean) => void;
  setStatusMessage: (statusMessage: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  resetPipelineState: (options?: { keepPreview?: boolean }) => void;
  clearFailure: () => void;
  captureResumeSnapshot: (nextFailedGenerateIndex?: number) => ResumeSnapshot;
  applyEvent: (event: TestGeneratorStreamEvent) => void;
  clearSavedState: () => void;
};

type TestGeneratorStore = TestGeneratorStoreState & TestGeneratorStoreActions;

function createInitialState(): TestGeneratorStoreState {
  return {
    file: null,
    title: TEST_GENERATOR_DEFAULT_TITLE,
    locale: "vi",
    options: { ...TEST_GENERATOR_DEFAULT_OPTIONS },
    statusMessage: TEST_GENERATOR_READY_MESSAGE,
    currentStep: "idle",
    progress: 0,
    isRunning: false,
    markdownPreview: "",
    extractedItems: [],
    generatedItems: [],
    generatedPartials: {},
    generatedResult: null,
    failedStep: null,
    failedGenerateIndex: undefined,
    resumeSnapshot: null,
    hasHydrated: false,
  };
}

function createInitialPersistedState(): TestGeneratorPersistedState {
  const initialState = createInitialState();

  return {
    title: initialState.title,
    locale: initialState.locale,
    options: initialState.options,
    statusMessage: initialState.statusMessage,
    currentStep: initialState.currentStep,
    progress: initialState.progress,
    markdownPreview: initialState.markdownPreview,
    extractedItems: initialState.extractedItems,
    generatedItems: initialState.generatedItems,
    generatedPartials: initialState.generatedPartials,
    generatedResult: initialState.generatedResult,
    failedStep: initialState.failedStep,
    failedGenerateIndex: initialState.failedGenerateIndex,
    resumeSnapshot: initialState.resumeSnapshot,
  };
}

function mergePersistedState(
  persistedState: unknown
): TestGeneratorPersistedState {
  const baseState = createInitialPersistedState();
  const incomingState =
    (persistedState as Partial<TestGeneratorPersistedState> | undefined) ?? {};

  return {
    ...baseState,
    ...incomingState,
    options: {
      ...TEST_GENERATOR_DEFAULT_OPTIONS,
      ...incomingState.options,
    },
  };
}

export const useTestGeneratorStore = create<TestGeneratorStore>()(
  persist(
    (set, get) => ({
      ...createInitialState(),
      setFile: (file) => {
        set({ file });
      },
      setTitle: (title) => {
        set({ title });
      },
      setLocale: (locale) => {
        set({ locale });
      },
      setIncludeSolutions: (includeSolutions) => {
        set((state) => ({
          options: {
            ...state.options,
            includeSolutions,
          },
        }));
      },
      setShuffleQuestions: (shuffleQuestions) => {
        set((state) => ({
          options: {
            ...state.options,
            shuffleQuestions,
          },
        }));
      },
      setShuffleChoices: (shuffleChoices) => {
        set((state) => ({
          options: {
            ...state.options,
            shuffleChoices,
          },
        }));
      },
      setStatusMessage: (statusMessage) => {
        set({ statusMessage });
      },
      setIsRunning: (isRunning) => {
        set({ isRunning });
      },
      resetPipelineState: ({ keepPreview = false } = {}) => {
        set((state) => ({
          currentStep: "idle",
          progress: 0,
          statusMessage: TEST_GENERATOR_READY_MESSAGE,
          markdownPreview: keepPreview ? state.markdownPreview : "",
          extractedItems: keepPreview ? state.extractedItems : [],
          generatedItems: keepPreview ? state.generatedItems : [],
          generatedPartials: keepPreview ? state.generatedPartials : {},
          generatedResult: keepPreview ? state.generatedResult : null,
          failedStep: null,
          failedGenerateIndex: undefined,
          resumeSnapshot: null,
        }));
      },
      clearFailure: () => {
        set({ failedStep: null, failedGenerateIndex: undefined });
      },
      captureResumeSnapshot: (nextFailedGenerateIndex) => {
        const state = get();
        const generatedQuestions = state.generatedItems.filter(
          (item): item is GeneratedQuestion => Boolean(item)
        );

        const snapshot: ResumeSnapshot = {
          markdown: state.markdownPreview || undefined,
          extractedItems:
            state.extractedItems.length > 0 ? state.extractedItems : undefined,
          generatedQuestions,
          failedGenerateIndex: nextFailedGenerateIndex,
        };

        set({ resumeSnapshot: snapshot });

        return snapshot;
      },
      applyEvent: (event) => {
        if (event.event === "step") {
          set((state) => ({
            currentStep: event.step,
            statusMessage: event.message,
            progress:
              typeof event.progress === "number"
                ? event.progress
                : state.progress,
          }));
          return;
        }

        if (event.event === "markdown") {
          set({ markdownPreview: event.markdown });
          return;
        }

        if (event.event === "extracted") {
          set({ extractedItems: event.items });
          return;
        }

        if (event.event === "generated-partial") {
          set((state) => ({
            generatedPartials: {
              ...state.generatedPartials,
              [event.index]: event.partial,
            },
          }));
          return;
        }

        if (event.event === "generated-item") {
          set((state) => {
            const nextGeneratedItems = [...state.generatedItems];
            nextGeneratedItems[event.index] = event.item;

            const nextGeneratedPartials = { ...state.generatedPartials };
            delete nextGeneratedPartials[event.index];

            return {
              generatedItems: nextGeneratedItems,
              generatedPartials: nextGeneratedPartials,
            };
          });
          return;
        }

        if (event.event === "progress") {
          set({
            progress: event.progress,
            statusMessage: `Đã tạo ${event.completed}/${event.total} câu hỏi mới.`,
          });
          return;
        }

        if (event.event === "done") {
          set({
            generatedResult: event.result,
            progress: 100,
            statusMessage: `Hoàn tất! Đã tạo ${event.totalGenerated} câu hỏi và xuất DOCX thành công.`,
            failedStep: null,
            failedGenerateIndex: undefined,
            resumeSnapshot: null,
          });
          return;
        }

        if (event.event === "error") {
          set((state) => {
            const nextState: Partial<TestGeneratorStoreState> = {
              statusMessage: event.message,
              failedStep: event.failedStep ?? null,
              failedGenerateIndex: event.failedGenerateIndex,
            };

            if (event.canResume) {
              const generatedQuestions = state.generatedItems.filter(
                (item): item is GeneratedQuestion => Boolean(item)
              );

              nextState.resumeSnapshot = {
                markdown: state.markdownPreview || undefined,
                extractedItems:
                  state.extractedItems.length > 0
                    ? state.extractedItems
                    : undefined,
                generatedQuestions,
                failedGenerateIndex: event.failedGenerateIndex,
              };
            }

            return nextState;
          });
        }
      },
      clearSavedState: () => {
        set({ ...createInitialState(), hasHydrated: true });
        useTestGeneratorStore.persist.clearStorage();
      },
    }),
    {
      name: TEST_GENERATOR_PERSISTED_STATE_KEY,
      version: TEST_GENERATOR_PERSISTED_STATE_VERSION,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        title: state.title,
        locale: state.locale,
        options: state.options,
        statusMessage: state.statusMessage,
        currentStep: state.currentStep,
        progress: state.progress,
        markdownPreview: state.markdownPreview,
        extractedItems: state.extractedItems,
        generatedItems: state.generatedItems,
        generatedPartials: state.generatedPartials,
        generatedResult: state.generatedResult,
        failedStep: state.failedStep,
        failedGenerateIndex: state.failedGenerateIndex,
        resumeSnapshot: state.resumeSnapshot,
      }),
      migrate: (persistedState, persistedVersion) => {
        const mergedState = mergePersistedState(persistedState);

        if (persistedVersion < TEST_GENERATOR_PERSISTED_STATE_VERSION) {
          return {
            ...mergedState,
            currentStep: "idle",
            progress: 0,
            statusMessage: TEST_GENERATOR_READY_MESSAGE,
            failedStep: null,
            failedGenerateIndex: undefined,
          };
        }

        return mergedState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setIsRunning(false);
        useTestGeneratorStore.setState({ hasHydrated: true });
      },
    }
  )
);
