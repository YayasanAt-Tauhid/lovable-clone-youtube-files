"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ImageAttachment } from "@/types/chat";
import { MessageBubble } from "./message-bubble";
import { ChatInput } from "./chat-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  streamingContent: string;
  onSendMessage: (message: string, images: ImageAttachment[]) => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  projectId: string;
  credits?: { remaining: number; total: number } | null;
}

export function ChatPanel({
  messages,
  isGenerating,
  streamingContent,
  onSendMessage,
  selectedModel,
  onModelChange,
  credits,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, streamingContent]);

  const visibleMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollAreaRef}>
        <div className="p-4">
          {visibleMessages.length === 0 && !isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Start building
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Describe what you want to create or change. The AI will generate
                React code and show it in the preview.
              </p>
            </div>
          ) : (
            <>
              {visibleMessages.map((message, index) => {
                // Check if this is the last assistant message and we're streaming
                const isLastAssistant =
                  message.role === "assistant" &&
                  index === visibleMessages.length - 1 &&
                  isGenerating;

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStreaming={isLastAssistant}
                    streamingContent={isLastAssistant ? streamingContent : ""}
                  />
                );
              })}

              {/* Show streaming message if generating and no assistant message yet */}
              {isGenerating &&
                (visibleMessages.length === 0 ||
                  visibleMessages[visibleMessages.length - 1].role === "user") && (
                  <MessageBubble
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      timestamp: new Date().toISOString(),
                    }}
                    isStreaming={true}
                    streamingContent={streamingContent}
                  />
                )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInput
          onSend={onSendMessage}
          isGenerating={isGenerating}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          credits={credits}
        />
      </div>
    </div>
  );
}
