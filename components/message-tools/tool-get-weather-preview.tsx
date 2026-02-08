"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
} from "@/components/elements/tool";
import { Weather } from "@/components/weather";
import type { ChatMessage } from "@/lib/types";

type ToolGetWeatherPreviewProps = {
  part: Extract<ChatMessage["parts"][number], { type: "tool-getWeather" }>;
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
};

export const ToolGetWeatherPreview = ({
  part,
  addToolApprovalResponse,
}: ToolGetWeatherPreviewProps) => {
  const { toolCallId, state } = part;
  const approvalId = (part as { approval?: { id: string } }).approval?.id;
  const isDenied =
    state === "output-denied" ||
    (state === "approval-responded" &&
      (part as { approval?: { approved?: boolean } }).approval?.approved ===
        false);
  const widthClass = "w-[min(100%,450px)]";

  if (state === "output-available") {
    return (
      <div className={widthClass} key={toolCallId}>
        <Weather weatherAtLocation={part.output} />
      </div>
    );
  }

  if (isDenied) {
    return (
      <div className={widthClass} key={toolCallId}>
        <Tool className="w-full" defaultOpen={true}>
          <ToolHeader state="output-denied" type="tool-getWeather" />
          <ToolContent>
            <div className="px-4 py-3 text-muted-foreground text-sm">
              Việc tra cứu thời tiết đã bị từ chối.
            </div>
          </ToolContent>
        </Tool>
      </div>
    );
  }

  if (state === "approval-responded") {
    return (
      <div className={widthClass} key={toolCallId}>
        <Tool className="w-full" defaultOpen={true}>
          <ToolHeader state={state} type="tool-getWeather" />
          <ToolContent>
            <ToolInput input={part.input} />
          </ToolContent>
        </Tool>
      </div>
    );
  }

  return (
    <div className={widthClass} key={toolCallId}>
      <Tool className="w-full" defaultOpen={true}>
        <ToolHeader state={state} type="tool-getWeather" />
        <ToolContent>
          {(state === "input-available" || state === "approval-requested") && (
            <ToolInput input={part.input} />
          )}
          {state === "approval-requested" && approvalId && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button
                className="rounded-md px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => {
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: false,
                    reason: "User denied weather lookup",
                  });
                }}
                type="button"
              >
                Từ chối
              </button>
              <button
                className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm transition-colors hover:bg-primary/90"
                onClick={() => {
                  addToolApprovalResponse({
                    id: approvalId,
                    approved: true,
                  });
                }}
                type="button"
              >
                Cho phép
              </button>
            </div>
          )}
        </ToolContent>
      </Tool>
    </div>
  );
};
