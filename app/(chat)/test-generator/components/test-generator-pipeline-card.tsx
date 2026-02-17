"use client";

import {
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";
import { CheckCircleFillIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TestGeneratorPipelineStep } from "@/lib/test-generator/schemas";
import { cn } from "@/lib/utils";

type PipelineStepStatus = "completed" | "running" | "error" | "pending";

type TestGeneratorPipelineCardProps = {
  currentStep: "idle" | TestGeneratorPipelineStep;
  isRunning: boolean;
  progress: number;
  statusMessage: string;
  stepOrder: TestGeneratorPipelineStep[];
  stepLabel: Record<"idle" | TestGeneratorPipelineStep, string>;
  stepActionLabel: Record<TestGeneratorPipelineStep, string>;
  getPipelineStepStatus: (
    step: TestGeneratorPipelineStep
  ) => PipelineStepStatus;
};

const stepStatusBadge = {
  completed: {
    icon: <CheckCircleIcon className="size-4 text-green-600" />,
    label: "Hoàn tất",
    className: "border-green-500/30 bg-green-500/10 text-green-700",
  },
  running: {
    icon: <ClockIcon className="size-4 animate-pulse text-blue-600" />,
    label: "Đang chạy",
    className: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  },
  error: {
    icon: <XCircleIcon className="size-4 text-red-600" />,
    label: "Lỗi",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  pending: {
    icon: <CircleIcon className="size-4 text-muted-foreground" />,
    label: "Chờ",
    className: "border-border bg-secondary/70",
  },
} as const;

export function TestGeneratorPipelineCard({
  currentStep,
  isRunning,
  progress,
  statusMessage,
  stepOrder,
  stepLabel,
  stepActionLabel,
  getPipelineStepStatus,
}: TestGeneratorPipelineCardProps) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">2. Tiến trình pipeline</CardTitle>
            <CardDescription>
              Bước hiện tại: {stepLabel[currentStep]}
              {isRunning ? " (đang chạy)" : ""}
            </CardDescription>
          </div>
          <Badge className="gap-1.5" variant="secondary">
            {isRunning ? (
              <ClockIcon className="size-3.5 animate-pulse" />
            ) : progress === 100 ? (
              <CheckCircleFillIcon size={14} />
            ) : (
              <CircleIcon className="size-3.5" />
            )}
            {isRunning ? "Running" : progress === 100 ? "Done" : "Idle"}
          </Badge>
        </div>

        <Progress value={progress} />
        <p className="text-muted-foreground text-sm">{statusMessage}</p>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {stepOrder.map((step, index) => {
          const status = getPipelineStepStatus(step);
          const statusMeta = stepStatusBadge[status];
          const isCurrent = step === currentStep;

          return (
            <div className="relative" key={step}>
              {index < stepOrder.length - 1 && (
                <span
                  className={cn(
                    "absolute top-8 left-6 h-[calc(100%-1rem)] w-px",
                    status === "completed" ? "bg-green-500/40" : "bg-border"
                  )}
                />
              )}

              <div
                className={cn(
                  "relative flex items-start gap-3 rounded-lg border p-3",
                  isCurrent && "border-primary/40 bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border",
                    status === "completed" &&
                      "border-green-500/40 bg-green-500/10 text-green-600",
                    status === "running" &&
                      "border-blue-500/40 bg-blue-500/10 text-blue-600",
                    status === "error" &&
                      "border-destructive/40 bg-destructive/10 text-destructive",
                    status === "pending" && "text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <CheckCircleFillIcon size={14} />
                  ) : (
                    statusMeta.icon
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">
                    {index + 1}. {stepLabel[step]}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {stepActionLabel[step]}
                  </p>
                </div>

                <Badge
                  className={cn(
                    "gap-1.5 border text-[11px]",
                    statusMeta.className
                  )}
                  variant="secondary"
                >
                  {statusMeta.icon}
                  {statusMeta.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
