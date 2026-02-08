"use client";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ChatMessage } from "@/lib/types";

type ToolSearchExercisePreviewProps = {
  part: Extract<ChatMessage["parts"][number], { type: "tool-searchExercise" }>;
};

export const ToolSearchExercisePreview = ({
  part,
}: ToolSearchExercisePreviewProps) => {
  const { toolCallId, state } = part;
  const isErrorText = (text: string | undefined) => {
    if (!text) {
      return false;
    }
    const knownErrors = ["Không tìm thấy bài tập tương tự"];
    return (
      text.startsWith("Error") ||
      text.startsWith("Error finding exercise") ||
      knownErrors.includes(text)
    );
  };

  const renderExercises = (exercises: unknown[]) => (
    <div className="space-y-3">
      {exercises.map((exercise, idx) => {
        const {
          id,
          key: exerciseKey,
          question,
          grade,
          type: exerciseType,
          format,
          textbook,
          unit,
          lesson,
          solution,
        } = (exercise || {}) as {
          id?: string;
          key?: string;
          question?: string;
          grade?: string;
          type?: string;
          format?: string;
          textbook?: string;
          unit?: string;
          lesson?: string;
          solution?: string;
          hasImage?: boolean;
        };

        const itemKey = id ?? exerciseKey ?? String(idx);

        return (
          <div className="rounded-md bg-muted/50 p-3 text-sm" key={itemKey}>
            {question && (
              <div className="font-medium text-sm leading-snug">{question}</div>
            )}
            <div className="mt-1 text-muted-foreground text-xs">
              {[grade, exerciseType, format].filter(Boolean).join(" · ") || ""}
            </div>
            <div className="text-muted-foreground text-xs">
              {[textbook, unit, lesson].filter(Boolean).join(" / ") || ""}
            </div>
            {exerciseKey && (
              <div className="mt-1 text-muted-foreground text-[11px]">
                Đáp án: {exerciseKey}
              </div>
            )}
            {solution && (
              <div className="mt-2 text-xs">
                <span className="font-medium">Lời giải chi tiết:</span>{" "}
                {solution}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderOutput = () => {
    if (Array.isArray(part.output)) {
      return (
        <ToolOutput
          errorText={undefined}
          output={renderExercises(part.output)}
        />
      );
    }

    if (typeof part.output === "string") {
      const errorText = isErrorText(part.output) ? part.output : undefined;
      return (
        <ToolOutput
          errorText={errorText}
          output={errorText ? undefined : part.output}
        />
      );
    }

    return <ToolOutput errorText="Đầu ra không mong muốn" output={undefined} />;
  };

  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type="tool-searchExercise" />
      <ToolContent>
        {part.input && <ToolInput input={part.input} />}
        {state === "output-available" && renderOutput()}
      </ToolContent>
    </Tool>
  );
};
