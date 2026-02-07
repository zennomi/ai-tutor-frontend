import { tool } from "ai";
import z from "zod";

export const searchExerciseFunc = async ({
  exerciseText,
}: {
  exerciseText: string;
}) => {
  const searchParams = new URLSearchParams({
    search: exerciseText,
    limit: "5", // Default limit
    page: "1",
  });

  const url = `${process.env.API_HOST_URL}/api/v1/curriculum/exercises?${searchParams.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    const data =
      (await response.json()) as OffsetPaginatedDto<SearchExercisesResDto>;
    const exercises = data.data.filter((item) => item.distance < 0.7);
    if (exercises.length === 0) {
      return "Không tìm thấy bài tập tương tự";
    }
    return exercises;
  } catch (error) {
    console.error("Error finding exercise:", error);
    return `Error finding exercise: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const searchExercise = tool({
  description:
    "Tìm bài tập tương tự trong cơ sở dữ liệu bằng cách truyền nội dung bài tập và các lựa chọn đáp án đã trích xuất",
  inputSchema: z.object({
    exerciseText: z
      .string()
      .describe("Nội dung bài tập và các lựa chọn đáp án"),
  }),
  execute: async ({ exerciseText }) => {
    const result = await searchExerciseFunc({ exerciseText });
    return result;
  },
});

interface SearchExercisesResDto {
  id: string;
  textbook: string;
  unit: string;
  lesson: string;
  type: string;
  format: string;
  grade: string;
  question: string;
  hasImage: boolean;
  key: string;
  solution: string;
  distance: number;
}

interface OffsetPaginatedDto<T> {
  data: T[];
  meta: {
    page: number;
    take: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}
