/**
 * worker/src/routes/chat.ts
 *
 * Hono router for AI chat interactions and manual file saves.
 *
 * Endpoints:
 *   GET   /api/projects/:id/chat       — Return full chat history for a project
 *   POST  /api/projects/:id/chat       — Stream an AI generation via SSE
 *   PATCH /api/projects/:id/chat/save  — Save manually edited files as a new version
 *
 * The POST endpoint is the core of the application. It:
 *   1. Validates the user message and model
 *   2. Checks that the user has sufficient credits
 *   3. Loads the current project files and chat history from storage
 *   4. Streams the AI response back to the client via Server-Sent Events (SSE)
 *   5. After the stream completes, parses generated files, saves a new version
 *      to R2, updates the project in KV, appends messages to the chat history,
 *      and deducts credits
 *
 * SSE event format:
 *   data: {"type":"token","content":"..."}                         — streaming token
 *   data: {"type":"done","versionNumber":1,"changedFiles":[...]}   — completion
 *   data: {"type":"error","error":"..."}                           — error
 *
 * Used by: worker/src/index.ts
 */

import { Hono } from "hono";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { nanoid } from "nanoid";
import type { Env, AppVariables } from "../types";
import type { Project, Version, ProjectFile } from "../types/project";
import type { ChatMessage, ChatSession, ImageAttachment } from "../types/chat";
import { buildSystemPrompt, prepareChatHistory } from "../ai/system-prompt";
import {
  parseFilesFromResponse,
  mergeFiles,
  extractExplanation,
} from "../ai/file-parser";
import { checkCredits, deductCredits } from "../services/credits";
import { sanitizeChatMessage, isValidModelId } from "../services/sanitize";

// ---------------------------------------------------------------------------
// Model configuration
// ---------------------------------------------------------------------------

/** Credits charged per generation for each model. */
const MODEL_CREDIT_COSTS: Record<string, number> = {
  "claude-sonnet-4-5": 2,
  "claude-haiku-3-5": 1,
  "gpt-4o": 2,
  "gpt-4o-mini": 1,
  "gemini-2-flash": 1,
  "gemini-2-pro": 2,
  "deepseek-v3": 1,
  "deepseek-r1": 1,
  // OpenRouter models (prefixed with "or/")
  "or/meta-llama/llama-4-maverick": 1,
  "or/mistralai/devstral-small": 1,
  "or/qwen/qwen3-235b-a22b": 2,
  "or/google/gemini-2.5-pro-preview-06-05": 2,
  // xAI Grok models
  "grok-3": 2,
  "grok-3-mini": 1,
};

const VALID_MODELS = new Set(Object.keys(MODEL_CREDIT_COSTS));

/**
 * Maps an internal model ID to a provider-specific AI SDK model instance.
 * Creates provider clients on demand using the API keys from the Worker env.
 *
 * @param modelId - One of the known model IDs (e.g. "gpt-4o-mini")
 * @param env - Worker environment containing all API keys
 * @returns AI SDK model object ready for use with streamText
 */
function getModel(modelId: string, env: Env) {
  // OpenRouter models — detected by "or/" prefix
  if (modelId.startsWith("or/")) {
    const orModelId = modelId.slice(3); // strip "or/" prefix
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    });
    return openrouter(orModelId);
  }

  const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_AI_API_KEY });
  const deepseek = createDeepSeek({ apiKey: env.DEEPSEEK_API_KEY });

  switch (modelId) {
    case "claude-sonnet-4-5":
      return anthropic("claude-sonnet-4-5");
    case "claude-haiku-3-5":
      return anthropic("claude-haiku-3-5-20240307");
    case "gpt-4o":
      return openai("gpt-4o");
    case "gpt-4o-mini":
      return openai("gpt-4o-mini");
    case "gemini-2-flash":
      return google("gemini-2.0-flash");
    case "gemini-2-pro":
      return google("gemini-2.0-pro-exp-03-25");
    case "deepseek-v3":
      return deepseek("deepseek-chat");
    case "deepseek-r1":
      return deepseek("deepseek-reasoner");
    case "grok-3": {
      const xai = createOpenAI({ baseURL: "https://api.x.ai/v1", apiKey: env.XAI_API_KEY });
      return xai("grok-3");
    }
    case "grok-3-mini": {
      const xai = createOpenAI({ baseURL: "https://api.x.ai/v1", apiKey: env.XAI_API_KEY });
      return xai("grok-3-mini");
    }
    default:
      return openai("gpt-4o-mini");
  }
}

export const chatRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ---------------------------------------------------------------------------
// GET /:id/chat — Return chat history
// ---------------------------------------------------------------------------

chatRouter.get("/:id/chat", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Not found" }, 404);
  }

  const session = await c.env.METADATA.get<ChatSession>(`chat:${id}`, "json");
  const now = new Date().toISOString();

  return c.json(
    session ?? {
      projectId: id,
      messages: [],
      createdAt: now,
      updatedAt: now,
    }
  );
});

// ---------------------------------------------------------------------------
// POST /:id/chat — Stream AI generation via SSE
// ---------------------------------------------------------------------------

chatRouter.post("/:id/chat", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  // Parse and validate request body
  const body = await c.req.json<{
    message: string;
    model: string;
    images?: ImageAttachment[];
  }>();

  const message = sanitizeChatMessage(body.message || "");
  const modelId = isValidModelId(body.model, VALID_MODELS)
    ? body.model
    : "gpt-4o-mini";
  const images = body.images ?? [];

  if (!message) {
    return c.json({ error: "Message required" }, 400);
  }

  // Verify project ownership
  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Not found" }, 404);
  }

  // Check credits before starting the generation
  const creditCost = MODEL_CREDIT_COSTS[modelId] ?? 1;
  const { allowed } = await checkCredits(userId, creditCost, c.env);
  if (!allowed) {
    return c.json(
      { error: "Insufficient credits. Please upgrade to Pro." },
      402
    );
  }

  // Load current version files from R2
  const versionData = await c.env.FILES.get(
    `${id}/v${project.currentVersion}/files.json`
  );
  const currentVersion = versionData
    ? await versionData.json<Version>()
    : null;
  const existingFiles: ProjectFile[] = currentVersion?.files ?? [];

  // Load chat history from KV
  const now = new Date().toISOString();
  const chatSession =
    (await c.env.METADATA.get<ChatSession>(`chat:${id}`, "json")) ?? {
      projectId: id,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

  // Prepare trimmed history for context window management
  const historyMessages = prepareChatHistory(
    chatSession.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
  );

  // Build the current user message (text + optional images)
  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image"; image: string };

  const userMessageContent: ContentPart[] = [
    { type: "text", text: message },
  ];
  for (const img of images) {
    userMessageContent.push({
      type: "image",
      image: `data:${img.mediaType};base64,${img.base64}`,
    });
  }

  const systemPrompt = buildSystemPrompt(existingFiles);

  // ---------------------------------------------------------------------------
  // Create SSE stream with TransformStream
  // ---------------------------------------------------------------------------
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const writeSSE = async (data: object): Promise<void> => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // Run the AI call and post-processing in the background so the response
  // headers are returned immediately (required for SSE in Cloudflare Workers).
  const ctx = c.executionCtx;
  ctx.waitUntil(
    (async () => {
      try {
        const model = getModel(modelId, c.env);

        const result = streamText({
          model,
          system: systemPrompt,
          messages: [
            ...historyMessages,
            {
              role: "user",
              content: userMessageContent as never[],
            },
          ],
          maxOutputTokens: 16000,
        });

        // Stream tokens to the client
        let fullResponse = "";
        for await (const chunk of result.textStream) {
          fullResponse += chunk;
          await writeSSE({ type: "token", content: chunk });
        }

        // Parse files from the completed response
        const newFiles = parseFilesFromResponse(fullResponse);
        const mergedFiles =
          newFiles.length > 0
            ? mergeFiles(existingFiles, newFiles)
            : existingFiles;
        const changedFiles = newFiles.map((f) => f.path);
        const explanation = extractExplanation(fullResponse);

        // Save new version to R2
        const newVersionNumber = project.currentVersion + 1;
        const newVersion: Version = {
          versionNumber: newVersionNumber,
          prompt: message,
          model: modelId,
          files: mergedFiles,
          changedFiles,
          type: "ai",
          createdAt: new Date().toISOString(),
          fileCount: mergedFiles.length,
        };

        await c.env.FILES.put(
          `${id}/v${newVersionNumber}/files.json`,
          JSON.stringify(newVersion)
        );

        // Advance the project pointer and persist
        project.currentVersion = newVersionNumber;
        project.model = modelId;
        project.updatedAt = new Date().toISOString();
        await c.env.METADATA.put(`project:${id}`, JSON.stringify(project));

        // Build chat message records
        const msgNow = new Date().toISOString();
        const userMsgId = nanoid();
        const assistantMsgId = nanoid();

        const userChatMessage: ChatMessage = {
          id: userMsgId,
          role: "user",
          content: message,
          timestamp: msgNow,
          images: images.length > 0 ? images : undefined,
        };

        const assistantChatMessage: ChatMessage = {
          id: assistantMsgId,
          role: "assistant",
          // Store the explanation (text only) for display; the full response
          // with <file> tags would be too noisy to show in the chat panel.
          content: explanation || fullResponse,
          timestamp: msgNow,
          versionNumber: newVersionNumber,
          model: modelId,
          changedFiles,
        };

        chatSession.messages.push(userChatMessage, assistantChatMessage);
        chatSession.updatedAt = msgNow;
        await c.env.METADATA.put(`chat:${id}`, JSON.stringify(chatSession));

        // Deduct credits after successful generation
        await deductCredits(userId, creditCost, c.env);

        // Signal completion to the client
        await writeSSE({
          type: "done",
          versionNumber: newVersionNumber,
          changedFiles,
          assistantMessageId: assistantMsgId,
          userMessageId: userMsgId,
        });
      } catch (err) {
        await writeSSE({ type: "error", error: String(err) });
      } finally {
        await writer.close();
      }
    })()
  );

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": c.env.FRONTEND_URL ?? "*",
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /:id/chat/save — Save manually edited files as a new version
// ---------------------------------------------------------------------------

chatRouter.patch("/:id/chat/save", async (c) => {
  const userId = c.get("userId");
  const { id } = c.req.param();

  const project = await c.env.METADATA.get<Project>(`project:${id}`, "json");
  if (!project || project.userId !== userId) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.json<{ files: ProjectFile[] }>();
  if (!body.files?.length) {
    return c.json({ error: "Files required" }, 400);
  }

  // Load current files and merge the edited ones on top
  const currentData = await c.env.FILES.get(
    `${id}/v${project.currentVersion}/files.json`
  );
  const currentVersion = currentData ? await currentData.json<Version>() : null;
  const existingFiles: ProjectFile[] = currentVersion?.files ?? [];
  const mergedFiles = mergeFiles(existingFiles, body.files);
  const changedFiles = body.files.map((f) => f.path);

  const newVersionNumber = project.currentVersion + 1;
  const newVersion: Version = {
    versionNumber: newVersionNumber,
    prompt: "Manual edit",
    model: "",
    files: mergedFiles,
    changedFiles,
    type: "manual",
    createdAt: new Date().toISOString(),
    fileCount: mergedFiles.length,
  };

  await c.env.FILES.put(
    `${id}/v${newVersionNumber}/files.json`,
    JSON.stringify(newVersion)
  );

  project.currentVersion = newVersionNumber;
  project.updatedAt = new Date().toISOString();
  await c.env.METADATA.put(`project:${id}`, JSON.stringify(project));

  return c.json({ versionNumber: newVersionNumber, success: true });
});
