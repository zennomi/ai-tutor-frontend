import { useMemo } from "react";
import type { ChatMessage } from "@/lib/types";

export const MessageLoadingIndicator = ({
  message,
}: {
  message: ChatMessage;
}) => {
  const loadingText = useMemo(() => {
    const lastPart = message.parts.at(-1);
    if (!lastPart || lastPart.type === "text") {
      return "";
    }
    const { type } = lastPart;
    if (type === "step-start") {
      return "Bắt đầu tìm hiểu";
    }
    if (
      type.startsWith("tool-") &&
      "state" in lastPart &&
      (lastPart.state === "streaming" ||
        lastPart.state === "input-streaming" ||
        lastPart.state === "approval-requested" ||
        lastPart.state === "input-available")
    ) {
      return getToolLoadingMessage(type);
    }
    return "";
  }, [message.parts]);

  return (
    <div className="flex w-full flex-col gap-2 md:gap-4">
      <div className="flex items-center gap-1 p-0 text-muted-foreground text-sm">
        <span className="animate-pulse">{loadingText}</span>
        <span className="inline-flex">
          <span className="animate-bounce [animation-delay:0ms]">.</span>
          <span className="animate-bounce [animation-delay:150ms]">.</span>
          <span className="animate-bounce [animation-delay:300ms]">.</span>
        </span>
      </div>
    </div>
  );
};

function getToolLoadingMessage(toolType: string): string {
  const messages: Record<string, string> = {
    "tool-searchKnowledgeBase": "Đang nghiên cứu giáo trình",
    "tool-searchExercise": "Đang tìm bài tập tương tự",
    "tool-getWeather": "Đang kiểm tra thời tiết",
    "tool-createDocument": "Đang tạo tài liệu",
    "tool-updateDocument": "Đang cập nhật tài liệu",
    "tool-requestSuggestions": "Đang tạo gợi ý",
  };
  return messages[toolType] ?? "Đang xử lý";
}
