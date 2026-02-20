"use client";

import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TakeTestFooterProps = {
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  isSubmitted: boolean;
  failedEssayCount: number;
  isSubmitting: boolean;
  isStarted: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onRetryFailedEssays: () => void;
};

export function TakeTestFooter({
  isFirstQuestion,
  isLastQuestion,
  isSubmitted,
  failedEssayCount,
  isSubmitting,
  isStarted,
  onPrevious,
  onNext,
  onSubmit,
  onRetryFailedEssays,
}: TakeTestFooterProps) {
  return (
    <footer className="shrink-0 border-t bg-card px-3 py-3 shadow-[0_-1px_0_hsl(var(--border))] md:px-4">
      <div className="rounded-md border bg-muted/20 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            disabled={isFirstQuestion}
            onClick={onPrevious}
            type="button"
            variant="outline"
          >
            <ChevronLeftIcon className="size-4" />
            Câu trước
          </Button>

          {isSubmitted ? (
            failedEssayCount > 0 ? (
              <Button
                disabled={isSubmitting}
                onClick={onRetryFailedEssays}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    Đang chấm lại...
                  </>
                ) : (
                  "Chấm lại tự luận"
                )}
              </Button>
            ) : (
              <Badge variant="secondary">Đang ở chế độ review</Badge>
            )
          ) : (
            <Button
              disabled={isSubmitting || !isStarted}
              onClick={onSubmit}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Đang nộp bài...
                </>
              ) : (
                "Nộp bài"
              )}
            </Button>
          )}

          <Button
            disabled={isLastQuestion}
            onClick={onNext}
            type="button"
            variant="outline"
          >
            Câu sau
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
}
