"use client";

import { AlertCircleIcon, CheckCircleIcon, CircleIcon } from "lucide-react";
import { Response } from "@/components/elements/response";
import { Badge } from "@/components/ui/badge";
import type { ReviewItem } from "@/lib/test-taking/store";
import { cn } from "@/lib/utils";

type QuestionReviewPanelProps = {
  reviewItem: ReviewItem;
};

export function QuestionReviewPanel({ reviewItem }: QuestionReviewPanelProps) {
  const statusMeta =
    reviewItem.essayStatus === "failed"
      ? {
          icon: <AlertCircleIcon className="size-3.5" />,
          label: "Chưa chấm được tự luận",
          className: "border-destructive/30 bg-destructive/10 text-destructive",
        }
      : reviewItem.isAnswered
        ? {
            icon: <CheckCircleIcon className="size-3.5" />,
            label: "Đã trả lời",
            className: "border-green-500/30 bg-green-500/10 text-green-700",
          }
        : {
            icon: <CircleIcon className="size-3.5" />,
            label: "Chưa trả lời",
            className: "border-border bg-secondary/70 text-foreground",
          };

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-sm">Review câu hỏi</p>
        <Badge
          className={cn("gap-1.5 border", statusMeta.className)}
          variant="secondary"
        >
          {statusMeta.icon}
          {statusMeta.label}
        </Badge>
      </div>

      <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-muted-foreground text-xs">Điểm câu này</p>
          <p className="font-semibold text-sm">
            {reviewItem.score.toFixed(2)} / {reviewItem.maxScore.toFixed(2)}
          </p>
        </div>

        <div>
          <p className="mb-1 text-muted-foreground text-xs">Trạng thái chấm</p>
          {reviewItem.essayStatus === "failed" ? (
            <p className="flex items-center gap-1 text-amber-600 text-sm">
              <AlertCircleIcon className="size-4" />
              Chưa chấm được tự luận
            </p>
          ) : (
            <p className="text-sm">
              {reviewItem.isAnswered ? "Đã trả lời" : "Chưa trả lời"}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Câu trả lời của bạn
          </p>
          <Response className="rounded-md border bg-background p-3 text-sm">
            {reviewItem.userAnswerText}
          </Response>
        </div>

        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Đáp án tham chiếu
          </p>
          <Response className="rounded-md border bg-background p-3 text-sm">
            {reviewItem.correctAnswerText}
          </Response>
        </div>

        {reviewItem.essayFeedback ? (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Phản hồi AI
            </p>
            <Response className="rounded-md border bg-background p-3 text-sm">
              {reviewItem.essayFeedback}
            </Response>
          </div>
        ) : null}
      </div>
    </div>
  );
}
