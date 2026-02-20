"use client";

import {
  BookIcon,
  DownloadIcon,
  RotateCcwIcon,
  SkipForwardIcon,
  Trash2Icon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { Loader } from "@/components/elements/loader";
import { GlobeIcon, SparklesIcon, UploadIcon } from "@/components/icons";
import { PreviewAttachment } from "@/components/preview-attachment";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TestGeneratorPipelineStep } from "@/lib/test-generator/schemas";
import type { Attachment, GenerationOptions } from "@/lib/types";

type TestGeneratorSetupCardProps = {
  file: File | null;
  title: string;
  locale: "vi" | "en";
  options: GenerationOptions;
  attachment: Attachment | null;
  isRunning: boolean;
  failedStep: TestGeneratorPipelineStep | null;
  failedGenerateIndex?: number;
  stepLabel: Record<"idle" | TestGeneratorPipelineStep, string>;
  downloadUrl?: string;
  generatedFilename?: string;
  hasGeneratedQuestions: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTitleChange: (value: string) => void;
  onLocaleChange: (value: "vi" | "en") => void;
  onIncludeSolutionsChange: (value: boolean) => void;
  onShuffleQuestionsChange: (value: boolean) => void;
  onShuffleChoicesChange: (value: boolean) => void;
  onRun: () => void;
  onCancel: () => void;
  onRetryFailedStep: () => void;
  onContinueAfterFailure: () => void;
  onTakeTest: () => void;
  onClearSavedState: () => void;
};

export function TestGeneratorSetupCard({
  file,
  title,
  locale,
  options,
  attachment,
  isRunning,
  failedStep,
  failedGenerateIndex,
  stepLabel,
  downloadUrl,
  generatedFilename,
  hasGeneratedQuestions,
  onFileChange,
  onTitleChange,
  onLocaleChange,
  onIncludeSolutionsChange,
  onShuffleQuestionsChange,
  onShuffleChoicesChange,
  onRun,
  onCancel,
  onRetryFailedStep,
  onContinueAfterFailure,
  onTakeTest,
  onClearSavedState,
}: TestGeneratorSetupCardProps) {
  return (
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
                onChange={onFileChange}
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
                onChange={(event) => onTitleChange(event.target.value)}
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
                onValueChange={(value: "vi" | "en") => onLocaleChange(value)}
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
                  onIncludeSolutionsChange(value === "true")
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
                  onShuffleQuestionsChange(value === "true")
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
                  onShuffleChoicesChange(value === "true")
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
            <Button disabled={isRunning || !file} onClick={onRun}>
              {isRunning ? (
                <>
                  <Loader size={14} />
                  Đang xử lý
                </>
              ) : (
                "Bắt đầu tạo đề"
              )}
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Hủy tác vụ đang chạy"
                  disabled={!isRunning}
                  onClick={onCancel}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <XCircleIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hủy tác vụ đang chạy</TooltipContent>
            </Tooltip>

            {failedStep && !isRunning && (
              <>
                <Button
                  onClick={onRetryFailedStep}
                  type="button"
                  variant="outline"
                >
                  <RotateCcwIcon className="size-4" />
                  Retry bước lỗi
                </Button>

                <Button
                  onClick={onContinueAfterFailure}
                  type="button"
                  variant="outline"
                >
                  <SkipForwardIcon className="size-4" />
                  Continue từ bước kế
                </Button>
              </>
            )}

            {downloadUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild size="icon" variant="outline">
                    <a
                      aria-label="Tải DOCX đã tạo"
                      download={generatedFilename}
                      href={downloadUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <DownloadIcon className="size-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Tải DOCX đã tạo</TooltipContent>
              </Tooltip>
            )}

            <Button
              disabled={isRunning || !hasGeneratedQuestions}
              onClick={onTakeTest}
              type="button"
              variant="outline"
            >
              Làm bài kiểm tra
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Xóa dữ liệu đã lưu"
                  disabled={isRunning}
                  onClick={onClearSavedState}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Xóa dữ liệu đã lưu</TooltipContent>
            </Tooltip>
          </div>

          {failedStep && (
            <Alert className="py-3" variant="destructive">
              <XCircleIcon className="size-4" />
              <AlertTitle className="text-sm">Pipeline bị gián đoạn</AlertTitle>
              <AlertDescription className="text-xs">
                Có thể resume từ bước <strong>{stepLabel[failedStep]}</strong>
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
  );
}
