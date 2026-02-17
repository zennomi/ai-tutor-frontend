import { z } from "zod";

export const questionFormatSchema = z.enum([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "ESSAY",
]);

export const extractedQuestionSchema = z.object({
  format: questionFormatSchema,
  question: z.string().min(1),
  has_image: z.boolean(),
  key: z.string().min(1),
  solution: z.string().min(1),
});

export const extractedQuestionsSchema = z.array(extractedQuestionSchema);

const generatedQuestionCommonSchema = z.object({
  format: questionFormatSchema,
  question: z.string().min(1),
  solution: z.string().min(1),
  grade: z.number().int().positive(),
  textbook: z.string().min(1),
  unit: z.string().min(1),
  lesson: z.string().min(1),
  type: z.string().min(1),
});

const multipleChoiceQuestionSchema = generatedQuestionCommonSchema.extend({
  format: z.literal("MULTIPLE_CHOICE"),
  choices: z.array(z.string().min(1)).min(2),
  answer: z.number().int().nonnegative(),
});

const trueFalseQuestionSchema = generatedQuestionCommonSchema.extend({
  format: z.literal("TRUE_FALSE"),
  statements: z.array(z.string().min(1)).min(1),
  answers: z.array(z.boolean()).min(1),
});

const essayQuestionSchema = generatedQuestionCommonSchema.extend({
  format: z.literal("ESSAY"),
  answers: z.string().min(1),
});

const generatedQuestionBaseSchema = z.discriminatedUnion("format", [
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  essayQuestionSchema,
]);

export const generatedQuestionSchema = generatedQuestionBaseSchema;

export const generatedQuestionPartialSchema = z
  .object({
    format: questionFormatSchema.optional(),
    question: z.string().optional(),
    solution: z.string().optional(),
    grade: z.number().optional(),
    textbook: z.string().optional(),
    unit: z.string().optional(),
    lesson: z.string().optional(),
    type: z.string().optional(),
    choices: z.array(z.string()).optional(),
    answer: z.number().optional(),
    statements: z.array(z.string()).optional(),
    answers: z.union([z.array(z.boolean()), z.string()]).optional(),
  })
  .passthrough();

export const generatedQuestionsSchema = z.array(generatedQuestionSchema).min(1);

export const gradeEssayRequestSchema = z.object({
  question: z.string().min(1),
  expectedAnswer: z.string().min(1),
  studentAnswer: z.string(),
  locale: z.enum(["vi", "en"]).optional(),
});

export const gradeEssayResponseSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string().min(1),
});

export const generateDocxPayloadSchema = z.object({
  title: z.string().min(1),
  locale: z.enum(["vi", "en"]).optional(),
  questions: generatedQuestionsSchema,
  options: z
    .object({
      includeSolutions: z.boolean().optional(),
      shuffleQuestions: z.boolean().optional(),
      shuffleChoices: z.boolean().optional(),
    })
    .optional(),
  source: z
    .object({
      filename: z.string().optional(),
      markdown: z.string().optional(),
    })
    .optional(),
});

export const generatedDocxResultSchema = z
  .object({
    url: z.string().optional(),
    filename: z.string().optional(),
    path: z.string().optional(),
  })
  .refine((value) => Boolean(value.url || value.path), {
    message: "A generated DOCX result must include url or path",
  });

export const testGeneratorPipelineStepSchema = z.enum([
  "convert",
  "extract",
  "curriculum",
  "generate",
  "export",
]);

export const testGeneratorStreamEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("step"),
    step: testGeneratorPipelineStepSchema,
    message: z.string(),
    progress: z.number().min(0).max(100).optional(),
  }),
  z.object({
    event: z.literal("markdown"),
    markdown: z.string(),
  }),
  z.object({
    event: z.literal("extracted"),
    total: z.number().int().nonnegative(),
    items: extractedQuestionsSchema,
  }),
  z.object({
    event: z.literal("generated-partial"),
    index: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    partial: generatedQuestionPartialSchema,
  }),
  z.object({
    event: z.literal("generated-item"),
    index: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    item: generatedQuestionSchema,
  }),
  z.object({
    event: z.literal("progress"),
    completed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    progress: z.number().min(0).max(100),
  }),
  z.object({
    event: z.literal("done"),
    result: generatedDocxResultSchema,
    totalGenerated: z.number().int().nonnegative(),
  }),
  z.object({
    event: z.literal("error"),
    message: z.string().min(1),
    failedStep: testGeneratorPipelineStepSchema.optional(),
    failedGenerateIndex: z.number().int().nonnegative().optional(),
    canResume: z.boolean().optional(),
  }),
]);

export type ExtractedQuestion = z.infer<typeof extractedQuestionSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
export type GradeEssayRequest = z.infer<typeof gradeEssayRequestSchema>;
export type GradeEssayResponse = z.infer<typeof gradeEssayResponseSchema>;
export type GenerateDocxPayload = z.infer<typeof generateDocxPayloadSchema>;
export type GeneratedDocxResult = z.infer<typeof generatedDocxResultSchema>;
export type TestGeneratorPipelineStep = z.infer<
  typeof testGeneratorPipelineStepSchema
>;
export type TestGeneratorStreamEvent = z.infer<
  typeof testGeneratorStreamEventSchema
>;
