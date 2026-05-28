"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, ImagePlus, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ModelSelector } from "./model-selector";
import type { ImageAttachment } from "@/types/chat";

interface ChatInputProps {
  onSend: (message: string, images: ImageAttachment[]) => void;
  isGenerating: boolean;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  credits?: { remaining: number; total: number } | null;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isGenerating,
  selectedModel,
  onModelChange,
  credits,
  disabled,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || isGenerating || disabled) return;
    onSend(trimmed, images);
    setMessage("");
    setImages([]);
    textareaRef.current?.focus();
  }

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    const files: File[] = Array.from(fileList) as File[];
    const newImages: ImageAttachment[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      newImages.push({
        base64,
        mediaType: file.type,
        name: file.name,
      });
    }

    setImages((prev: ImageAttachment[]) => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImages((prev: ImageAttachment[]) => prev.filter((_: ImageAttachment, i: number) => i !== index));
  }

  return (
    <div className="border-t border-border bg-background p-3 space-y-2">
      {/* Image preview strip */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img: ImageAttachment, i: number) => (
            <div key={i} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${img.mediaType};base64,${img.base64}`}
                alt={img.name || `Image ${i + 1}`}
                className="h-14 w-14 rounded-md object-cover border border-border"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to build or change..."
        className="min-h-[80px] max-h-[200px] resize-none text-sm bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50"
        disabled={isGenerating || disabled}
      />

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: model + image */}
        <div className="flex items-center gap-2">
          <ModelSelector
            value={selectedModel}
            onChange={onModelChange}
            disabled={isGenerating || disabled}
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || disabled}
            title="Attach image"
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Right: credits + send */}
        <div className="flex items-center gap-2">
          {credits && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-yellow-500" />
              {credits.remaining}
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || isGenerating || disabled}
            className="h-7 gap-1.5 text-xs px-3"
          >
            <Send className="h-3 w-3" />
            {isGenerating ? "Generating..." : "Send"}
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-right">
        Ctrl+Enter to send
      </p>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
