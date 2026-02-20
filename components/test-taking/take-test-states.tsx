"use client";

import { HomeIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TakeTestLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Đang tải dữ liệu bài kiểm tra...
        </CardContent>
      </Card>
    </div>
  );
}

export function TakeTestEmptyState() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle>Chưa có đề để làm bài</CardTitle>
          <CardDescription>
            Bạn cần tạo câu hỏi trong màn hình test generator trước khi bắt đầu
            làm bài.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/test-generator">
              <HomeIcon className="size-4" />
              Quay lại tạo đề
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

type TakeTestPreStartStateProps = {
  title: string;
  totalQuestions: number;
  selectedDurationMinutes: number;
  onStart: () => void;
};

export function TakeTestPreStartState({
  title,
  totalQuestions,
  selectedDurationMinutes,
  onStart,
}: TakeTestPreStartStateProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-2xl border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle>Sẵn sàng bắt đầu bài kiểm tra</CardTitle>
          <CardDescription>
            Nội dung câu hỏi và đáp án sẽ chỉ hiển thị sau khi bạn bắt đầu làm
            bài.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Tên đề</p>
              <p className="font-medium text-sm">{title}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Số câu hỏi</p>
              <p className="font-medium text-sm">{totalQuestions}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-muted-foreground text-xs">Thời gian</p>
              <p className="font-medium text-sm">
                {selectedDurationMinutes} phút
              </p>
            </div>
          </div>

          <Button className="w-full sm:w-auto" onClick={onStart} type="button">
            Bắt đầu làm bài kiểm tra
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
