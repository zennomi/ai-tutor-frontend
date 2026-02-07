import {
  ConversationalSearchServiceClient,
  SearchServiceClient,
} from "@google-cloud/discoveryengine";
import { tool } from "ai";
import { z } from "zod";

const VERTEX_DATA_STORE_ID = process.env.VERTEX_DATA_STORE_ID;
const VERTEX_ENGINE_ID = process.env.VERTEX_ENGINE_ID;
const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID;
const VERTEX_SEARCH_LOCATION = process.env.VERTEX_SEARCH_LOCATION;

if (
  !VERTEX_DATA_STORE_ID ||
  !VERTEX_ENGINE_ID ||
  !VERTEX_PROJECT_ID ||
  !VERTEX_SEARCH_LOCATION
) {
  throw new Error("Missing Vertex AI configuration");
}

const client = new SearchServiceClient();

const conversationalClient = new ConversationalSearchServiceClient();
const servingConfig = `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_SEARCH_LOCATION}/collections/default_collection/dataStores/${VERTEX_DATA_STORE_ID}/servingConfigs/default_search`;
const answerServingConfig = `projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_SEARCH_LOCATION}/collections/default_collection/engines/${VERTEX_ENGINE_ID}/servingConfigs/default_serving_config`;

export const searchQuery = async (query: string) => {
  const [results] = await client.search(
    {
      servingConfig,
      query,
      pageSize: 5,
      // Without contentSearchSpec, the API returns only metadata (link, title, etc.)
      // and no body text. snippetSpec + returnSnippet gets text snippets into
      // document.derivedStructData. CHUNKS mode gets result.chunk.content when
      // the data store has chunking_config enabled.
      contentSearchSpec: {
        // Request text snippets; they appear in document.derivedStructData (e.g.
        // "snippet", "snippet_status"). Without this, only metadata is returned.
        snippetSpec: { returnSnippet: true },
        // Optional: use "CHUNKS" to get result.chunk.content. Only works when the
        // data store has DocumentProcessingConfig.chunking_config. Default is DOCUMENTS.
        // searchResultMode: "CHUNKS",
      },
    },
    { autoPaginate: false }
  );

  // Extract usable text: chunk.content (CHUNKS mode), snippets, or title from document.
  return (results || []).map((r) => {
    const fields =
      (
        r as {
          document?: {
            derivedStructData?: { fields?: Record<string, unknown> };
          };
        }
      ).document?.derivedStructData?.fields ?? {};
    const getStr = (k: string) =>
      (fields[k] as { stringValue?: string } | undefined)?.stringValue;

    // SnippetSpec returns "snippets" (list of {snippet, snippet_status}); use first.
    const chunk = (r as { chunk?: { content?: string } | null }).chunk;
    let text: string | null = chunk?.content ?? getStr("snippet") ?? null;
    if (
      !text &&
      fields.snippets &&
      typeof fields.snippets === "object" &&
      "listValue" in fields.snippets
    ) {
      const list = (
        fields.snippets as {
          listValue?: {
            values?: Array<{
              structValue?: {
                fields?: Record<string, { stringValue?: string }>;
              };
            }>;
          };
        }
      ).listValue;
      const first = list?.values?.[0]?.structValue?.fields;
      text =
        (first?.snippet as { stringValue?: string } | undefined)?.stringValue ??
        null;
    }
    text = text ?? getStr("title") ?? null;

    return {
      text,
      title: getStr("title") ?? null,
      link: getStr("link") ?? null,
      chunk: r.chunk ?? null,
      document: r.document ?? null,
    };
  });
};

export const answerQuery = async (query: string) => {
  const [response] = await conversationalClient.answerQuery({
    servingConfig: answerServingConfig,
    query: {
      text: query,
    },
    // Optional: Controls for how the answer is generated
    answerGenerationSpec: {
      modelSpec: {
        modelVersion: "gemini-2.0-flash-001/answer_gen/v1", // Use the latest available
      },
      promptSpec: {
        preamble:
          "Bạn là trợ lý giải bài tập. Bạn cần phải trả lời câu hỏi của người dùng dựa trên các tài liệu được cung cấp.",
      },
      includeCitations: true,
      answerLanguageCode: "vi",
    },
  });
  return response;
};

export const searchKnowledgeBase = tool({
  description:
    "Tìm kiếm kiến thức lý thuyết trong giáo trình/tài liệu (Vertex Search AI).",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Câu hỏi về kiến thức/khái niệm/công thức liên quan đến bài tập/câu hỏi"
      ),
  }),
  execute: async ({ query }) => {
    // Construct the serving configuration path
    // return "Không tìm thấy kiến thức liên quan trong các tài liệu được cung cấp."
    try {
      const response = await answerQuery(query);

      // The response returns "contexts" which contains an array of "contexts" (chunks)
      if (!response.answer) {
        return "Không tìm thấy kiến thức liên quan trong các tài liệu được cung cấp.";
      }
      if (!response.answer.answerText) {
        return "Không tìm thấy kiến thức liên quan trong các tài liệu được cung cấp.";
      }
      return response.answer.answerText;
    } catch (error) {
      console.error("RAG Retrieval Error:", error);
      return "Lỗi khi tìm kiếm kiến thức.";
    }
  },
});
