import "server-only";

import {
  type GenerateDocxPayload,
  generateDocxPayloadSchema,
  generatedDocxResultSchema,
} from "./schemas";

function getApiHostUrl() {
  const host = process.env.API_HOST_URL;

  if (!host) {
    throw new Error("API host is not configured");
  }

  return host;
}

function buildApiUrl(pathname: string) {
  const host = getApiHostUrl();
  return `${host}${pathname}`;
}

export async function convertDocxToMarkdown(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    buildApiUrl("/api/v1/documents/docx/to-markdown"),
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to convert DOCX to markdown");
  }

  const data = (await response.json()) as {
    markdown?: string;
    content?: string;
    data?: { markdown?: string; content?: string };
  };

  const markdown =
    data.markdown ?? data.content ?? data.data?.markdown ?? data.data?.content;

  if (!markdown || typeof markdown !== "string") {
    throw new Error("Invalid markdown conversion response");
  }

  return { markdown };
}

export async function fetchCurriculumTree() {
  const response = await fetch(buildApiUrl("/api/v1/curriculum/tree"), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch curriculum tree");
  }

  const data = (await response.json()) as unknown;
  return data;
}

export async function generateTestDocx(payload: GenerateDocxPayload) {
  const safePayload = generateDocxPayloadSchema.parse(payload);

  const response = await fetch(
    buildApiUrl("/api/v1/documents/docx/generate-test"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safePayload),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to generate DOCX test");
  }

  const json = (await response.json()) as {
    url?: string;
    filename?: string;
    path?: string;
    data?: {
      url?: string;
      filename?: string;
      path?: string;
    };
  };

  const normalized = {
    url: json.url ?? json.data?.url,
    filename: json.filename ?? json.data?.filename,
    path: json.path ?? json.data?.path,
  };

  return generatedDocxResultSchema.parse(normalized);
}
