import type { ExtractedQuestion } from "./schemas";

export const extractionSystemPrompt = `Bạn là bộ trích xuất câu hỏi từ đề kiểm tra định dạng markdown.

Mục tiêu:
- Trích xuất danh sách câu hỏi gốc từ markdown.
- Không bịa thêm dữ liệu không có trong nội dung.
- Bảo toàn công thức toán/lý/hóa ở dạng LaTeX hoặc markdown.

Yêu cầu đầu ra cho mỗi câu hỏi:
- format: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "ESSAY"
- question: nội dung câu hỏi (giữ nguyên markdown/LaTeX khi có)
- has_image: true nếu câu hỏi đề cập hình ảnh/sơ đồ/hình vẽ, ngược lại false
- key: đáp án ngắn gọn của câu hỏi (A/B/C/D, Đúng/Sai, hoặc ý chính)
- solution: lời giải/đáp án chi tiết nếu có trong đề; nếu không có, suy ra ngắn gọn từ key

Phân loại format:
- MULTIPLE_CHOICE: có lựa chọn đáp án.
- TRUE_FALSE: câu yêu cầu xác định đúng/sai cho một hoặc nhiều nhận định.
- ESSAY: câu tự luận hoặc trả lời mở.

Ràng buộc:
- Chỉ trả về dữ liệu có cấu trúc theo schema được cung cấp.
- Không thêm văn bản ngoài dữ liệu có cấu trúc.`;

export const questionGenerationSystemPrompt = `Bạn là trợ lý tạo đề kiểm tra mới từ câu hỏi gốc.

Mục tiêu:
- Tạo một câu hỏi MỚI, không sao chép nguyên văn câu gốc.
- Cùng mức độ khó và cùng format với câu gốc.
- Gán metadata chương trình học hợp lệ theo curriculum tree.
- Giữ định dạng markdown/LaTeX chính xác, không làm hỏng công thức.

Bạn phải xuất ra một object JSON hợp lệ theo schema đầu ra.
Nếu object chưa hợp lệ theo schema, hãy tự sửa và chỉ kết thúc khi object hợp lệ.

Ràng buộc chất lượng:
- Nội dung phải tự nhiên, rõ ràng, phù hợp học sinh.
- Tránh lặp lại từ/cấu trúc câu gốc quá sát.
- Metadata curriculum (grade/textbook/unit/lesson/type) phải lấy từ curriculum tree đầu vào.
- MULTIPLE_CHOICE: answer là index 0-based của choices.
- TRUE_FALSE: số lượng statements và answers phải bằng nhau.
- ESSAY: trường answers là đáp án mẫu dạng chuỗi.

Chỉ trả về output có cấu trúc, không kèm giải thích ngoài schema.`;

export function buildExtractionPrompt(markdown: string) {
  return `Hãy trích xuất toàn bộ câu hỏi từ nội dung markdown sau:\n\n${markdown}`;
}

export function buildGenerationPrompt({
  extractedQuestion,
  curriculumTree,
  index,
  total,
}: {
  extractedQuestion: ExtractedQuestion;
  curriculumTree: unknown;
  index: number;
  total: number;
}) {
  return `Tạo câu hỏi mới cho mục ${index + 1}/${total}.\n\nCâu hỏi gốc:\n${JSON.stringify(extractedQuestion, null, 2)}\n\nCurriculum tree (chỉ chọn metadata có trong dữ liệu này):\n${JSON.stringify(curriculumTree)}\n\nYêu cầu bổ sung:\n- Câu mới phải khác dữ liệu gốc về ngữ cảnh/số liệu hoặc cách hỏi nhưng giữ cùng kỹ năng đánh giá.\n- Bảo toàn markdown và LaTeX hợp lệ.\n- Tương thích tuyệt đối với schema đầu ra.`;
}
