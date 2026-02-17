import { generateText, Output } from "ai";
import { auth } from "@/app/(auth)/auth";
import { getLanguageModel } from "@/lib/ai/providers";
import { ChatSDKError } from "@/lib/errors";
import {
  gradeEssayRequestSchema,
  gradeEssayResponseSchema,
} from "@/lib/test-generator/schemas";

export const maxDuration = 60;

const essayGradingSystemPrompt = `Bạn là giám khảo tự động cho câu hỏi tự luận.

Nhiệm vụ:
- Chấm điểm câu trả lời học sinh theo thang 0..1.
- So sánh với đáp án kỳ vọng.
- Trả về phản hồi ngắn gọn, cụ thể, tập trung vào điểm đúng/sai chính.

Quy tắc:
- Chỉ xuất dữ liệu theo schema được yêu cầu.
- score phải trong [0, 1].
- Nếu câu trả lời trống hoặc lạc đề hoàn toàn, score nên gần 0.
- Nếu đầy đủ và chính xác, score nên gần 1.
- feedback nên hữu ích, rõ ràng và không quá dài.`;

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:auth").toResponse();
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid JSON payload"
    ).toResponse();
  }

  const parsedPayload = gradeEssayRequestSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid essay grading payload"
    ).toResponse();
  }

  const { question, expectedAnswer, studentAnswer, locale } =
    parsedPayload.data;

  try {
    const gradingResult = await generateText({
      model: getLanguageModel("gemini-2.5-flash"),
      system: essayGradingSystemPrompt,
      prompt: [
        `Locale: ${locale ?? "vi"}`,
        "",
        "Question:",
        question,
        "",
        "Expected answer:",
        expectedAnswer,
        "",
        "Student answer:",
        studentAnswer,
      ].join("\n"),
      output: Output.object({
        schema: gradeEssayResponseSchema,
      }),
    });

    const result = gradeEssayResponseSchema.parse(gradingResult.output);

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error("essay grading failed", {
      userId: session.user.id,
      locale,
      error,
    });

    return new ChatSDKError(
      "bad_request:api",
      "Failed to grade essay answer"
    ).toResponse();
  }
}
