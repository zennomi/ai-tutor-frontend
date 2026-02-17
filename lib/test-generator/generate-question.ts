import "server-only";

import { google } from "@ai-sdk/google";
import { Output, streamText } from "ai";
import type { z } from "zod";
import {
  buildGenerationPrompt,
  questionGenerationSystemPrompt,
} from "@/lib/test-generator/prompts";
import {
  type ExtractedQuestion,
  type GeneratedQuestion,
  generatedQuestionPartialSchema,
  generatedQuestionSchema,
} from "@/lib/test-generator/schemas";

export async function generateQuestionWithToolLoop({
  extractedQuestion,
  curriculumTree,
  total,
  index,
  onPartial,
}: {
  extractedQuestion: ExtractedQuestion;
  curriculumTree: unknown;
  total: number;
  index: number;
  onPartial?: (partial: z.infer<typeof generatedQuestionPartialSchema>) => void;
}): Promise<GeneratedQuestion> {
  const partialByKey = new Map<string, unknown>();

  const result = streamText({
    model: google("gemini-3-pro-preview"),
    system: questionGenerationSystemPrompt,
    prompt: buildGenerationPrompt({
      extractedQuestion,
      curriculumTree,
      index,
      total,
    }),
    output: Output.object({
      schema: generatedQuestionSchema,
    }),
  });

  const partialTask = onPartial
    ? (async () => {
        for await (const partialOutput of result.partialOutputStream) {
          const parsedPartial = generatedQuestionPartialSchema.safeParse(
            partialOutput
          );

          if (!parsedPartial.success) {
            continue;
          }

          for (const [key, value] of Object.entries(parsedPartial.data)) {
            if (value !== undefined) {
              partialByKey.set(key, value);
            }
          }

          const partial = Object.fromEntries(partialByKey) as z.infer<
            typeof generatedQuestionPartialSchema
          >;
          onPartial(partial);
        }
      })()
    : Promise.resolve();

  try {
    const output = await result.output;
    await partialTask;
    return output;
  } catch {
    await partialTask.catch(() => undefined);
    throw new Error("Failed to produce a valid generated question");
  }
}
