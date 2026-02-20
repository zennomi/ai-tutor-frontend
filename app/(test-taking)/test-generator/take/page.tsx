"use client";

import {
  BookmarkIcon,
  CheckCircleIcon,
  FileTextIcon,
  ListChecksIcon,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { Response } from "@/components/elements/response";
import { QuestionAnswerInput } from "@/components/test-taking/question-answer-input";
import { QuestionNavigationPanel } from "@/components/test-taking/question-navigation-panel";
import { QuestionReviewPanel } from "@/components/test-taking/question-review-panel";
import { TakeTestFooter } from "@/components/test-taking/take-test-footer";
import { TakeTestHeader } from "@/components/test-taking/take-test-header";
import {
  TakeTestEmptyState,
  TakeTestLoadingState,
  TakeTestPreStartState,
} from "@/components/test-taking/take-test-states";
import { toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GeneratedQuestion } from "@/lib/test-generator/schemas";
import { useTestGeneratorStore } from "@/lib/test-generator/store";
import { gradeEssayAnswer } from "@/lib/test-taking/essay-grading";
import {
  type QuestionAnswer,
  useTakeTestSessionStore,
} from "@/lib/test-taking/store";
import {
  clampMinutes,
  formatTime,
  getObjectiveReviewItem,
  getQuestionFormatLabel,
  isAnswerProvided,
  normalizeText,
} from "@/lib/test-taking/utils";

const questionFormatIcons: Record<GeneratedQuestion["format"], LucideIcon> = {
  MULTIPLE_CHOICE: ListChecksIcon,
  TRUE_FALSE: CheckCircleIcon,
  ESSAY: FileTextIcon,
};

function QuestionFormatIconBadge({
  format,
}: {
  format: GeneratedQuestion["format"];
}) {
  const label = getQuestionFormatLabel(format);
  const Icon = questionFormatIcons[format];

  return (
    <Badge
      aria-label={`Dạng câu hỏi: ${label}`}
      className="px-2"
      variant="outline"
    >
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">{label}</span>
    </Badge>
  );
}

export default function TakeTestPage() {
  const router = useRouter();

  const { generatedItems, locale, title } = useTestGeneratorStore();

  const {
    hasHydrated,
    activeQuestionIndex,
    answersByIndex,
    bookmarkedIndices,
    isStarted,
    durationMinutes,
    startedAt,
    timeLeftSeconds,
    isSubmitted,
    isSubmitting,
    resultSummary,
    failedEssayIndices,
    isQuestionNavOpen,
    hydrateSession,
    resetSession,
    setActiveQuestionIndex,
    setAnswerByIndex,
    toggleBookmarkedIndex,
    setDurationMinutes,
    startTest,
    setTimeLeftSeconds,
    setIsSubmitting,
    setIsSubmitted,
    setResultSummary,
    setFailedEssayIndices,
    setQuestionNavOpen,
  } = useTakeTestSessionStore();

  const questions = useMemo(
    () =>
      generatedItems.filter((item): item is GeneratedQuestion => Boolean(item)),
    [generatedItems]
  );

  const totalQuestions = questions.length;

  const safeActiveQuestionIndex =
    totalQuestions === 0
      ? 0
      : Math.min(Math.max(activeQuestionIndex, 0), totalQuestions - 1);

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

  const selectedDurationMinutes = clampMinutes(durationMinutes);
  const isTimeUp = isStarted && timeLeftSeconds <= 0 && !isSubmitted;
  const canShowTestContent = isStarted || isSubmitted;

  useEffect(() => {
    const runRehydrate = async () => {
      await useTestGeneratorStore.persist.rehydrate();
      resetSession();
      hydrateSession();
    };

    runRehydrate();
  }, [hydrateSession, resetSession]);

  useEffect(() => {
    if (totalQuestions === 0) {
      if (activeQuestionIndex !== 0) {
        setActiveQuestionIndex(0);
      }
      return;
    }

    const nextIndex = Math.min(
      Math.max(activeQuestionIndex, 0),
      totalQuestions - 1
    );

    if (nextIndex !== activeQuestionIndex) {
      setActiveQuestionIndex(nextIndex);
    }
  }, [activeQuestionIndex, setActiveQuestionIndex, totalQuestions]);

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
  }, [durationMinutes, isStarted, isSubmitted, setTimeLeftSeconds, startedAt]);

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
    setFailedEssayIndices,
    setIsSubmitted,
    setIsSubmitting,
    setResultSummary,
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
    startTest({
      durationMinutes: nextDuration,
      startedAt: now,
      timeLeftSeconds: nextDuration * 60,
    });
  };

  const handleToggleBookmark = useCallback(() => {
    toggleBookmarkedIndex(safeActiveQuestionIndex);
  }, [safeActiveQuestionIndex, toggleBookmarkedIndex]);

  const handleAnswerChange = useCallback(
    (value: QuestionAnswer) => {
      setAnswerByIndex(safeActiveQuestionIndex, value);
    },
    [safeActiveQuestionIndex, setAnswerByIndex]
  );

  const goToPrevious = useCallback(() => {
    setActiveQuestionIndex(Math.max(0, safeActiveQuestionIndex - 1));
  }, [safeActiveQuestionIndex, setActiveQuestionIndex]);

  const goToNext = useCallback(() => {
    setActiveQuestionIndex(
      Math.min(totalQuestions - 1, safeActiveQuestionIndex + 1)
    );
  }, [safeActiveQuestionIndex, setActiveQuestionIndex, totalQuestions]);

  const retryFailedEssayGrades = useCallback(async () => {
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
  }, [
    answersByIndex,
    failedEssayIndices,
    isSubmitting,
    locale,
    questions,
    resultSummary,
    setFailedEssayIndices,
    setIsSubmitting,
    setResultSummary,
  ]);

  if (!hasHydrated) {
    return <TakeTestLoadingState />;
  }

  if (totalQuestions === 0) {
    return <TakeTestEmptyState />;
  }

  const currentQuestion = questions[safeActiveQuestionIndex];
  const currentAnswer = answersByIndex[safeActiveQuestionIndex];
  const isCurrentBookmarked = bookmarkedIndices.includes(
    safeActiveQuestionIndex
  );
  const isFirstQuestion = safeActiveQuestionIndex === 0;
  const isLastQuestion = safeActiveQuestionIndex === totalQuestions - 1;

  const reviewItem =
    isSubmitted && resultSummary
      ? resultSummary.reviewItems[safeActiveQuestionIndex]
      : null;

  return (
    <Collapsible
      className="flex h-full min-h-0 w-full flex-col overflow-hidden"
      onOpenChange={setQuestionNavOpen}
      open={isQuestionNavOpen}
    >
      <TakeTestHeader
        answeredCount={answeredCount}
        bookmarkedCount={bookmarkedIndices.length}
        canShowTestContent={canShowTestContent}
        isCurrentBookmarked={isCurrentBookmarked}
        isQuestionNavOpen={isQuestionNavOpen}
        isStarted={isStarted}
        onGoToGenerator={() => router.push("/test-generator")}
        onToggleBookmark={handleToggleBookmark}
        progressValue={progressValue}
        timeLeftSeconds={timeLeftSeconds}
        title={title}
        totalQuestions={totalQuestions}
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 md:px-4">
        {canShowTestContent ? (
          <>
            <CollapsibleContent className="shrink-0">
              <QuestionNavigationPanel
                activeQuestionIndex={safeActiveQuestionIndex}
                answersByIndex={answersByIndex}
                bookmarkedIndices={bookmarkedIndices}
                onSelectQuestion={(index) => {
                  setActiveQuestionIndex(index);
                  setQuestionNavOpen(false);
                }}
                questions={questions}
              />
            </CollapsibleContent>

            {isSubmitted && resultSummary ? (
              <section className="mb-3 shrink-0 space-y-2">
                <p className="px-1 text-muted-foreground text-xs uppercase tracking-wide">
                  Tổng quan kết quả
                </p>
                <Card className="border-primary/20 shadow-sm">
                  <CardHeader className="space-y-2 pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">Kết quả bài làm</CardTitle>
                      <CardDescription>
                        Điểm tổng hợp cho tất cả dạng câu hỏi (bao gồm tự luận).
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-muted-foreground text-xs">Tổng điểm</p>
                      <p className="font-semibold text-lg">
                        {resultSummary.totalScore.toFixed(2)} /{" "}
                        {resultSummary.maxScore.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-muted-foreground text-xs">Tỷ lệ</p>
                      <p className="font-semibold text-lg">
                        {resultSummary.percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-muted-foreground text-xs">
                        Số câu đã trả lời
                      </p>
                      <p className="font-semibold text-lg">
                        {resultSummary.answeredCount}/
                        {resultSummary.questionCount}
                      </p>
                    </div>
                    <div className="rounded-md border bg-muted/20 p-3">
                      <p className="text-muted-foreground text-xs">
                        Thời gian làm bài
                      </p>
                      <p className="font-semibold text-lg">
                        {formatTime(resultSummary.timeSpentSeconds)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : null}

            <section className="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
              <p className="px-1 text-muted-foreground text-xs uppercase tracking-wide">
                Nội dung câu hỏi
              </p>
              <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-primary/10">
                <CardHeader className="shrink-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      Câu {safeActiveQuestionIndex + 1}
                    </Badge>
                    <QuestionFormatIconBadge format={currentQuestion.format} />
                    {isCurrentBookmarked ? (
                      <Badge className="gap-1" variant="outline">
                        <BookmarkIcon className="size-3.5 text-amber-500" />
                        Đã đánh dấu
                      </Badge>
                    ) : null}
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="mb-2 text-muted-foreground text-xs uppercase tracking-wide">
                      Đề bài
                    </p>
                    <Response>{currentQuestion.question}</Response>
                  </div>
                </CardHeader>

                <CardContent className="min-h-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-full pr-3">
                    <div className="space-y-3 pb-1">
                      <section className="space-y-2 rounded-md border bg-card p-3">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                          Trả lời câu hỏi
                        </p>
                        {isStarted ? (
                          <QuestionAnswerInput
                            answer={currentAnswer}
                            disabled={isSubmitted}
                            onAnswerChange={handleAnswerChange}
                            question={currentQuestion}
                          />
                        ) : (
                          <div className="rounded-md border border-dashed p-4 text-muted-foreground text-sm">
                            Nhấn <strong>Bắt đầu làm bài</strong> để mở khóa trả
                            lời câu hỏi.
                          </div>
                        )}
                      </section>

                      {isSubmitted && reviewItem ? (
                        <section className="space-y-2 rounded-md border border-primary/20 bg-muted/10 p-3">
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Chi tiết review
                          </p>
                          <QuestionReviewPanel reviewItem={reviewItem} />
                        </section>
                      ) : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </section>
          </>
        ) : (
          <TakeTestPreStartState
            onStart={handleStart}
            selectedDurationMinutes={selectedDurationMinutes}
            title={title}
            totalQuestions={totalQuestions}
          />
        )}
      </main>

      {canShowTestContent ? (
        <TakeTestFooter
          failedEssayCount={failedEssayIndices.length}
          isFirstQuestion={isFirstQuestion}
          isLastQuestion={isLastQuestion}
          isStarted={isStarted}
          isSubmitted={isSubmitted}
          isSubmitting={isSubmitting}
          onNext={goToNext}
          onPrevious={goToPrevious}
          onRetryFailedEssays={retryFailedEssayGrades}
          onSubmit={submitTest}
        />
      ) : null}
    </Collapsible>
  );
}
