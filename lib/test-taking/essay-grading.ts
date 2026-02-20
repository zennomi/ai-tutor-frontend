import type { GradeEssayResponse } from "@/lib/test-generator/schemas";

export async function gradeEssayAnswer({
  question,
  expectedAnswer,
  studentAnswer,
  locale,
}: {
  question: string;
  expectedAnswer: string;
  studentAnswer: string;
  locale: "vi" | "en";
}) {
  const response = await fetch("/api/test-generator/grade-essay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      expectedAnswer,
      studentAnswer,
      locale,
    }),
  });

  if (!response.ok) {
    let message = "Không thể chấm câu tự luận.";

    try {
      const errorData = (await response.json()) as {
        cause?: string;
        message?: string;
      };

      if (errorData.cause) {
        message = errorData.cause;
      } else if (errorData.message) {
        message = errorData.message;
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(message);
  }

  return (await response.json()) as GradeEssayResponse;
}
