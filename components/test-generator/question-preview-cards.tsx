"use client";

import {
  CheckCircleIcon,
  FileTextIcon,
  ListChecksIcon,
  type LucideIcon,
} from "lucide-react";
import { Response } from "@/components/elements/response";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ExtractedQuestion,
  GeneratedQuestion,
} from "@/lib/test-generator/schemas";
import { cn } from "@/lib/utils";

const questionFormatMeta: Record<
  GeneratedQuestion["format"],
  { icon: LucideIcon; label: string }
> = {
  MULTIPLE_CHOICE: {
    icon: ListChecksIcon,
    label: "Trắc nghiệm",
  },
  TRUE_FALSE: {
    icon: CheckCircleIcon,
    label: "Đúng / Sai",
  },
  ESSAY: {
    icon: FileTextIcon,
    label: "Tự luận",
  },
};

function QuestionFormatBadge({
  format,
}: {
  format: ExtractedQuestion["format"] | GeneratedQuestion["format"];
}) {
  const { icon: Icon, label } = questionFormatMeta[format];

  return (
    <Badge
      aria-label={`Dạng câu hỏi: ${label}`}
      className="px-2"
      variant="secondary"
    >
      <Icon aria-hidden className="size-3.5" />
      <span className="sr-only">{label}</span>
    </Badge>
  );
}

type ExtractedQuestionPreviewCardsProps = {
  items: ExtractedQuestion[];
};

type GeneratedQuestionPreviewCardsProps = {
  items: GeneratedQuestion[];
};

function ContentBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="rounded-md border bg-background p-3">
        <Response>{value}</Response>
      </div>
    </div>
  );
}

export function ExtractedQuestionPreviewCards({
  items,
}: ExtractedQuestionPreviewCardsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground text-sm">
        Chưa có dữ liệu trích xuất.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={`extracted-${item.key}-${index}`}>
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm">Câu #{index + 1}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <QuestionFormatBadge format={item.format} />
              <Badge variant="outline">Key: {item.key}</Badge>
              <Badge variant="outline">
                {item.has_image ? "Có hình ảnh" : "Không hình ảnh"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ContentBlock label="Câu hỏi" value={item.question} />
            <ContentBlock label="Lời giải" value={item.solution} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MultipleChoiceDetails({
  item,
}: {
  item: Extract<GeneratedQuestion, { format: "MULTIPLE_CHOICE" }>;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
        Lựa chọn
      </p>
      <div className="space-y-1.5">
        {item.choices.map((choice, index) => {
          const label = String.fromCharCode(65 + index);
          const isAnswer = index === item.answer;

          return (
            <div
              className={cn(
                "rounded-md border bg-background p-3",
                isAnswer && "border-green-500/50 bg-green-500/5"
              )}
              key={`${item.format}-choice-${index}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-xs">{label}</span>
                {isAnswer && (
                  <Badge
                    className="bg-green-500/10 text-green-700"
                    variant="secondary"
                  >
                    Đáp án đúng
                  </Badge>
                )}
              </div>
              <Response>{choice}</Response>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrueFalseDetails({
  item,
}: {
  item: Extract<GeneratedQuestion, { format: "TRUE_FALSE" }>;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
        Mệnh đề và đáp án
      </p>
      <div className="space-y-1.5">
        {item.statements.map((statement, index) => {
          const isTrue = item.answers[index] ?? false;

          return (
            <div
              className="rounded-md border bg-background p-3"
              key={`${item.format}-${index}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium text-xs">#{index + 1}</span>
                <Badge
                  className={cn(
                    isTrue
                      ? "bg-green-500/10 text-green-700"
                      : "bg-red-500/10 text-red-700"
                  )}
                  variant="secondary"
                >
                  {isTrue ? "Đúng" : "Sai"}
                </Badge>
              </div>
              <Response>{statement}</Response>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EssayDetails({
  item,
}: {
  item: Extract<GeneratedQuestion, { format: "ESSAY" }>;
}) {
  return <ContentBlock label="Đáp án kỳ vọng" value={item.answers} />;
}

export function GeneratedQuestionPreviewCards({
  items,
}: GeneratedQuestionPreviewCardsProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground text-sm">
        Chưa có câu hỏi mới.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={`generated-${item.format}-${index}`}>
          <CardHeader className="space-y-2 pb-3">
            <CardTitle className="text-sm">Câu #{index + 1}</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <QuestionFormatBadge format={item.format} />
              <Badge variant="outline">Lớp {item.grade}</Badge>
              <Badge variant="outline">{item.textbook}</Badge>
              <Badge variant="outline">{item.unit}</Badge>
              <Badge variant="outline">{item.lesson}</Badge>
              <Badge variant="outline">{item.type}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <ContentBlock label="Câu hỏi" value={item.question} />
            <ContentBlock label="Lời giải" value={item.solution} />

            {item.format === "MULTIPLE_CHOICE" && (
              <MultipleChoiceDetails item={item} />
            )}
            {item.format === "TRUE_FALSE" && <TrueFalseDetails item={item} />}
            {item.format === "ESSAY" && <EssayDetails item={item} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
