"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types/chat";
import { GenerationProgress } from "./generation-progress";
import { getModelById } from "@/lib/models";
import { cn } from "@/lib/utils";
import { FileCode, Bot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function MessageBubble({
  message,
  isStreaming = false,
  streamingContent = "",
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const model = message.model ? getModelById(message.model) : null;
  const timeAgo = formatDistanceToNow(new Date(message.timestamp), {
    addSuffix: true,
  });

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%]">
          {/* Image attachments */}
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap justify-end mb-2">
              {message.images.map((img, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={i}
                  src={`data:${img.mediaType};base64,${img.base64}`}
                  alt={img.name || `Image ${i + 1}`}
                  className="h-20 w-20 rounded-lg object-cover border border-border"
                />
              ))}
            </div>
          )}
          {/* Message bubble */}
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground text-sm leading-relaxed">
            {message.content}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {timeAgo}
          </p>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    const content = isStreaming ? streamingContent : message.content;
    const showProgress = isStreaming || (message.changedFiles && message.changedFiles.length > 0);

    // Extract explanation: text before/after file blocks
    const explanationText = content
      .replace(/<file\s+path="[^"]+">[\s\S]*?<\/file>/g, "")
      .trim();

    return (
      <div className="flex gap-2.5 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Model badge */}
          {model && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-medium text-foreground">
                {model.name}
              </span>
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            </div>
          )}

          {/* Generation progress */}
          {showProgress && (
            <div className="mb-3">
              <GenerationProgress
                content={content}
                isStreaming={isStreaming}
                changedFiles={message.changedFiles}
              />
            </div>
          )}

          {/* Explanation text rendered as Markdown */}
          {explanationText && (
            <div
              className={cn(
                "prose prose-sm dark:prose-invert max-w-none",
                "prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground",
                "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-foreground",
                "prose-pre:bg-muted prose-pre:rounded-lg prose-pre:text-xs",
                "prose-headings:text-foreground prose-headings:font-semibold",
                "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
                "prose-strong:text-foreground",
                "prose-ul:text-foreground prose-ol:text-foreground",
                "prose-li:marker:text-muted-foreground"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {explanationText}
              </ReactMarkdown>
            </div>
          )}

          {/* Version badge */}
          {message.versionNumber !== undefined && !isStreaming && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileCode className="h-3 w-3" />
              <span>Saved as v{message.versionNumber}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
