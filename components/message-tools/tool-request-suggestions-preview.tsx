"use client";

import { DocumentToolResult } from "@/components/document";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ChatMessage } from "@/lib/types";

type ToolRequestSuggestionsPreviewProps = {
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-requestSuggestions" }
  >;
  isReadonly: boolean;
};

export const ToolRequestSuggestionsPreview = ({
  part,
  isReadonly,
}: ToolRequestSuggestionsPreviewProps) => {
  const { toolCallId, state } = part;

  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type="tool-requestSuggestions" />
      <ToolContent>
        {state === "input-available" && <ToolInput input={part.input} />}
        {state === "output-available" && (
          <ToolOutput
            errorText={undefined}
            output={
              "error" in part.output ? (
                <div className="rounded border p-2 text-red-500">
                  Lỗi: {String(part.output.error)}
                </div>
              ) : (
                <DocumentToolResult
                  isReadonly={isReadonly}
                  result={part.output}
                  type="request-suggestions"
                />
              )
            }
          />
        )}
      </ToolContent>
    </Tool>
  );
};
