// Curated list of top models (Google direct)
export const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  // Google (direct)
  {
    id: "gemini-3-pro-preview",
    name: "Trợ giảng Thủ khoa",
    provider: "google",
    description:
      "Trợ giảng Top 1 Hà Nội Top 3 Quốc Gia Á khoa Đầu vào Thủ khoa đầu ra",
  },
  {
    id: "gemini-2.0-flash",
    name: "Trợ giảng thực tập",
    provider: "google",
    description: "Trợ giảng vừa được nhận vào làm lương 1 triệu mốt",
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
