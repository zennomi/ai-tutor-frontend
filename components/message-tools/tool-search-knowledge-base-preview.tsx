"use client";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/elements/tool";
import type { ChatMessage } from "@/lib/types";

type ToolSearchKnowledgeBasePreviewProps = {
  part: Extract<
    ChatMessage["parts"][number],
    { type: "tool-searchKnowledgeBase" }
  >;
};

export const ToolSearchKnowledgeBasePreview = ({
  part,
}: ToolSearchKnowledgeBasePreviewProps) => {
  const { toolCallId, state } = part;
  const isErrorText = (text: string | undefined) => {
    if (!text) {
      return false;
    }
    const knownErrors = [
      "Không tìm thấy kiến thức liên quan trong các tài liệu được cung cấp.",
      "Lỗi khi tìm kiếm kiến thức.",
    ];
    return text.startsWith("Error") || knownErrors.includes(text);
  };

  const outputComponent =
    typeof part.output === "string" ? (
      <div className="p-2" key={toolCallId}>
        {part.output}
      </div>
    ) : undefined;
  const errorText = isErrorText(part.output) ? part.output : undefined;

  return (
    <Tool defaultOpen={true} key={toolCallId}>
      <ToolHeader state={state} type="tool-searchKnowledgeBase" />
      <ToolContent>
        {part.input && <ToolInput input={part.input} />}
        {state === "output-available" && (
          <ToolOutput
            errorText={errorText}
            output={errorText ? undefined : outputComponent}
          />
        )}
      </ToolContent>
    </Tool>
  );
};
