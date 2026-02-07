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
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    description: "Ultra fast and affordable",
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    provider: "google",
    description: "Preview of Gemini 3 Pro",
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
