"use client";
import type { UseChatHelpers } from "@ai-sdk/react";
import Image from "next/image";
import { useState } from "react";
import type { Vote } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageLoadingIndicator } from "./message-loading-indicator";
import { MessageReasoning } from "./message-reasoning";
import { ToolPreviewRouter } from "./message-tools/tool-preview-router";
import { PreviewAttachment } from "./preview-attachment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

const PurePreviewMessage = ({
  addToolApprovalResponse,
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding: _requiresScrollPadding,
  showToolMessages,
}: {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  showToolMessages: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [previewAttachment, setPreviewAttachment] = useState<{
    url: string;
    name: string;
    contentType?: string;
  } | null>(null);

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  const hasTextPart =
    message.parts?.some((part) => part.type === "text" && part.text?.trim()) ??
    false;
  const hasVisibleToolPart =
    (showToolMessages &&
      (message.parts?.some((part) => part.type.startsWith("tool-")) ??
        false)) ||
    (message.parts?.some(
      (part) =>
        part.type.startsWith("tool-") &&
        (("state" in part &&
          (part.state === "approval-requested" ||
            part.state === "input-available" ||
            part.state === "approval-responded" ||
            part.state === "output-denied")) ||
          part.type === "tool-requestSuggestions")
    ) ??
      false);

  useDataStream();

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
      data-testid={`message-${message.role}`}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": hasTextPart,
            "w-full":
              (message.role === "assistant" &&
                (hasTextPart || hasVisibleToolPart)) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: attachment.filename ?? "file",
                    contentType: attachment.mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                  onPreview={(att) => {
                    setPreviewAttachment({
                      url: att.url,
                      name: att.name ?? "Attachment",
                      contentType: att.contentType,
                    });
                  }}
                />
              ))}
            </div>
          )}

          <Dialog
            onOpenChange={(open) => !open && setPreviewAttachment(null)}
            open={!!previewAttachment}
          >
            <DialogContent className="max-w-3xl overflow-hidden p-0">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="truncate pr-8">
                  {previewAttachment?.name}
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center bg-muted/20 p-4 min-h-[200px]">
                {previewAttachment?.contentType?.startsWith("image") ? (
                  <div className="relative w-full h-[60vh]">
                    <Image
                      alt={previewAttachment.name}
                      className="object-contain"
                      fill
                      priority
                      src={previewAttachment.url}
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Không thể xem trước tệp tin này
                    </p>
                    <a
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      href={previewAttachment?.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Tải xuống / Mở trong tab mới
                    </a>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {isLoading && <MessageLoadingIndicator message={message} />}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            const isInteractive =
              ("state" in part &&
                (part.state === "approval-requested" ||
                  part.state === "input-available" ||
                  part.state === "approval-responded" ||
                  part.state === "output-denied")) ||
              type === "tool-requestSuggestions";

            if (
              !showToolMessages &&
              type.startsWith("tool-") &&
              !isInteractive
            ) {
              return null;
            }

            if (type === "reasoning") {
              const hasContent = part.text?.trim().length > 0;
              const isStreaming = "state" in part && part.state === "streaming";
              if (hasContent || isStreaming) {
                return (
                  <MessageReasoning
                    isLoading={isLoading || isStreaming}
                    key={key}
                    reasoning={part.text || ""}
                  />
                );
              }
            }

            if (type === "text") {
              if (mode === "view") {
                return (
                  <div key={key}>
                    <MessageContent
                      className={cn({
                        "wrap-break-word w-fit rounded-2xl px-3 py-2 text-right text-white":
                          message.role === "user",
                        "bg-transparent px-0 py-0 text-left":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                      style={
                        message.role === "user"
                          ? { backgroundColor: "#006cff" }
                          : undefined
                      }
                    >
                      <Response>{sanitizeText(part.text)}</Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type.startsWith("tool-") && showToolMessages) {
              return (
                <ToolPreviewRouter
                  addToolApprovalResponse={addToolApprovalResponse}
                  isReadonly={isReadonly}
                  key={key}
                  part={part}
                />
              );
            }

            return null;
          })}

          {!isReadonly && (
            <MessageActions
              chatId={chatId}
              isLoading={isLoading}
              key={`action-${message.id}`}
              message={message}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = PurePreviewMessage;

export const ThinkingMessage = () => {
  return (
    <div
      className="group/message fade-in w-full animate-in duration-300"
      data-role="assistant"
      data-testid="message-assistant-loading"
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <div className="animate-pulse">
            <SparklesIcon size={14} />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-1 p-0 text-muted-foreground text-sm">
            <span className="animate-pulse">Đang suy nghĩ</span>
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
