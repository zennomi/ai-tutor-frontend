"use client";

import { BookmarkIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/test-taking/utils";

type TakeTestHeaderProps = {
  title: string;
  totalQuestions: number;
  canShowTestContent: boolean;
  isCurrentBookmarked: boolean;
  isQuestionNavOpen: boolean;
  progressValue: number;
  answeredCount: number;
  bookmarkedCount: number;
  isStarted: boolean;
  timeLeftSeconds: number;
  onToggleBookmark: () => void;
  onGoToGenerator: () => void;
};

export function TakeTestHeader({
  title,
  totalQuestions,
  canShowTestContent,
  isCurrentBookmarked,
  isQuestionNavOpen,
  progressValue,
  answeredCount,
  bookmarkedCount,
  isStarted,
  timeLeftSeconds,
  onToggleBookmark,
  onGoToGenerator,
}: TakeTestHeaderProps) {
  return (
    <header className="shrink-0 border-b bg-card px-3 py-3 md:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate font-semibold text-base md:text-lg">{title}</p>
          <p className="text-muted-foreground text-xs md:text-sm">
            Làm bài kiểm tra · {totalQuestions} câu hỏi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canShowTestContent ? (
            <>
              <Button
                onClick={onToggleBookmark}
                size="sm"
                type="button"
                variant={isCurrentBookmarked ? "default" : "outline"}
              >
                <BookmarkIcon className="size-4" />
                {isCurrentBookmarked ? "Đã đánh dấu" : "Đánh dấu câu hiện tại"}
              </Button>

              <CollapsibleTrigger asChild>
                <Button size="sm" type="button" variant="outline">
                  {isQuestionNavOpen ? "Ẩn điều hướng" : "Điều hướng câu hỏi"}
                </Button>
              </CollapsibleTrigger>
            </>
          ) : null}

          <Button
            onClick={onGoToGenerator}
            size="sm"
            type="button"
            variant="outline"
          >
            Về trang tạo đề
          </Button>
        </div>
      </div>

      {canShowTestContent ? (
        <div className="mt-3 space-y-3 rounded-md border bg-muted/20 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiến độ làm bài</span>
              <span className="font-semibold">{progressValue}%</span>
            </div>
            <Progress value={progressValue} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Đã trả lời: {answeredCount}</Badge>
            <Badge variant="secondary">Đã đánh dấu: {bookmarkedCount}</Badge>

            {isStarted ? (
              <Badge className="ml-auto gap-1" variant="outline">
                <ClockIcon className="size-3.5" />
                {formatTime(timeLeftSeconds)}
              </Badge>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
