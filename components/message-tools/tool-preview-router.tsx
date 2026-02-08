"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { ChatMessage } from "@/lib/types";
import { ToolCreateDocumentPreview } from "./tool-create-document-preview";
import { ToolGetWeatherPreview } from "./tool-get-weather-preview";
import { ToolRequestSuggestionsPreview } from "./tool-request-suggestions-preview";
import { ToolSearchExercisePreview } from "./tool-search-exercise-preview";
import { ToolSearchKnowledgeBasePreview } from "./tool-search-knowledge-base-preview";
import { ToolUpdateDocumentPreview } from "./tool-update-document-preview";

type ToolPreviewRouterProps = {
  part: ChatMessage["parts"][number];
  isReadonly: boolean;
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
};

export const ToolPreviewRouter = ({
  part,
  isReadonly,
  addToolApprovalResponse,
}: ToolPreviewRouterProps) => {
  const { type } = part;

  switch (type) {
    case "tool-getWeather":
      return (
        <ToolGetWeatherPreview
          addToolApprovalResponse={addToolApprovalResponse}
          part={part}
        />
      );
    case "tool-createDocument":
      return <ToolCreateDocumentPreview isReadonly={isReadonly} part={part} />;
    case "tool-updateDocument":
      return <ToolUpdateDocumentPreview isReadonly={isReadonly} part={part} />;
    case "tool-requestSuggestions":
      return (
        <ToolRequestSuggestionsPreview isReadonly={isReadonly} part={part} />
      );
    case "tool-searchKnowledgeBase":
      return <ToolSearchKnowledgeBasePreview part={part} />;
    case "tool-searchExercise":
      return <ToolSearchExercisePreview part={part} />;
    default:
      return null;
  }
};
