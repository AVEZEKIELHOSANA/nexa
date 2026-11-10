"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { MESSAGE_MAX } from "@/lib/messages";

/** Message box: Enter sends, Shift+Enter makes a new line. Shows the length limit. */
export function MessageComposer({ onSend, disabled }: { onSend: (body: string) => Promise<string | null>; disabled?: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const left = MESSAGE_MAX - value.length;

  async function send() {
    const body = value.trim();
    if (!body || busy || disabled) return;
    setBusy(true);
    setError("");
    const problem = await onSend(body);
    setBusy(false);
    if (problem) return setError(problem);
    setValue("");
    ref.current?.focus();
  }

  return (
    <div className="space-y-1.5 border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Write a message…"
          aria-label="Message"
          rows={2}
          maxLength={MESSAGE_MAX}
          disabled={disabled}
          className="min-h-12 resize-none"
        />
        <Button type="button" onClick={send} disabled={disabled || busy || !value.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span role="alert" className="text-destructive">
          {error}
        </span>
        <span className={left < 100 ? "text-amber-700 dark:text-amber-300" : undefined}>{left} left</span>
      </div>
    </div>
  );
}
