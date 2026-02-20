"use client";

import { BookIcon, BrainIcon, EyeIcon, WrenchIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Response } from "@/components/elements/response";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ExtractedQuestion,
  GeneratedQuestion,
} from "@/lib/test-generator/schemas";
import {
  ExtractedQuestionPreviewCards,
  GeneratedQuestionPreviewCards,
} from "./question-preview-cards";

type PreviewDialog = "markdown" | "extracted" | "generated" | null;

type TestGeneratorPreviewCardProps = {
  markdownPreview: string;
  extractedItems: ExtractedQuestion[];
  generatedItems: GeneratedQuestion[];
  sortedGeneratedPartials: [string, unknown][];
};

type PreviewRowProps = {
  title: string;
  subtitle: string;
  countBadge?: string;
  onViewDetail: () => void;
  icon: ReactNode;
  viewDetailLabel: string;
};

function PreviewRow({
  title,
  subtitle,
  countBadge,
  onViewDetail,
  icon,
  viewDetailLabel,
}: PreviewRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-2 font-medium text-sm">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </p>
        <p className="truncate text-muted-foreground text-xs">{subtitle}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {countBadge ? <Badge variant="secondary">{countBadge}</Badge> : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={viewDetailLabel}
              onClick={onViewDetail}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <EyeIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{viewDetailLabel}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function GeneratedPartialBlocks({
  partials,
}: {
  partials: [string, unknown][];
}) {
  if (partials.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
        Dữ liệu sinh dở (generated-partial)
      </p>

      {partials.map(([index, partial]) => (
        <div
          className="rounded-md border border-dashed bg-muted/20 p-3"
          key={`partial-${index}`}
        >
          <p className="mb-2 font-medium text-sm">
            #{Number(index) + 1} · đang tạo...
          </p>
          <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 font-mono text-xs whitespace-pre-wrap break-words">
            {JSON.stringify(partial, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function TestGeneratorPreviewCard({
  markdownPreview,
  extractedItems,
  generatedItems,
  sortedGeneratedPartials,
}: TestGeneratorPreviewCardProps) {
  const [openDialog, setOpenDialog] = useState<PreviewDialog>(null);

  const generatedCount = useMemo(
    () =>
      generatedItems.filter((item): item is GeneratedQuestion => Boolean(item))
        .length,
    [generatedItems]
  );

  return (
    <>
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">3. Preview dữ liệu stream</CardTitle>
          <CardDescription>
            Markdown, câu hỏi trích xuất và câu hỏi mới được xem chi tiết trong
            dialog.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <PreviewRow
            countBadge={markdownPreview ? "Ready" : "Empty"}
            icon={<BookIcon className="size-4" />}
            onViewDetail={() => setOpenDialog("markdown")}
            subtitle={
              markdownPreview
                ? "Đã nhận markdown từ pipeline."
                : "Chưa có markdown."
            }
            title="Markdown preview"
            viewDetailLabel="Xem chi tiết markdown"
          />

          <PreviewRow
            countBadge={String(extractedItems.length)}
            icon={<WrenchIcon className="size-4" />}
            onViewDetail={() => setOpenDialog("extracted")}
            subtitle={
              extractedItems.length > 0
                ? "Danh sách câu hỏi đã trích xuất từ đề gốc."
                : "Chưa có dữ liệu trích xuất."
            }
            title="Câu hỏi đã trích xuất"
            viewDetailLabel="Xem chi tiết câu hỏi đã trích xuất"
          />

          <PreviewRow
            countBadge={`${generatedCount}${
              sortedGeneratedPartials.length > 0
                ? ` (+${sortedGeneratedPartials.length} partial)`
                : ""
            }`}
            icon={<BrainIcon className="size-4" />}
            onViewDetail={() => setOpenDialog("generated")}
            subtitle={
              generatedCount > 0 || sortedGeneratedPartials.length > 0
                ? "Danh sách câu hỏi đã tạo theo curriculum."
                : "Chưa có câu hỏi mới."
            }
            title="Câu hỏi đã tạo"
            viewDetailLabel="Xem chi tiết câu hỏi đã tạo"
          />
        </CardContent>
      </Card>

      <Dialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOpenDialog(null);
          }
        }}
        open={openDialog !== null}
      >
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b p-4 pr-12">
            <DialogTitle>
              {openDialog === "markdown" && "Markdown preview"}
              {openDialog === "extracted" && "Câu hỏi đã trích xuất"}
              {openDialog === "generated" && "Câu hỏi đã tạo"}
            </DialogTitle>
            <DialogDescription>
              {openDialog === "markdown" &&
                "Nội dung markdown được tạo từ tệp DOCX."}
              {openDialog === "extracted" &&
                `${extractedItems.length} câu hỏi đã được trích xuất từ đề gốc.`}
              {openDialog === "generated" &&
                `${generatedCount} câu hỏi hoàn chỉnh${
                  sortedGeneratedPartials.length > 0
                    ? `, ${sortedGeneratedPartials.length} câu đang sinh dở`
                    : ""
                }.`}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto p-4">
            {openDialog === "markdown" ? (
              markdownPreview ? (
                <div className="rounded-md border bg-background p-4">
                  <Response>{markdownPreview}</Response>
                </div>
              ) : (
                <p className="rounded-md border border-dashed bg-muted/30 p-3 text-muted-foreground text-sm">
                  Chưa có markdown.
                </p>
              )
            ) : null}

            {openDialog === "extracted" ? (
              <ExtractedQuestionPreviewCards items={extractedItems} />
            ) : null}

            {openDialog === "generated" ? (
              <div className="space-y-4">
                <GeneratedPartialBlocks partials={sortedGeneratedPartials} />
                <GeneratedQuestionPreviewCards items={generatedItems} />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
