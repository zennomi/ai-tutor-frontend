"use client";

import { BookmarkIcon, CheckCircleIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GeneratedQuestion } from "@/lib/test-generator/schemas";
import type { QuestionAnswer } from "@/lib/test-taking/store";
import { isAnswerProvided } from "@/lib/test-taking/utils";
import { cn } from "@/lib/utils";

type QuestionNavigationPanelProps = {
  questions: GeneratedQuestion[];
  answersByIndex: Record<number, QuestionAnswer>;
  bookmarkedIndices: number[];
  activeQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
};

type QuestionNavButtonProps = {
  index: number;
  isCurrent: boolean;
  isAnswered: boolean;
  isBookmarked: boolean;
  onSelect: () => void;
};

function QuestionNavButton({
  index,
  isCurrent,
  isAnswered,
  isBookmarked,
  onSelect,
}: QuestionNavButtonProps) {
  return (
    <button
      aria-current={isCurrent ? "true" : undefined}
      className={cn(
        "flex h-9 items-center justify-between rounded-md border px-3 text-left text-sm transition-colors",
        isCurrent
          ? "border-primary bg-primary/15 shadow-sm"
          : "border-border hover:bg-muted/40",
        !isCurrent && isAnswered && "border-green-500/40",
        isBookmarked && "ring-1 ring-amber-500/50"
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="font-medium">Câu {index + 1}</span>
      <span className="flex items-center gap-1">
        {isAnswered && <CheckCircleIcon className="size-3.5 text-green-600" />}
        {isBookmarked && <BookmarkIcon className="size-3.5 text-amber-500" />}
      </span>
    </button>
  );
}

export function QuestionNavigationPanel({
  questions,
  answersByIndex,
  bookmarkedIndices,
  activeQuestionIndex,
  onSelectQuestion,
}: QuestionNavigationPanelProps) {
  const answeredCount = questions.reduce((count, question, index) => {
    return count + (isAnswerProvided(question, answersByIndex[index]) ? 1 : 0);
  }, 0);

  return (
    <Card className="mb-3 border-primary/10 shadow-sm">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="text-base">Điều hướng câu hỏi</CardTitle>
        <CardDescription>
          {answeredCount}/{questions.length} đã trả lời ·{" "}
          {bookmarkedIndices.length} đã đánh dấu
        </CardDescription>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1">
            <span className="size-2 rounded-full bg-primary" />
            Câu hiện tại
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-green-500/40 bg-green-500/10 px-2 py-1 text-green-700">
            <CheckCircleIcon className="size-3" />
            Đã trả lời
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-700">
            <BookmarkIcon className="size-3" />
            Đã đánh dấu
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-52 pr-3">
          <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
            {questions.map((question, index) => (
              <QuestionNavButton
                index={index}
                isAnswered={isAnswerProvided(question, answersByIndex[index])}
                isBookmarked={bookmarkedIndices.includes(index)}
                isCurrent={index === activeQuestionIndex}
                key={`question-nav-${question.format}-${index}`}
                onSelect={() => onSelectQuestion(index)}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
