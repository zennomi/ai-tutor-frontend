import type { TestGeneratorPipelineStep } from "../test-generator/schemas";
import type { TestGeneratorStepKey } from "../types";

export const TEST_GENERATOR_STEP_LABEL: Record<TestGeneratorStepKey, string> = {
  idle: "Sẵn sàng",
  convert: "Chuyển DOCX → Markdown",
  extract: "Trích xuất câu hỏi",
  curriculum: "Tải curriculum metadata",
  generate: "Tạo câu hỏi mới",
  export: "Xuất DOCX",
};

export const TEST_GENERATOR_DEFAULT_TITLE = "Đề kiểm tra mới";

export const TEST_GENERATOR_STEP_ORDER: TestGeneratorPipelineStep[] = [
  "convert",
  "extract",
  "curriculum",
  "generate",
  "export",
];

export const TEST_GENERATOR_STEP_ACTION_LABEL: Record<
  TestGeneratorPipelineStep,
  string
> = {
  convert: "Đọc DOCX",
  extract: "Trích câu hỏi",
  curriculum: "Đối chiếu curriculum",
  generate: "Tái sinh câu hỏi",
  export: "Xuất DOCX",
};
