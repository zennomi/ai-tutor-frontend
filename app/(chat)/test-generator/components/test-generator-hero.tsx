"use client";

import { BookIcon, BrainIcon } from "lucide-react";
import { SparklesIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { TestGeneratorPipelineStep } from "@/lib/test-generator/schemas";
import { cn } from "@/lib/utils";

type PipelineStepStatus = "completed" | "running" | "error" | "pending";

type TestGeneratorHeroProps = {
  stepOrder: TestGeneratorPipelineStep[];
  getPipelineStepStatus: (
    step: TestGeneratorPipelineStep
  ) => PipelineStepStatus;
};

export function TestGeneratorHero({
  stepOrder,
  getPipelineStepStatus,
}: TestGeneratorHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/20 via-primary/5 to-background p-6 md:p-8">
      <div className="absolute -top-20 -right-20 size-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 size-64 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute top-6 right-6 hidden rounded-xl border border-primary/20 bg-background/70 p-3 backdrop-blur md:block">
        <div className="grid grid-cols-5 gap-1">
          {stepOrder.map((step) => {
            const status = getPipelineStepStatus(step);

            return (
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  status === "completed" && "bg-green-500",
                  status === "running" && "animate-pulse bg-blue-500",
                  status === "error" && "bg-destructive",
                  status === "pending" && "bg-muted-foreground/30"
                )}
                key={`hero-dot-${step}`}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className="gap-1.5 bg-background/80 backdrop-blur"
            variant="secondary"
          >
            <SparklesIcon size={14} />
            Test Generator
          </Badge>
          <Badge
            className="gap-1.5 bg-background/80 backdrop-blur"
            variant="secondary"
          >
            <BookIcon className="size-3.5" />
            DOCX Pipeline
          </Badge>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
              Tạo đề kiểm tra DOCX
            </h1>
            <p className="max-w-2xl text-muted-foreground text-sm md:text-base">
              Tải lên đề gốc, tái sinh câu hỏi theo curriculum và xuất lại DOCX
              với tiến trình streaming theo từng bước.
            </p>
          </div>

          <div className="hidden min-w-[180px] rounded-xl border bg-background/80 p-3 shadow-sm backdrop-blur md:block">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs">
              <BrainIcon className="size-3.5" />
              Smart Workflow
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bước</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Realtime</span>
                <span className="font-medium">Stream</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Output</span>
                <span className="font-medium">DOCX</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
