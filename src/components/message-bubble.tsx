import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import type { Message } from "@/lib/messages";
import { ReportConcernButton } from "@/components/report-concern-dialog";

/** One chat message. Mine on the right, theirs on the left (with a report flag). */
export function MessageBubble({ message, mine, senderName, showStatus }: { message: Message; mine: boolean; senderName: string; showStatus: boolean }) {
  return (
    <div className={cn("group flex flex-col gap-0.5", mine ? "items-end" : "items-start")}>
      <div className={cn("flex items-end gap-1", mine && "flex-row-reverse")}>
        <p className={cn("max-w-[min(85vw,28rem)] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>{message.body}</p>
        {!mine && (
          <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <ReportConcernButton variant="icon" targetType="message" targetId={message.id} targetLabel={`this message from ${senderName}`} />
          </span>
        )}
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        {formatTime(message.createdAt)}
        {mine && showStatus && <> · {message.readAt ? "Seen" : "Sent"}</>}
      </p>
    </div>
  );
}
