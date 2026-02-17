import type {
  ExtractedQuestion,
  GeneratedQuestion,
} from "../test-generator/schemas";

export type TestGeneratorStepKey =
  | "idle"
  | "convert"
  | "extract"
  | "curriculum"
  | "generate"
  | "export";

export type GenerationOptions = {
  includeSolutions: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
};

export type ResumeMode = "retry" | "continue";

export type ResumeSnapshot = {
  markdown?: string;
  extractedItems?: ExtractedQuestion[];
  generatedQuestions?: GeneratedQuestion[];
  failedGenerateIndex?: number;
};
