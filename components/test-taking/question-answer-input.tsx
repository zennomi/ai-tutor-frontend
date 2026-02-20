"use client";

import { Response } from "@/components/elements/response";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GeneratedQuestion } from "@/lib/test-generator/schemas";
import type { QuestionAnswer } from "@/lib/test-taking/store";
import { cn } from "@/lib/utils";

type QuestionAnswerInputProps = {
  question: GeneratedQuestion;
  answer: QuestionAnswer | undefined;
  onAnswerChange: (value: QuestionAnswer) => void;
  disabled: boolean;
};

export function QuestionAnswerInput({
  question,
  answer,
  onAnswerChange,
  disabled,
}: QuestionAnswerInputProps) {
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
    const selectedAnswers: Record<number, boolean> =
      answer?.kind === "TRUE_FALSE" ? answer.answers : {};

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
