"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/toast";
import {
  TEST_GENERATOR_DEFAULT_TITLE,
  TEST_GENERATOR_STEP_ACTION_LABEL,
  TEST_GENERATOR_STEP_LABEL,
  TEST_GENERATOR_STEP_ORDER,
} from "@/lib/constants";
import type {
  ExtractedQuestion,
  GeneratedDocxResult,
  GeneratedQuestion,
  TestGeneratorPipelineStep,
  TestGeneratorStreamEvent,
} from "@/lib/test-generator/schemas";
import type {
  Attachment,
  GenerationOptions,
  ResumeMode,
  ResumeSnapshot,
  TestGeneratorStepKey,
} from "@/lib/types";
import { TestGeneratorHero } from "../../../components/test-generator/test-generator-hero";
import { TestGeneratorPipelineCard } from "../../../components/test-generator/test-generator-pipeline-card";
import { TestGeneratorPreviewCard } from "../../../components/test-generator/test-generator-preview-card";
import { TestGeneratorSetupCard } from "../../../components/test-generator/test-generator-setup-card";

export default function TestGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(TEST_GENERATOR_DEFAULT_TITLE);
  const [locale, setLocale] = useState<"vi" | "en">("vi");
  const [options, setOptions] = useState<GenerationOptions>({
    includeSolutions: true,
    shuffleQuestions: false,
    shuffleChoices: false,
  });

  const [statusMessage, setStatusMessage] = useState(
    "Sẵn sàng tạo đề kiểm tra mới"
  );
  const [currentStep, setCurrentStep] = useState<TestGeneratorStepKey>("idle");
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const [markdownPreview, setMarkdownPreview] = useState("");
  const [extractedItems, setExtractedItems] = useState<ExtractedQuestion[]>([]);
  const [generatedItems, setGeneratedItems] = useState<GeneratedQuestion[]>([]);
  const [generatedPartials, setGeneratedPartials] = useState<
    Record<number, unknown>
  >({});
  const [generatedResult, setGeneratedResult] =
    useState<GeneratedDocxResult | null>(null);

  const [failedStep, setFailedStep] =
    useState<TestGeneratorPipelineStep | null>(null);
  const [failedGenerateIndex, setFailedGenerateIndex] = useState<
    number | undefined
  >(undefined);
  const [resumeSnapshot, setResumeSnapshot] = useState<ResumeSnapshot | null>(
    null
  );

  const sortedGeneratedPartials = useMemo(
    () =>
      Object.entries(generatedPartials).sort(
        ([left], [right]) => Number(left) - Number(right)
      ),
    [generatedPartials]
  );

  const abortRef = useRef<AbortController | null>(null);
  const markdownPreviewRef = useRef("");
  const extractedItemsRef = useRef<ExtractedQuestion[]>([]);
  const generatedItemsRef = useRef<GeneratedQuestion[]>([]);

  const [attachment, setAttachment] = useState<Attachment | null>(null);

  useEffect(() => {
    if (!file) {
      setAttachment(null);
      return;
    }

    const url = URL.createObjectURL(file);

    setAttachment({
      name: file.name,
      url,
      contentType: file.type,
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const resetPipelineState = ({
    keepPreview = false,
  }: {
    keepPreview?: boolean;
  } = {}) => {
    setCurrentStep("idle");
    setProgress(0);
    setStatusMessage("Sẵn sàng tạo đề kiểm tra mới");

    if (!keepPreview) {
      markdownPreviewRef.current = "";
      extractedItemsRef.current = [];
      generatedItemsRef.current = [];

      setMarkdownPreview("");
      setExtractedItems([]);
      setGeneratedItems([]);
      setGeneratedPartials({});
      setGeneratedResult(null);
    }

    setFailedStep(null);
    setFailedGenerateIndex(undefined);
    setResumeSnapshot(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".docx")) {
      toast({ type: "error", description: "Vui lòng chọn tệp .docx hợp lệ." });
      return;
    }

    setFile(nextFile);
    if (title === TEST_GENERATOR_DEFAULT_TITLE) {
      setTitle(
        nextFile.name.replace(/\.docx$/i, "") || TEST_GENERATOR_DEFAULT_TITLE
      );
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsRunning(false);
    setStatusMessage("Đã hủy tiến trình tạo đề.");
    toast({ type: "error", description: "Đã hủy tạo đề kiểm tra." });
  };

  const captureResumeSnapshot = (
    nextFailedGenerateIndex?: number
  ): ResumeSnapshot => {
    const generatedQuestions = generatedItemsRef.current.filter(
      (item): item is GeneratedQuestion => Boolean(item)
    );

    const snapshot: ResumeSnapshot = {
      markdown: markdownPreviewRef.current || undefined,
      extractedItems:
        extractedItemsRef.current.length > 0
          ? extractedItemsRef.current
          : undefined,
      generatedQuestions,
      failedGenerateIndex: nextFailedGenerateIndex,
    };

    setResumeSnapshot(snapshot);
    return snapshot;
  };

  const applyEvent = (event: TestGeneratorStreamEvent) => {
    if (event.event === "step") {
      setCurrentStep(event.step);
      setStatusMessage(event.message);
      if (typeof event.progress === "number") {
        setProgress(event.progress);
      }
      return;
    }

    if (event.event === "markdown") {
      markdownPreviewRef.current = event.markdown;
      setMarkdownPreview(event.markdown);
      return;
    }

    if (event.event === "extracted") {
      extractedItemsRef.current = event.items;
      setExtractedItems(event.items);
      return;
    }

    if (event.event === "generated-partial") {
      setGeneratedPartials((prev) => ({
        ...prev,
        [event.index]: event.partial,
      }));
      return;
    }

    if (event.event === "generated-item") {
      const nextGeneratedItems = [...generatedItemsRef.current];
      nextGeneratedItems[event.index] = event.item;
      generatedItemsRef.current = nextGeneratedItems;
      setGeneratedItems(nextGeneratedItems);

      setGeneratedPartials((prev) => {
        const next = { ...prev };
        delete next[event.index];
        return next;
      });
      return;
    }

    if (event.event === "progress") {
      setProgress(event.progress);
      setStatusMessage(`Đã tạo ${event.completed}/${event.total} câu hỏi mới.`);
      return;
    }

    if (event.event === "done") {
      setGeneratedResult(event.result);
      setProgress(100);
      setStatusMessage(
        `Hoàn tất! Đã tạo ${event.totalGenerated} câu hỏi và xuất DOCX thành công.`
      );
      setFailedStep(null);
      setFailedGenerateIndex(undefined);
      setResumeSnapshot(null);
      toast({
        type: "success",
        description: "Đã tạo đề kiểm tra DOCX thành công.",
      });
      return;
    }

    if (event.event === "error") {
      setStatusMessage(event.message);

      const nextFailedStep = event.failedStep ?? null;
      const nextFailedGenerateIndex = event.failedGenerateIndex;

      setFailedStep(nextFailedStep);
      setFailedGenerateIndex(nextFailedGenerateIndex);

      if (event.canResume) {
        captureResumeSnapshot(nextFailedGenerateIndex);
      }

      toast({ type: "error", description: event.message });
    }
  };

  const runPipeline = async ({
    resumeStep,
    resumeMode,
    resumeData,
  }: {
    resumeStep?: TestGeneratorPipelineStep;
    resumeMode?: ResumeMode;
    resumeData?: ResumeSnapshot;
  } = {}) => {
    if (!file) {
      toast({ type: "error", description: "Bạn cần chọn một tệp DOCX trước." });
      return;
    }

    if (resumeStep) {
      setFailedStep(null);
      setFailedGenerateIndex(undefined);
    } else {
      resetPipelineState();
    }

    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim() || TEST_GENERATOR_DEFAULT_TITLE);
      formData.append("locale", locale);
      formData.append("includeSolutions", String(options.includeSolutions));
      formData.append("shuffleQuestions", String(options.shuffleQuestions));
      formData.append("shuffleChoices", String(options.shuffleChoices));

      if (resumeStep) {
        formData.append("resumeStep", resumeStep);
      }

      if (resumeMode) {
        formData.append("resumeMode", resumeMode);
      }

      const effectiveResumeData = resumeStep
        ? (resumeData ?? resumeSnapshot)
        : undefined;

      if (effectiveResumeData) {
        formData.append("resumeData", JSON.stringify(effectiveResumeData));
      }

      const response = await fetch("/api/test-generator/docx", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        let message = "Không thể bắt đầu tiến trình tạo đề.";

        try {
          const data = (await response.json()) as {
            message?: string;
            cause?: string;
          };
          if (data.cause) {
            message = data.cause;
          } else if (data.message) {
            message = data.message;
          }
        } catch {
          // ignore parse failures
        }

        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Không nhận được luồng dữ liệu phản hồi.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let shouldStop = false;

      while (!shouldStop) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((entry) => entry.startsWith("data: "));

          if (!line) {
            continue;
          }

          const rawData = line.slice(6);

          try {
            const parsed = JSON.parse(rawData) as TestGeneratorStreamEvent;
            applyEvent(parsed);

            if (parsed.event === "done" || parsed.event === "error") {
              shouldStop = true;
              break;
            }
          } catch {
            // ignore invalid stream frame
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setStatusMessage("Đã hủy tiến trình tạo đề.");
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Không thể hoàn tất tiến trình tạo đề.";

      setStatusMessage(message);
      toast({ type: "error", description: message });
    } finally {
      setIsRunning(false);
      abortRef.current = null;
    }
  };

  const handleRun = async () => {
    await runPipeline();
  };

  const handleRetryFailedStep = async () => {
    if (!failedStep) {
      return;
    }

    const snapshot = captureResumeSnapshot(failedGenerateIndex);

    await runPipeline({
      resumeStep: failedStep,
      resumeMode: "retry",
      resumeData: snapshot,
    });
  };

  const handleContinueAfterFailure = async () => {
    if (!failedStep) {
      return;
    }

    const snapshot = captureResumeSnapshot(failedGenerateIndex);

    await runPipeline({
      resumeStep: failedStep,
      resumeMode: "continue",
      resumeData: snapshot,
    });
  };

  const downloadUrl = generatedResult?.url ?? generatedResult?.path;

  const getPipelineStepStatus = (step: TestGeneratorPipelineStep) => {
    if (failedStep === step) {
      return "error" as const;
    }

    if (progress === 100) {
      return "completed" as const;
    }

    const currentIndex =
      currentStep === "idle"
        ? -1
        : TEST_GENERATOR_STEP_ORDER.indexOf(currentStep);
    const stepIndex = TEST_GENERATOR_STEP_ORDER.indexOf(step);

    if (stepIndex < currentIndex) {
      return "completed" as const;
    }

    if (isRunning && stepIndex === currentIndex) {
      return "running" as const;
    }

    return "pending" as const;
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <TestGeneratorHero
        getPipelineStepStatus={getPipelineStepStatus}
        stepOrder={TEST_GENERATOR_STEP_ORDER}
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <TestGeneratorSetupCard
          attachment={attachment}
          downloadUrl={downloadUrl}
          failedGenerateIndex={failedGenerateIndex}
          failedStep={failedStep}
          file={file}
          generatedFilename={generatedResult?.filename}
          isRunning={isRunning}
          locale={locale}
          onCancel={handleCancel}
          onContinueAfterFailure={handleContinueAfterFailure}
          onFileChange={handleFileChange}
          onIncludeSolutionsChange={(includeSolutions) =>
            setOptions((prev) => ({
              ...prev,
              includeSolutions,
            }))
          }
          onLocaleChange={setLocale}
          onRetryFailedStep={handleRetryFailedStep}
          onRun={handleRun}
          onShuffleChoicesChange={(shuffleChoices) =>
            setOptions((prev) => ({
              ...prev,
              shuffleChoices,
            }))
          }
          onShuffleQuestionsChange={(shuffleQuestions) =>
            setOptions((prev) => ({
              ...prev,
              shuffleQuestions,
            }))
          }
          onTitleChange={setTitle}
          options={options}
          stepLabel={TEST_GENERATOR_STEP_LABEL}
          title={title}
        />

        <div className="flex flex-col gap-4">
          <TestGeneratorPipelineCard
            currentStep={currentStep}
            getPipelineStepStatus={getPipelineStepStatus}
            isRunning={isRunning}
            progress={progress}
            statusMessage={statusMessage}
            stepActionLabel={TEST_GENERATOR_STEP_ACTION_LABEL}
            stepLabel={TEST_GENERATOR_STEP_LABEL}
            stepOrder={TEST_GENERATOR_STEP_ORDER}
          />

          <TestGeneratorPreviewCard
            extractedItems={extractedItems}
            generatedItems={generatedItems}
            markdownPreview={markdownPreview}
            sortedGeneratedPartials={sortedGeneratedPartials}
          />
        </div>
      </div>
    </div>
  );
}
