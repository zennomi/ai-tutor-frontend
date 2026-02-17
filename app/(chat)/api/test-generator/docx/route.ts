import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { getLanguageModel } from "@/lib/ai/providers";
import { ChatSDKError } from "@/lib/errors";
import { generateQuestionWithToolLoop } from "@/lib/test-generator/generate-question";
import {
  buildExtractionPrompt,
  extractionSystemPrompt,
} from "@/lib/test-generator/prompts";
import {
  type ExtractedQuestion,
  extractedQuestionSchema,
  extractedQuestionsSchema,
  type GeneratedQuestion,
  generateDocxPayloadSchema,
  generatedQuestionSchema,
  type TestGeneratorPipelineStep,
  type TestGeneratorStreamEvent,
} from "@/lib/test-generator/schemas";
import {
  convertDocxToMarkdown,
  fetchCurriculumTree,
  generateTestDocx,
} from "@/lib/test-generator/services";

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
  "",
]);

const MAX_DOCX_SIZE_BYTES = 20 * 1024 * 1024;

const pipelineSteps = [
  "convert",
  "extract",
  "curriculum",
  "generate",
  "export",
] as const;

const resumeDataSchema = z.object({
  markdown: z.string().optional(),
  extractedItems: extractedQuestionsSchema.optional(),
  generatedQuestions: z.array(generatedQuestionSchema).optional(),
  failedGenerateIndex: z.number().int().nonnegative().optional(),
});

type ResumeMode = "retry" | "continue";
type ResumeData = z.infer<typeof resumeDataSchema>;

export const maxDuration = 300;

function getDefaultTitle(fileName: string) {
  return fileName.replace(/\.docx$/i, "") || "De kiem tra moi";
}

function parseBooleanField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function isPipelineStep(value: string): value is TestGeneratorPipelineStep {
  return pipelineSteps.some((step) => step === value);
}

function getStepIndex(step: TestGeneratorPipelineStep) {
  return pipelineSteps.indexOf(step);
}

function toPublicErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Đã có lỗi xảy ra trong quá trình tạo đề kiểm tra.";
  }

  if (error.message.includes("API host is not configured")) {
    return "Thiếu cấu hình API host cho dịch vụ tạo đề.";
  }

  if (error.message.includes("Failed to convert DOCX to markdown")) {
    return "Không thể chuyển đổi DOCX sang markdown.";
  }

  if (error.message.includes("Invalid markdown conversion response")) {
    return "Nội dung markdown trả về không hợp lệ.";
  }

  if (error.message.includes("Failed to fetch curriculum tree")) {
    return "Không thể tải dữ liệu chương trình học.";
  }

  if (error.message.includes("Failed to generate DOCX test")) {
    return "Không thể xuất file DOCX đề mới.";
  }

  if (error.message.includes("Failed to produce a valid generated question")) {
    return "AI không tạo được câu hỏi hợp lệ theo schema yêu cầu.";
  }

  if (error.message.includes("No extracted questions found")) {
    return "Không tìm thấy câu hỏi nào trong tài liệu DOCX đã tải lên.";
  }

  if (error.message.includes("No generated questions to export")) {
    return "Không có câu hỏi hợp lệ để xuất DOCX.";
  }

  return "Đã có lỗi xảy ra trong quá trình tạo đề kiểm tra.";
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid multipart request"
    ).toResponse();
  }

  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    return new ChatSDKError(
      "bad_request:api",
      "Field file is required"
    ).toResponse();
  }

  const file = fileEntry;

  if (!file.name.toLowerCase().endsWith(".docx")) {
    return new ChatSDKError(
      "bad_request:api",
      "Only .docx files are supported"
    ).toResponse();
  }

  if (!DOCX_MIME_TYPES.has(file.type)) {
    return new ChatSDKError(
      "bad_request:api",
      "Unsupported file content type"
    ).toResponse();
  }

  if (file.size <= 0) {
    return new ChatSDKError(
      "bad_request:api",
      "Uploaded file is empty"
    ).toResponse();
  }

  if (file.size > MAX_DOCX_SIZE_BYTES) {
    return new ChatSDKError(
      "bad_request:api",
      "File size exceeds maximum 20MB"
    ).toResponse();
  }

  const rawTitle = formData.get("title");
  const title =
    typeof rawTitle === "string" && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : getDefaultTitle(file.name);

  const localeEntry = formData.get("locale");
  const locale =
    localeEntry === "vi" || localeEntry === "en" ? localeEntry : undefined;

  const options = {
    includeSolutions: parseBooleanField(formData.get("includeSolutions")),
    shuffleQuestions: parseBooleanField(formData.get("shuffleQuestions")),
    shuffleChoices: parseBooleanField(formData.get("shuffleChoices")),
  };

  const hasAnyOption = Object.values(options).some(
    (value) => value !== undefined
  );

  const resumeStepEntry = formData.get("resumeStep");
  const resumeStep =
    typeof resumeStepEntry === "string" && isPipelineStep(resumeStepEntry)
      ? resumeStepEntry
      : undefined;

  const resumeModeEntry = formData.get("resumeMode");
  const resumeMode: ResumeMode =
    resumeModeEntry === "continue" ? "continue" : "retry";

  const resumeDataEntry = formData.get("resumeData");
  let resumeData: ResumeData | undefined;

  if (
    typeof resumeDataEntry === "string" &&
    resumeDataEntry.trim().length > 0
  ) {
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(resumeDataEntry);
    } catch {
      return new ChatSDKError(
        "bad_request:api",
        "Invalid resumeData JSON"
      ).toResponse();
    }

    const parsedResumeData = resumeDataSchema.safeParse(parsedJson);

    if (!parsedResumeData.success) {
      return new ChatSDKError(
        "bad_request:api",
        "Invalid resumeData payload"
      ).toResponse();
    }

    resumeData = parsedResumeData.data;
  }

  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      let activeStep: TestGeneratorPipelineStep = resumeStep ?? "convert";
      let activeGenerateIndex: number | undefined =
        resumeData?.failedGenerateIndex;

      const writeEvent = (event: TestGeneratorStreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      const writeStep = (
        step: TestGeneratorPipelineStep,
        message: string,
        progress?: number
      ) => {
        activeStep = step;

        writeEvent({
          event: "step",
          step,
          message,
          progress,
        });
      };

      const startStep = (() => {
        if (!resumeStep) {
          return "convert";
        }

        if (resumeMode !== "continue") {
          return resumeStep;
        }

        if (resumeStep === "generate") {
          return "generate";
        }

        const nextStep = pipelineSteps[getStepIndex(resumeStep) + 1];

        return nextStep ?? resumeStep;
      })();

      const shouldRunStep = (step: TestGeneratorPipelineStep) =>
        getStepIndex(step) >= getStepIndex(startStep);

      try {
        let markdown = resumeData?.markdown;

        if (shouldRunStep("convert") || !markdown) {
          writeStep("convert", "Đang chuyển DOCX sang markdown...", 5);

          const converted = await convertDocxToMarkdown(file);
          markdown = converted.markdown;

          writeEvent({
            event: "markdown",
            markdown,
          });
        } else {
          writeStep("convert", "Đã khôi phục markdown từ phiên trước.", 5);

          writeEvent({
            event: "markdown",
            markdown,
          });
        }

        let extractedItems: ExtractedQuestion[] =
          resumeData?.extractedItems ?? [];

        if (shouldRunStep("extract") || extractedItems.length === 0) {
          writeStep("extract", "Đang trích xuất câu hỏi từ markdown...", 20);

          const extractionResult = await generateText({
            model: getLanguageModel("gemini-2.5-flash"),
            system: extractionSystemPrompt,
            prompt: buildExtractionPrompt(markdown),
            output: Output.array({
              element: extractedQuestionSchema,
              name: "extracted_questions",
              description: "List of extracted questions from markdown",
            }),
          });

          extractedItems = extractedQuestionsSchema.parse(
            extractionResult.output
          );

          if (extractedItems.length === 0) {
            throw new Error("No extracted questions found");
          }
        } else {
          writeStep("extract", "Đã khôi phục câu hỏi đã trích xuất.", 20);
        }

        writeEvent({
          event: "extracted",
          total: extractedItems.length,
          items: extractedItems,
        });

        let generatedQuestions: GeneratedQuestion[] =
          resumeData?.generatedQuestions ?? [];

        if (shouldRunStep("generate")) {
          writeStep("curriculum", "Đang tải metadata chương trình học...", 30);

          const curriculumTree = await fetchCurriculumTree();

          writeStep("generate", "Đang tạo câu hỏi mới...", 35);

          const total = extractedItems.length;
          generatedQuestions = generatedQuestions.slice(0, total);

          let startGenerateIndex = 0;

          if (startStep === "convert" || startStep === "extract") {
            generatedQuestions = [];
            startGenerateIndex = 0;
          } else if (startStep === "generate") {
            const failedIndex = resumeData?.failedGenerateIndex;

            if (resumeMode === "continue" && failedIndex !== undefined) {
              startGenerateIndex = Math.min(total, failedIndex + 1);
            } else if (failedIndex !== undefined) {
              startGenerateIndex = Math.min(total, failedIndex);
            } else {
              startGenerateIndex = Math.min(total, generatedQuestions.length);
            }

            if (
              resumeMode === "retry" &&
              startGenerateIndex < generatedQuestions.length
            ) {
              generatedQuestions = generatedQuestions.slice(
                0,
                startGenerateIndex
              );
            }
          } else {
            startGenerateIndex = Math.min(total, generatedQuestions.length);
          }

          for (const [existingIndex, item] of generatedQuestions.entries()) {
            writeEvent({
              event: "generated-item",
              index: existingIndex,
              total,
              item,
            });

            const generationProgress = Math.min(
              90,
              35 + Math.round(((existingIndex + 1) / total) * 55)
            );

            writeEvent({
              event: "progress",
              completed: existingIndex + 1,
              total,
              progress: generationProgress,
            });
          }

          for (
            let sourceIndex = startGenerateIndex;
            sourceIndex < total;
            sourceIndex++
          ) {
            const outputIndex = generatedQuestions.length;
            const extractedQuestion = extractedItems[sourceIndex];
            activeGenerateIndex = sourceIndex;

            const generatedQuestion = await generateQuestionWithToolLoop({
              extractedQuestion,
              curriculumTree,
              index: sourceIndex,
              total,
              onPartial: (partial) => {
                writeEvent({
                  event: "generated-partial",
                  index: outputIndex,
                  total,
                  partial,
                });
              },
            });

            generatedQuestions.push(generatedQuestion);
            activeGenerateIndex = undefined;

            writeEvent({
              event: "generated-item",
              index: outputIndex,
              total,
              item: generatedQuestion,
            });

            const completed = generatedQuestions.length;
            const generationProgress = Math.min(
              90,
              35 + Math.round((completed / total) * 55)
            );

            writeEvent({
              event: "progress",
              completed,
              total,
              progress: generationProgress,
            });
          }
        }

        writeStep("export", "Đang xuất DOCX mới...", 92);

        if (generatedQuestions.length === 0) {
          throw new Error("No generated questions to export");
        }

        const payload = generateDocxPayloadSchema.parse({
          title,
          locale,
          questions: generatedQuestions,
          options: hasAnyOption ? options : undefined,
          source: {
            filename: file.name,
            markdown,
          },
        });

        const generatedDocx = await generateTestDocx(payload);

        writeEvent({
          event: "done",
          result: generatedDocx,
          totalGenerated: generatedQuestions.length,
        });
      } catch (error) {
        const failedStep = activeStep;
        const failedGenerateIndex =
          failedStep === "generate" ? activeGenerateIndex : undefined;

        console.error("test-generator pipeline failed", {
          userId: session.user.id,
          fileName: file.name,
          fileSize: file.size,
          failedStep,
          failedGenerateIndex,
          error,
        });

        writeEvent({
          event: "error",
          message: toPublicErrorMessage(error),
          failedStep,
          failedGenerateIndex,
          canResume: true,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
