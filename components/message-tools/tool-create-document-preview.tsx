"use client";

import { DocumentPreview } from "@/components/document-preview";
import type { ChatMessage } from "@/lib/types";

type ToolCreateDocumentPreviewProps = {
  part: Extract<ChatMessage["parts"][number], { type: "tool-createDocument" }>;
  isReadonly: boolean;
};

export const ToolCreateDocumentPreview = ({
  part,
  isReadonly,
}: ToolCreateDocumentPreviewProps) => {
  const { toolCallId } = part;

  if (part.output && "error" in part.output) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
        key={toolCallId}
      >
        Lỗi tạo tài liệu: {String(part.output.error)}
      </div>
    );
  }

  return (
    <DocumentPreview
      isReadonly={isReadonly}
      key={toolCallId}
      result={part.output}
    />
  );
};
