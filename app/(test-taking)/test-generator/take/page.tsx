"use client";

import {
  AlertCircleIcon,
  BookmarkIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  HomeIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Response } from "@/components/elements/response";
import { toast } from "@/components/toast";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type {
  GeneratedQuestion,
  GradeEssayResponse,
} from "@/lib/test-generator/schemas";
import { useTestGeneratorStore } from "@/lib/test-generator/store";
import { cn } from "@/lib/utils";

type ObjectiveAnswer =
  | {
      kind: "MULTIPLE_CHOICE";
      answerIndex: number;
    }
  | {
      kind: "TRUE_FALSE";
      answers: Record<number, boolean>;
    };

type QuestionAnswer =
  | ObjectiveAnswer
  | {
      kind: "ESSAY";
      text: string;
    };

type ReviewItem = {
  score: number;
  maxScore: number;
  isAnswered: boolean;
  userAnswerText: string;
  correctAnswerText: string;
  essayFeedback?: string;
  essayStatus?: "graded" | "failed";
};

type ResultSummary = {
  totalScore: number;
  maxScore: number;
  percentage: number;
  answeredCount: number;
  questionCount: number;
  timeSpentSeconds: number;
  reviewItems: ReviewItem[];
};

const DEFAULT_DURATION_MINUTES = 15;
const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 180;

function clampMinutes(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_DURATION_MINUTES;
  }

  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, value));
}

function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getQuestionFormatLabel(format: GeneratedQuestion["format"]) {
  if (format === "MULTIPLE_CHOICE") {
    return "Trắc nghiệm";
  }

  if (format === "TRUE_FALSE") {
    return "Đúng / Sai";
  }

  return "Tự luận";
}

function normalizeText(value: string) {
  return value.trim();
}

function isAnswerProvided(
  question: GeneratedQuestion,
  answer: QuestionAnswer | undefined
) {
  if (!answer) {
    return false;
  }

  if (answer.kind === "MULTIPLE_CHOICE") {
    return true;
  }

  if (answer.kind === "TRUE_FALSE") {
    const statementCount =
      question.format === "TRUE_FALSE" ? question.statements.length : 0;
    const answeredStatements = Object.values(answer.answers).filter(
      (value) => typeof value === "boolean"
    ).length;

    return Math.min(statementCount, answeredStatements) > 0;
  }

  return normalizeText(answer.text).length > 0;
}

function getObjectiveReviewItem(
  question: GeneratedQuestion,
  answer: QuestionAnswer | undefined
): ReviewItem {
  if (question.format === "MULTIPLE_CHOICE") {
    const isAnswered = answer?.kind === "MULTIPLE_CHOICE";
    const selectedIndex = isAnswered ? answer.answerIndex : undefined;
    const isCorrect = selectedIndex === question.answer;

    const selectedLabel =
      selectedIndex !== undefined
        ? `${String.fromCharCode(65 + selectedIndex)}. ${question.choices[selectedIndex] ?? ""}`
        : "Chưa trả lời";
    const correctLabel = `${String.fromCharCode(65 + question.answer)}. ${
      question.choices[question.answer] ?? ""
    }`;

    return {
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      isAnswered,
      userAnswerText: selectedLabel,
      correctAnswerText: correctLabel,
    };
  }

  if (question.format === "TRUE_FALSE") {
    const statementCount = question.statements.length;
    const expectedAnswers = question.answers.slice(0, statementCount);
    const responseMap =
      answer?.kind === "TRUE_FALSE" ? answer.answers : undefined;

    let correctCount = 0;
    let answeredCount = 0;

    const userAnswerLines = question.statements.map((statement, index) => {
      const value = responseMap?.[index];
      const answered = typeof value === "boolean";

      if (answered) {
        answeredCount += 1;
      }

      const expected = expectedAnswers[index];

      if (answered && value === expected) {
        correctCount += 1;
      }

      return `${index + 1}. ${statement} → ${
        answered ? (value ? "Đúng" : "Sai") : "Chưa trả lời"
      }`;
    });

    const correctAnswerLines = question.statements.map(
      (statement, index) =>
        `${index + 1}. ${statement} → ${expectedAnswers[index] ? "Đúng" : "Sai"}`
    );

    const denominator = Math.max(1, statementCount);

    return {
      score: correctCount / denominator,
      maxScore: 1,
      isAnswered: answeredCount > 0,
      userAnswerText: userAnswerLines.join("\n"),
      correctAnswerText: correctAnswerLines.join("\n"),
    };
  }

  const text = answer?.kind === "ESSAY" ? answer.text : "";

  return {
    score: 0,
    maxScore: 1,
    isAnswered: normalizeText(text).length > 0,
    userAnswerText: normalizeText(text) || "Chưa trả lời",
    correctAnswerText: question.answers,
  };
}

async function gradeEssayAnswer({
  question,
  expectedAnswer,
  studentAnswer,
  locale,
}: {
  question: string;
  expectedAnswer: string;
  studentAnswer: string;
  locale: "vi" | "en";
}) {
  const response = await fetch("/api/test-generator/grade-essay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      expectedAnswer,
      studentAnswer,
      locale,
    }),
  });

  if (!response.ok) {
    let message = "Không thể chấm câu tự luận.";

    try {
      const errorData = (await response.json()) as {
        cause?: string;
        message?: string;
      };

      if (errorData.cause) {
        message = errorData.cause;
      } else if (errorData.message) {
        message = errorData.message;
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(message);
  }

  return (await response.json()) as GradeEssayResponse;
}

function QuestionNavButton({
  index,
  isCurrent,
  isAnswered,
  isBookmarked,
  onSelect,
}: {
  index: number;
  isCurrent: boolean;
  isAnswered: boolean;
  isBookmarked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={cn(
        "flex h-9 items-center justify-between rounded-md border px-3 text-left text-sm transition-colors",
        isCurrent
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-muted/40",
        isAnswered && "border-green-500/40",
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

function renderQuestionAnswer(
  question: GeneratedQuestion,
  answer: QuestionAnswer | undefined,
  onAnswerChange: (value: QuestionAnswer) => void,
  disabled: boolean
): ReactNode {
  if (question.format === "MULTIPLE_CHOICE") {
    const selectedIndex =
      answer?.kind === "MULTIPLE_CHOICE" ? answer.answerIndex : -1;

    return (
      <div className="space-y-2">
        {question.choices.map((choice, index) => {
          const isSelected = selectedIndex === index;

          return (
            <button
              className={cn(
                "w-full rounded-md border p-3 text-left text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/30",
                disabled && "cursor-default opacity-80"
              )}
              disabled={disabled}
              key={`${question.format}-choice-${index}`}
              onClick={() =>
                onAnswerChange({
                  kind: "MULTIPLE_CHOICE",
                  answerIndex: index,
                })
              }
              type="button"
            >
              <p className="font-medium">{String.fromCharCode(65 + index)}</p>
              <Response className="text-sm">{choice}</Response>
            </button>
          );
        })}
      </div>
    );
  }

  if (question.format === "TRUE_FALSE") {
    const selectedAnswers =
      answer?.kind === "TRUE_FALSE"
        ? answer.answers
        : ({} as Record<number, boolean>);

    return (
      <div className="space-y-3">
        {question.statements.map((statement, index) => {
          const selectedValue = selectedAnswers[index];

          return (
            <div
              className="rounded-md border p-3"
              key={`${question.format}-${index}`}
            >
              <p className="mb-2 font-medium text-sm">Mệnh đề {index + 1}</p>
              <Response className="mb-3 text-sm">{statement}</Response>

              <div className="flex gap-2">
                <Button
                  disabled={disabled}
                  onClick={() => {
                    const nextAnswers = {
                      ...selectedAnswers,
                      [index]: true,
                    };

                    onAnswerChange({
                      kind: "TRUE_FALSE",
                      answers: nextAnswers,
                    });
                  }}
                  size="sm"
                  type="button"
                  variant={selectedValue === true ? "default" : "outline"}
                >
                  Đúng
                </Button>
                <Button
                  disabled={disabled}
                  onClick={() => {
                    const nextAnswers = {
                      ...selectedAnswers,
                      [index]: false,
                    };

                    onAnswerChange({
                      kind: "TRUE_FALSE",
                      answers: nextAnswers,
                    });
                  }}
                  size="sm"
                  type="button"
                  variant={selectedValue === false ? "default" : "outline"}
                >
                  Sai
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const essayText = answer?.kind === "ESSAY" ? answer.text : "";

  return (
    <div className="space-y-2">
      <Label htmlFor="essay-answer">Câu trả lời của bạn</Label>
      <Textarea
        disabled={disabled}
        id="essay-answer"
        onChange={(event) => {
          onAnswerChange({
            kind: "ESSAY",
            text: event.target.value,
          });
        }}
        placeholder="Nhập câu trả lời tự luận..."
        value={essayText}
      />
    </div>
  );
}

export default function TakeTestPage() {
  const router = useRouter();

  const { generatedItems, locale, title } = useTestGeneratorStore();

  const [hasHydrated, setHasHydrated] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answersByIndex, setAnswersByIndex] = useState<
    Record<number, QuestionAnswer>
  >({});
  const [bookmarkedIndices, setBookmarkedIndices] = useState<number[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(
    DEFAULT_DURATION_MINUTES
  );
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(
    DEFAULT_DURATION_MINUTES * 60
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<ResultSummary | null>(
    null
  );
  const [failedEssayIndices, setFailedEssayIndices] = useState<number[]>([]);
  const [isQuestionNavOpen, setIsQuestionNavOpen] = useState(false);

  const questions = useMemo(
    () =>
      generatedItems.filter((item): item is GeneratedQuestion => Boolean(item)),
    [generatedItems]
  );

  const totalQuestions = questions.length;

  const answeredCount = useMemo(
    () =>
      questions.reduce((count, question, index) => {
        const answer = answersByIndex[index];

        return count + (isAnswerProvided(question, answer) ? 1 : 0);
      }, 0),
    [answersByIndex, questions]
  );

  const progressValue =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentQuestion = questions[activeQuestionIndex];
  const currentAnswer = answersByIndex[activeQuestionIndex];
  const isCurrentBookmarked = bookmarkedIndices.includes(activeQuestionIndex);

  const isTimeUp = isStarted && timeLeftSeconds <= 0 && !isSubmitted;

  useEffect(() => {
    const runRehydrate = async () => {
      await useTestGeneratorStore.persist.rehydrate();
      setHasHydrated(true);
    };

    runRehydrate();
  }, []);

  useEffect(() => {
    if (!isStarted || isSubmitted || startedAt === null) {
      return;
    }

    const totalDurationSeconds = durationMinutes * 60;

    const intervalId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextTimeLeft = Math.max(0, totalDurationSeconds - elapsedSeconds);

      setTimeLeftSeconds(nextTimeLeft);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [durationMinutes, isStarted, isSubmitted, startedAt]);

  const submitTest = useCallback(async () => {
    if (isSubmitting || isSubmitted || totalQuestions === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewItems = questions.map((question, index) =>
        getObjectiveReviewItem(question, answersByIndex[index])
      );

      const essayIndices = questions.map((question, index) => ({
        question,
        index,
      }));

      const nextFailedEssayIndices: number[] = [];

      await Promise.all(
        essayIndices.map(async ({ question, index }) => {
          if (question.format !== "ESSAY") {
            return;
          }

          const answer = answersByIndex[index];
          const studentAnswer =
            answer?.kind === "ESSAY" ? normalizeText(answer.text) : "";

          if (!studentAnswer) {
            reviewItems[index] = {
              ...reviewItems[index],
              score: 0,
              essayStatus: "graded",
              essayFeedback: "Bạn chưa trả lời câu này.",
            };
            return;
          }

          try {
            const essayGrade = await gradeEssayAnswer({
              question: question.question,
              expectedAnswer: question.answers,
              studentAnswer,
              locale,
            });

            reviewItems[index] = {
              ...reviewItems[index],
              score: essayGrade.score,
              essayFeedback: essayGrade.feedback,
              essayStatus: "graded",
            };
          } catch (error) {
            nextFailedEssayIndices.push(index);
            reviewItems[index] = {
              ...reviewItems[index],
              score: 0,
              essayStatus: "failed",
              essayFeedback:
                error instanceof Error
                  ? error.message
                  : "Không thể chấm câu tự luận.",
            };
          }
        })
      );

      const totalScore = reviewItems.reduce((sum, item) => sum + item.score, 0);
      const maxScore = reviewItems.reduce(
        (sum, item) => sum + item.maxScore,
        0
      );
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      const timeSpentSeconds = startedAt
        ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
        : 0;

      setResultSummary({
        totalScore,
        maxScore,
        percentage,
        answeredCount,
        questionCount: totalQuestions,
        timeSpentSeconds,
        reviewItems,
      });
      setFailedEssayIndices(nextFailedEssayIndices);
      setIsSubmitted(true);

      if (nextFailedEssayIndices.length > 0) {
        toast({
          type: "error",
          description: `Có ${nextFailedEssayIndices.length} câu tự luận chưa chấm được. Bạn có thể thử chấm lại trong phần review.`,
        });
      } else {
        toast({
          type: "success",
          description: "Đã nộp bài và chấm điểm thành công.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    answeredCount,
    answersByIndex,
    isSubmitted,
    isSubmitting,
    locale,
    questions,
    startedAt,
    totalQuestions,
  ]);

  useEffect(() => {
    if (!isTimeUp) {
      return;
    }

    submitTest();
  }, [isTimeUp, submitTest]);

  const handleStart = () => {
    const nextDuration = clampMinutes(durationMinutes);
    const now = Date.now();

    setDurationMinutes(nextDuration);
    setStartedAt(now);
    setTimeLeftSeconds(nextDuration * 60);
    setIsStarted(true);
  };

  const handleToggleBookmark = () => {
    setBookmarkedIndices((current) => {
      if (current.includes(activeQuestionIndex)) {
        return current.filter((index) => index !== activeQuestionIndex);
      }

      return [...current, activeQuestionIndex].sort(
        (left, right) => left - right
      );
    });
  };

  const handleAnswerChange = (value: QuestionAnswer) => {
    setAnswersByIndex((current) => ({
      ...current,
      [activeQuestionIndex]: value,
    }));
  };

  const goToPrevious = () => {
    setActiveQuestionIndex((current) => Math.max(0, current - 1));
  };

  const goToNext = () => {
    setActiveQuestionIndex((current) =>
      Math.min(totalQuestions - 1, current + 1)
    );
  };

  const retryFailedEssayGrades = async () => {
    if (!resultSummary || failedEssayIndices.length === 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const nextReviewItems = [...resultSummary.reviewItems];
      const nextFailedIndices: number[] = [];

      await Promise.all(
        failedEssayIndices.map(async (index) => {
          const question = questions[index];

          if (!question || question.format !== "ESSAY") {
            return;
          }

          const answer = answersByIndex[index];
          const studentAnswer =
            answer?.kind === "ESSAY" ? normalizeText(answer.text) : "";

          if (!studentAnswer) {
            nextReviewItems[index] = {
              ...nextReviewItems[index],
              score: 0,
              essayStatus: "graded",
              essayFeedback: "Bạn chưa trả lời câu này.",
            };
            return;
          }

          try {
            const essayGrade = await gradeEssayAnswer({
              question: question.question,
              expectedAnswer: question.answers,
              studentAnswer,
              locale,
            });

            nextReviewItems[index] = {
              ...nextReviewItems[index],
              score: essayGrade.score,
              essayStatus: "graded",
              essayFeedback: essayGrade.feedback,
            };
          } catch {
            nextFailedIndices.push(index);
          }
        })
      );

      const totalScore = nextReviewItems.reduce(
        (sum, item) => sum + item.score,
        0
      );
      const maxScore = nextReviewItems.reduce(
        (sum, item) => sum + item.maxScore,
        0
      );
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      setResultSummary({
        ...resultSummary,
        totalScore,
        maxScore,
        percentage,
        reviewItems: nextReviewItems,
      });

      setFailedEssayIndices(nextFailedIndices);

      if (nextFailedIndices.length > 0) {
        toast({
          type: "error",
          description: `Vẫn còn ${nextFailedIndices.length} câu tự luận chưa chấm được.`,
        });
      } else {
        toast({
          type: "success",
          description: "Đã chấm lại câu tự luận thành công.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPrimaryActionButton = (className?: string) => {
    if (isSubmitted) {
      if (failedEssayIndices.length === 0) {
        return null;
      }

      return (
        <Button
          className={className}
          disabled={isSubmitting}
          onClick={retryFailedEssayGrades}
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
      );
    }

    return (
      <Button
        className={className}
        disabled={isSubmitting || !isStarted}
        onClick={submitTest}
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
    );
  };

  if (!hasHydrated) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Đang tải dữ liệu bài kiểm tra...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-primary/20 shadow-sm">
          <CardHeader>
            <CardTitle>Chưa có đề để làm bài</CardTitle>
            <CardDescription>
              Bạn cần tạo câu hỏi trong màn hình test generator trước khi bắt
              đầu làm bài.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/test-generator">
                <HomeIcon className="size-4" />
                Quay lại tạo đề
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isFirstQuestion = activeQuestionIndex === 0;
  const isLastQuestion = activeQuestionIndex === totalQuestions - 1;

  const reviewItem =
    isSubmitted && resultSummary
      ? resultSummary.reviewItems[activeQuestionIndex]
      : null;

  const questionNavigationList = (
    <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
      {questions.map((question, index) => (
        <QuestionNavButton
          index={index}
          isAnswered={isAnswerProvided(question, answersByIndex[index])}
          isBookmarked={bookmarkedIndices.includes(index)}
          isCurrent={index === activeQuestionIndex}
          key={`question-nav-${question.format}-${index}`}
          onSelect={() => {
            setActiveQuestionIndex(index);
            setIsQuestionNavOpen(false);
          }}
        />
      ))}
    </div>
  );

  return (
    <Collapsible
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      onOpenChange={setIsQuestionNavOpen}
      open={isQuestionNavOpen}
    >
      <header className="shrink-0 border-b bg-card px-3 py-3 md:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold text-base md:text-lg">
              {title}
            </p>
            <p className="text-muted-foreground text-xs md:text-sm">
              Làm bài kiểm tra · {totalQuestions} câu hỏi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleToggleBookmark}
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

            <Button
              onClick={() => router.push("/test-generator")}
              size="sm"
              type="button"
              variant="outline"
            >
              Về trang tạo đề
            </Button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tiến độ làm bài</span>
            <span className="font-medium">{progressValue}%</span>
          </div>
          <Progress value={progressValue} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Đã trả lời: {answeredCount}</Badge>
          <Badge variant="secondary">
            Đã đánh dấu: {bookmarkedIndices.length}
          </Badge>

          {isStarted ? (
            <Badge className="ml-auto gap-1" variant="outline">
              <ClockIcon className="size-3.5" />
              {formatTime(timeLeftSeconds)}
            </Badge>
          ) : (
            <div className="ml-auto flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="duration-minutes">Thời gian (phút)</Label>
                <Input
                  className="w-24"
                  id="duration-minutes"
                  max={MAX_DURATION_MINUTES}
                  min={MIN_DURATION_MINUTES}
                  onChange={(event) => {
                    const rawValue = Number.parseInt(event.target.value, 10);
                    setDurationMinutes(
                      Number.isNaN(rawValue)
                        ? DEFAULT_DURATION_MINUTES
                        : clampMinutes(rawValue)
                    );
                  }}
                  type="number"
                  value={durationMinutes}
                />
              </div>

              <Button onClick={handleStart} type="button">
                Bắt đầu làm bài
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 md:px-4">
        <CollapsibleContent className="shrink-0">
          <Card className="mb-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Điều hướng câu hỏi</CardTitle>
              <CardDescription>
                {answeredCount}/{totalQuestions} đã trả lời ·{" "}
                {bookmarkedIndices.length} đã đánh dấu
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-52 pr-3">
                {questionNavigationList}
              </ScrollArea>
            </CardContent>
          </Card>
        </CollapsibleContent>

        {isSubmitted && resultSummary ? (
          <Card className="mb-3 shrink-0">
            <CardHeader>
              <CardTitle>Kết quả bài làm</CardTitle>
              <CardDescription>
                Điểm tổng hợp cho tất cả dạng câu hỏi (bao gồm tự luận).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Tổng điểm</p>
                <p className="font-semibold text-lg">
                  {resultSummary.totalScore.toFixed(2)} /{" "}
                  {resultSummary.maxScore.toFixed(2)}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">Tỷ lệ</p>
                <p className="font-semibold text-lg">
                  {resultSummary.percentage.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  Số câu đã trả lời
                </p>
                <p className="font-semibold text-lg">
                  {resultSummary.answeredCount}/{resultSummary.questionCount}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground text-xs">
                  Thời gian làm bài
                </p>
                <p className="font-semibold text-lg">
                  {formatTime(resultSummary.timeSpentSeconds)}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CardHeader className="shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Câu {activeQuestionIndex + 1}</Badge>
              <Badge variant="outline">
                {getQuestionFormatLabel(currentQuestion.format)}
              </Badge>
              {isCurrentBookmarked ? (
                <Badge className="gap-1" variant="outline">
                  <BookmarkIcon className="size-3.5 text-amber-500" />
                  Đã đánh dấu
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-base md:text-lg">
              <Response>{currentQuestion.question}</Response>
            </CardTitle>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-3">
              <div className="space-y-4 pb-1">
                {isStarted ? (
                  renderQuestionAnswer(
                    currentQuestion,
                    currentAnswer,
                    handleAnswerChange,
                    isSubmitted
                  )
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-muted-foreground text-sm">
                    Nhấn <strong>Bắt đầu làm bài</strong> để mở khóa trả lời câu
                    hỏi.
                  </div>
                )}

                {isSubmitted && reviewItem ? (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="font-medium text-sm">Review câu hỏi</p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Điểm câu này
                        </p>
                        <p className="font-medium text-sm">
                          {reviewItem.score.toFixed(2)} /{" "}
                          {reviewItem.maxScore.toFixed(2)}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Trạng thái
                        </p>
                        {reviewItem.essayStatus === "failed" ? (
                          <p className="flex items-center gap-1 text-amber-600 text-sm">
                            <AlertCircleIcon className="size-4" />
                            Chưa chấm được tự luận
                          </p>
                        ) : (
                          <p className="text-sm">
                            {reviewItem.isAnswered
                              ? "Đã trả lời"
                              : "Chưa trả lời"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Câu trả lời của bạn
                        </p>
                        <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm">
                          {reviewItem.userAnswerText}
                        </pre>
                      </div>

                      <div>
                        <p className="mb-1 text-muted-foreground text-xs">
                          Đáp án tham chiếu
                        </p>
                        <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm">
                          {reviewItem.correctAnswerText}
                        </pre>
                      </div>

                      {reviewItem.essayFeedback ? (
                        <div>
                          <p className="mb-1 text-muted-foreground text-xs">
                            Phản hồi AI
                          </p>
                          <pre className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm">
                            {reviewItem.essayFeedback}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <footer className="shrink-0 border-t bg-card px-3 py-3 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            disabled={isFirstQuestion}
            onClick={goToPrevious}
            type="button"
            variant="outline"
          >
            <ChevronLeftIcon className="size-4" />
            Câu trước
          </Button>

          {isSubmitted ? (
            failedEssayIndices.length > 0 ? (
              renderPrimaryActionButton()
            ) : (
              <Badge variant="secondary">Đang ở chế độ review</Badge>
            )
          ) : (
            renderPrimaryActionButton()
          )}

          <Button
            disabled={isLastQuestion}
            onClick={goToNext}
            type="button"
            variant="outline"
          >
            Câu sau
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </footer>
    </Collapsible>
  );
}
