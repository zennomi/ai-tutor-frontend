"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/toast";
import {
  TEST_GENERATOR_DEFAULT_TITLE,
  TEST_GENERATOR_STEP_ACTION_LABEL,
  TEST_GENERATOR_STEP_LABEL,
  TEST_GENERATOR_STEP_ORDER,
} from "@/lib/constants";
import type {
  TestGeneratorPipelineStep,
  TestGeneratorStreamEvent,
} from "@/lib/test-generator/schemas";
import { useTestGeneratorStore } from "@/lib/test-generator/store";
import type { Attachment, ResumeMode, ResumeSnapshot } from "@/lib/types";
import { TestGeneratorHero } from "../../../components/test-generator/test-generator-hero";
import { TestGeneratorPipelineCard } from "../../../components/test-generator/test-generator-pipeline-card";
import { TestGeneratorPreviewCard } from "../../../components/test-generator/test-generator-preview-card";
import { TestGeneratorSetupCard } from "../../../components/test-generator/test-generator-setup-card";

export default function TestGeneratorPage() {
  const router = useRouter();

  const {
    file,
    title,
    locale,
    options,
    statusMessage,
    currentStep,
    progress,
    isRunning,
    markdownPreview,
    extractedItems,
    generatedItems,
    generatedPartials,
    generatedResult,
    failedStep,
    failedGenerateIndex,
    setFile,
    setTitle,
    setLocale,
    setIncludeSolutions,
    setShuffleQuestions,
    setShuffleChoices,
    setStatusMessage,
    setIsRunning,
    resetPipelineState,
    clearFailure,
    captureResumeSnapshot,
    applyEvent,
    clearSavedState,
  } = useTestGeneratorStore();

  const sortedGeneratedPartials = useMemo(
    () =>
      Object.entries(generatedPartials).sort(
        ([left], [right]) => Number(left) - Number(right)
      ),
    [generatedPartials]
  );

  const abortRef = useRef<AbortController | null>(null);

  const [attachment, setAttachment] = useState<Attachment | null>(null);

  useEffect(() => {
    const rehydrateStore = async () => {
      await useTestGeneratorStore.persist.rehydrate();
    };

    rehydrateStore();
  }, []);

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
      clearFailure();
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
        ? (resumeData ?? useTestGeneratorStore.getState().resumeSnapshot)
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

            if (parsed.event === "done") {
              toast({
                type: "success",
                description: "Đã tạo đề kiểm tra DOCX thành công.",
              });
              shouldStop = true;
              break;
            }

            if (parsed.event === "error") {
              toast({ type: "error", description: parsed.message });
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

  const handleClearSavedState = () => {
    clearSavedState();
  };

  const handleTakeTest = () => {
    if (generatedItems.length === 0) {
      toast({
        type: "error",
        description: "Bạn cần tạo ít nhất một câu hỏi trước khi làm bài.",
      });
      return;
    }

    router.push("/test-generator/take");
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
          hasGeneratedQuestions={generatedItems.length > 0}
          isRunning={isRunning}
          locale={locale}
          onCancel={handleCancel}
          onClearSavedState={handleClearSavedState}
          onContinueAfterFailure={handleContinueAfterFailure}
          onFileChange={handleFileChange}
          onIncludeSolutionsChange={setIncludeSolutions}
          onLocaleChange={setLocale}
          onRetryFailedStep={handleRetryFailedStep}
          onRun={handleRun}
          onShuffleChoicesChange={setShuffleChoices}
          onShuffleQuestionsChange={setShuffleQuestions}
          onTakeTest={handleTakeTest}
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
