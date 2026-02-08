"use client";

import { DocumentPreview } from "@/components/document-preview";
import type { ChatMessage } from "@/lib/types";

type ToolUpdateDocumentPreviewProps = {
  part: Extract<ChatMessage["parts"][number], { type: "tool-updateDocument" }>;
  isReadonly: boolean;
};

export const ToolUpdateDocumentPreview = ({
  part,
  isReadonly,
}: ToolUpdateDocumentPreviewProps) => {
  const { toolCallId } = part;

  if (part.output && "error" in part.output) {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
        key={toolCallId}
      >
        Lỗi cập nhật tài liệu: {String(part.output.error)}
      </div>
    );
  }

  return (
    <div className="relative" key={toolCallId}>
      <DocumentPreview
        args={{ ...part.output, isUpdate: true }}
        isReadonly={isReadonly}
        result={part.output}
      />
    </div>
  );
};
