"use client";

import {
  BookIcon,
  BrainIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  DownloadIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader } from "@/components/elements/loader";
import { Response } from "@/components/elements/response";
import {
  CheckCircleFillIcon,
  GlobeIcon,
  SparklesIcon,
  UploadIcon,
} from "@/components/icons";
import { PreviewAttachment } from "@/components/preview-attachment";
import { toast } from "@/components/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExtractedQuestion,
  GeneratedDocxResult,
  GeneratedQuestion,
  TestGeneratorPipelineStep,
  TestGeneratorStreamEvent,
} from "@/lib/test-generator/schemas";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

type StepKey =
  | "idle"
  | "convert"
  | "extract"
  | "curriculum"
  | "generate"
  | "export";

const stepLabel: Record<StepKey, string> = {
  idle: "Sẵn sàng",
  convert: "Chuyển DOCX → Markdown",
  extract: "Trích xuất câu hỏi",
  curriculum: "Tải curriculum metadata",
  generate: "Tạo câu hỏi mới",
  export: "Xuất DOCX",
};

const defaultTitle = "Đề kiểm tra mới";

const stepOrder: TestGeneratorPipelineStep[] = [
  "convert",
  "extract",
  "curriculum",
  "generate",
  "export",
];

const stepActionLabel: Record<TestGeneratorPipelineStep, string> = {
  convert: "Đọc DOCX",
  extract: "Trích câu hỏi",
  curriculum: "Đối chiếu curriculum",
  generate: "Tái sinh câu hỏi",
  export: "Xuất DOCX",
};

type GenerationOptions = {
  includeSolutions: boolean;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
};

type ResumeMode = "retry" | "continue";

type ResumeSnapshot = {
  markdown?: string;
  extractedItems?: ExtractedQuestion[];
  generatedQuestions?: GeneratedQuestion[];
  failedGenerateIndex?: number;
};

export default function TestGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const [locale, setLocale] = useState<"vi" | "en">("vi");
  const [options, setOptions] = useState<GenerationOptions>({
    includeSolutions: true,
    shuffleQuestions: false,
    shuffleChoices: false,
  });

  const [statusMessage, setStatusMessage] = useState(
    "Sẵn sàng tạo đề kiểm tra mới"
  );
  const [currentStep, setCurrentStep] = useState<StepKey>("idle");
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

  const [isMarkdownOpen, setIsMarkdownOpen] = useState(true);
  const [isExtractedOpen, setIsExtractedOpen] = useState(true);
  const [isGeneratedOpen, setIsGeneratedOpen] = useState(true);

  const sortedGeneratedPartials = useMemo(
    () =>
      Object.entries(generatedPartials).sort(
        ([left], [right]) => Number(left) - Number(right)
      ),
    [generatedPartials]
  );

  const generatedCount = generatedItems.filter(Boolean).length;

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
      setIsMarkdownOpen(true);
      setIsExtractedOpen(true);
      setIsGeneratedOpen(true);
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
    if (title === defaultTitle) {
      setTitle(nextFile.name.replace(/\.docx$/i, "") || defaultTitle);
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

  const collapseCompletedPreviewByStep = (
    nextStep: TestGeneratorPipelineStep
  ) => {
    const index = stepOrder.indexOf(nextStep);

    if (index >= stepOrder.indexOf("extract")) {
      setIsMarkdownOpen(false);
    }

    if (index >= stepOrder.indexOf("generate")) {
      setIsExtractedOpen(false);
    }

    if (index >= stepOrder.indexOf("export")) {
      setIsGeneratedOpen(false);
    }
  };

  const applyEvent = (event: TestGeneratorStreamEvent) => {
    if (event.event === "step") {
      setCurrentStep(event.step);
      setStatusMessage(event.message);
      if (typeof event.progress === "number") {
        setProgress(event.progress);
      }
      collapseCompletedPreviewByStep(event.step);
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
      formData.append("title", title.trim() || defaultTitle);
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
      currentStep === "idle" ? -1 : stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex < currentIndex) {
      return "completed" as const;
    }

    if (isRunning && stepIndex === currentIndex) {
      return "running" as const;
    }

    return "pending" as const;
  };

  const stepStatusBadge = {
    completed: {
      icon: <CheckCircleIcon className="size-4 text-green-600" />,
      label: "Hoàn tất",
      className: "border-green-500/30 bg-green-500/10 text-green-700",
    },
    running: {
      icon: <ClockIcon className="size-4 animate-pulse text-blue-600" />,
      label: "Đang chạy",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-700",
    },
    error: {
      icon: <XCircleIcon className="size-4 text-red-600" />,
      label: "Lỗi",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    },
    pending: {
      icon: <CircleIcon className="size-4 text-muted-foreground" />,
      label: "Chờ",
      className: "border-border bg-secondary/70",
    },
  } as const;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/20 via-primary/5 to-background p-6 md:p-8">
        <div className="absolute -top-20 -right-20 size-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-6 right-6 hidden rounded-xl border border-primary/20 bg-background/70 p-3 backdrop-blur md:block">
          <div className="grid grid-cols-5 gap-1">
            {stepOrder.map((step) => {
              const status = getPipelineStepStatus(step);

              return (
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    status === "completed" && "bg-green-500",
                    status === "running" && "animate-pulse bg-blue-500",
                    status === "error" && "bg-destructive",
                    status === "pending" && "bg-muted-foreground/30"
                  )}
                  key={`hero-dot-${step}`}
                />
              );
            })}
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="gap-1.5 bg-background/80 backdrop-blur"
              variant="secondary"
            >
              <SparklesIcon size={14} />
              Test Generator
            </Badge>
            <Badge
              className="gap-1.5 bg-background/80 backdrop-blur"
              variant="secondary"
            >
              <BookIcon className="size-3.5" />
              DOCX Pipeline
            </Badge>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
                Tạo đề kiểm tra DOCX
              </h1>
              <p className="max-w-2xl text-muted-foreground text-sm md:text-base">
                Tải lên đề gốc, tái sinh câu hỏi theo curriculum và xuất lại
                DOCX với tiến trình streaming theo từng bước.
              </p>
            </div>

            <div className="hidden min-w-[180px] rounded-xl border bg-background/80 p-3 shadow-sm backdrop-blur md:block">
              <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
                <BrainIcon className="size-3.5" />
                Smart Workflow
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bước</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Realtime</span>
                  <span className="font-medium">Stream</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Output</span>
                  <span className="font-medium">DOCX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">
                  1. Thiết lập dữ liệu đầu vào
                </CardTitle>
                <CardDescription>
                  Chọn tệp, đặt tiêu đề và cấu hình cách sinh đề.
                </CardDescription>
              </div>
              <Badge className="gap-1.5" variant="secondary">
                <WrenchIcon className="size-3.5" />
                Setup
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="flex items-center gap-2 font-medium text-sm">
                <BookIcon className="size-4 text-muted-foreground" />
                Tệp nguồn & tiêu đề đề
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="docx-file">Tệp DOCX</Label>
                  <Input
                    accept=".docx"
                    id="docx-file"
                    onChange={handleFileChange}
                    type="file"
                  />
                  <p className="text-muted-foreground text-xs">
                    Chỉ hỗ trợ định dạng .docx.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="test-title">Tiêu đề đề kiểm tra mới</Label>
                  <Input
                    id="test-title"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Nhập tiêu đề đề"
                    value={title}
                  />
                </div>
              </div>

              {attachment ? (
                <div className="flex items-center gap-2 overflow-x-auto rounded-md border border-dashed bg-background/70 p-2">
                  <PreviewAttachment attachment={attachment} />
                  <p className="text-muted-foreground text-xs">
                    Đã nạp tệp nguồn, sẵn sàng chạy pipeline.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-dashed bg-background/70 p-3">
                  <p className="flex items-center gap-2 text-muted-foreground text-xs">
                    <UploadIcon size={14} />
                    Chưa có tệp nào được chọn.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="flex items-center gap-2 font-medium text-sm">
                <GlobeIcon size={14} />
                Tuỳ chọn sinh đề
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ngôn ngữ</Label>
                  <Select
                    onValueChange={(value: "vi" | "en") => setLocale(value)}
                    value={locale}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn locale" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi">Tiếng Việt</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="include-solutions">Kèm lời giải</Label>
                  <Select
                    onValueChange={(value: "true" | "false") =>
                      setOptions((prev) => ({
                        ...prev,
                        includeSolutions: value === "true",
                      }))
                    }
                    value={String(options.includeSolutions)}
                  >
                    <SelectTrigger id="include-solutions">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Có</SelectItem>
                      <SelectItem value="false">Không</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shuffle-questions">Xáo câu hỏi</Label>
                  <Select
                    onValueChange={(value: "true" | "false") =>
                      setOptions((prev) => ({
                        ...prev,
                        shuffleQuestions: value === "true",
                      }))
                    }
                    value={String(options.shuffleQuestions)}
                  >
                    <SelectTrigger id="shuffle-questions">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Có</SelectItem>
                      <SelectItem value="false">Không</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shuffle-choices">Xáo lựa chọn</Label>
                  <Select
                    onValueChange={(value: "true" | "false") =>
                      setOptions((prev) => ({
                        ...prev,
                        shuffleChoices: value === "true",
                      }))
                    }
                    value={String(options.shuffleChoices)}
                  >
                    <SelectTrigger id="shuffle-choices">
                      <SelectValue placeholder="Chọn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Có</SelectItem>
                      <SelectItem value="false">Không</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p className="flex items-center gap-2 font-medium text-sm">
                <SparklesIcon size={14} />
                Hành động
              </p>

              <div className="flex flex-wrap gap-2">
                <Button disabled={isRunning || !file} onClick={handleRun}>
                  {isRunning ? (
                    <>
                      <Loader size={14} />
                      Đang xử lý
                    </>
                  ) : (
                    "Bắt đầu tạo đề"
                  )}
                </Button>

                <Button
                  disabled={!isRunning}
                  onClick={handleCancel}
                  type="button"
                  variant="secondary"
                >
                  Hủy
                </Button>

                {failedStep && !isRunning && (
                  <>
                    <Button
                      onClick={handleRetryFailedStep}
                      type="button"
                      variant="outline"
                    >
                      <RotateCcwIcon className="size-4" />
                      Retry bước lỗi
                    </Button>

                    <Button
                      onClick={handleContinueAfterFailure}
                      type="button"
                      variant="outline"
                    >
                      <SkipForwardIcon className="size-4" />
                      Continue từ bước kế
                    </Button>
                  </>
                )}

                {downloadUrl && (
                  <Button asChild variant="outline">
                    <a
                      download={generatedResult?.filename}
                      href={downloadUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <DownloadIcon className="size-4" />
                      Tải DOCX đã tạo
                    </a>
                  </Button>
                )}
              </div>

              {failedStep && (
                <Alert className="py-3" variant="destructive">
                  <XCircleIcon className="size-4" />
                  <AlertTitle className="text-sm">
                    Pipeline bị gián đoạn
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Có thể resume từ bước{" "}
                    <strong>{stepLabel[failedStep]}</strong>
                    {typeof failedGenerateIndex === "number"
                      ? ` (câu #${failedGenerateIndex + 1})`
                      : ""}
                    .
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">
                    2. Tiến trình pipeline
                  </CardTitle>
                  <CardDescription>
                    Bước hiện tại: {stepLabel[currentStep]}
                    {isRunning ? " (đang chạy)" : ""}
                  </CardDescription>
                </div>
                <Badge className="gap-1.5" variant="secondary">
                  {isRunning ? (
                    <ClockIcon className="size-3.5 animate-pulse" />
                  ) : progress === 100 ? (
                    <CheckCircleFillIcon size={14} />
                  ) : (
                    <CircleIcon className="size-3.5" />
                  )}
                  {isRunning ? "Running" : progress === 100 ? "Done" : "Idle"}
                </Badge>
              </div>

              <Progress value={progress} />
              <p className="text-muted-foreground text-sm">{statusMessage}</p>
            </CardHeader>

            <CardContent className="space-y-2 pt-0">
              {stepOrder.map((step, index) => {
                const status = getPipelineStepStatus(step);
                const statusMeta = stepStatusBadge[status];
                const isCurrent = step === currentStep;

                return (
                  <div className="relative" key={step}>
                    {index < stepOrder.length - 1 && (
                      <span
                        className={cn(
                          "absolute top-8 left-6 h-[calc(100%-1rem)] w-px",
                          status === "completed"
                            ? "bg-green-500/40"
                            : "bg-border"
                        )}
                      />
                    )}

                    <div
                      className={cn(
                        "relative flex items-start gap-3 rounded-lg border p-3",
                        isCurrent && "border-primary/40 bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                          status === "completed" &&
                            "border-green-500/40 bg-green-500/10 text-green-600",
                          status === "running" &&
                            "border-blue-500/40 bg-blue-500/10 text-blue-600",
                          status === "error" &&
                            "border-destructive/40 bg-destructive/10 text-destructive",
                          status === "pending" && "text-muted-foreground"
                        )}
                      >
                        {status === "completed" ? (
                          <CheckCircleFillIcon size={14} />
                        ) : (
                          statusMeta.icon
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">
                          {index + 1}. {stepLabel[step]}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {stepActionLabel[step]}
                        </p>
                      </div>

                      <Badge
                        className={cn(
                          "gap-1.5 border text-[11px]",
                          statusMeta.className
                        )}
                        variant="secondary"
                      >
                        {statusMeta.icon}
                        {statusMeta.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">
                3. Preview dữ liệu stream
              </CardTitle>
              <CardDescription>
                Markdown, câu hỏi trích xuất và câu hỏi mới sẽ cập nhật tăng
                dần.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Collapsible
                onOpenChange={setIsMarkdownOpen}
                open={isMarkdownOpen}
              >
                <div className="rounded-lg border bg-muted/20">
                  <CollapsibleTrigger asChild>
                    <Button
                      className="group h-auto w-full justify-between rounded-lg px-3 py-3"
                      variant="ghost"
                    >
                      <span className="flex items-center gap-2">
                        <BookIcon className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          Markdown preview
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-background/80" variant="secondary">
                          raw
                        </Badge>
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t px-3 py-3">
                    <div className="rounded-md border bg-background p-3">
                      {markdownPreview ? (
                        <Response>{markdownPreview}</Response>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          Chưa có markdown.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              <Collapsible
                onOpenChange={setIsExtractedOpen}
                open={isExtractedOpen}
              >
                <div className="rounded-lg border bg-muted/20">
                  <CollapsibleTrigger asChild>
                    <Button
                      className="h-auto w-full justify-between rounded-lg px-3 py-3"
                      variant="ghost"
                    >
                      <span className="flex items-center gap-2">
                        <WrenchIcon className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          Câu hỏi đã trích xuất
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-background/80" variant="secondary">
                          {extractedItems.length}
                        </Badge>
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t px-3 py-3">
                    <div className="space-y-2">
                      {extractedItems.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Chưa có dữ liệu trích xuất.
                        </p>
                      ) : (
                        extractedItems.map((item, index) => (
                          <div
                            className="rounded-md border bg-background p-3"
                            key={`extracted-${item.key}-${index}`}
                          >
                            <p className="mb-2 font-medium text-sm">
                              #{index + 1} · {item.format}
                            </p>
                            <Response>{item.question}</Response>
                            <p className="mt-2 text-muted-foreground text-xs">
                              Key: {item.key}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

              <Separator />

              <Collapsible
                onOpenChange={setIsGeneratedOpen}
                open={isGeneratedOpen}
              >
                <div className="rounded-lg border bg-muted/20">
                  <CollapsibleTrigger asChild>
                    <Button
                      className="h-auto w-full justify-between rounded-lg px-3 py-3"
                      variant="ghost"
                    >
                      <span className="flex items-center gap-2">
                        <BrainIcon className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          Câu hỏi đã tạo
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-background/80" variant="secondary">
                          {generatedCount}
                        </Badge>
                        <ChevronDownIcon className="size-4 text-muted-foreground" />
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="border-t px-3 py-3">
                    <div className="space-y-2">
                      {generatedCount === 0 &&
                      sortedGeneratedPartials.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                          Chưa có câu hỏi mới.
                        </p>
                      ) : (
                        <>
                          {sortedGeneratedPartials.map(([index, partial]) => (
                            <div
                              className="rounded-md border border-dashed bg-background p-3"
                              key={`partial-${index}`}
                            >
                              <p className="mb-2 font-medium text-sm">
                                #{Number(index) + 1} · đang tạo...
                              </p>
                              <Textarea
                                className="min-h-[120px] font-mono text-xs"
                                readOnly
                                value={JSON.stringify(partial, null, 2)}
                              />
                            </div>
                          ))}

                          {generatedItems.map((item, index) => {
                            if (!item) {
                              return null;
                            }

                            return (
                              <div
                                className="rounded-md border bg-background p-3"
                                key={`generated-${item.format}-${index}`}
                              >
                                <p className="mb-2 font-medium text-sm">
                                  #{index + 1} · {item.format} · Lớp{" "}
                                  {item.grade}
                                </p>
                                <Response>{item.question}</Response>
                                <p className="mt-2 text-muted-foreground text-xs">
                                  {item.textbook} / {item.unit} / {item.lesson}{" "}
                                  / {item.type}
                                </p>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
