import type { AccessLevel } from "@/lib/auth";
import { PLATFORM_TIMEZONE } from "@/lib/format";

/** One row of the notifications table, as the UI uses it. Safe to import from client and server code. */
export type AppNotification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationView = {
  title: string;
  detail?: string;
  /** where clicking the notification goes; null = nowhere */
  href: string | null;
  tone: "info" | "good" | "bad";
};

const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);

/**
 * One place that turns a notification row into a sentence and a destination. The database writes the
 * facts (names, ids, reasons) into `payload`, so the bell never has to join other tables.
 * Types written by the database: new_request, request_accepted, request_declined, session_cancelled,
 * verification_result (Day 7), new_message, report_resolved (Day 8), peer_request, peer_connected (Day 9), session_reminder (Day 10).
 */
export function describeNotification(n: Pick<AppNotification, "type" | "payload">, level: AccessLevel): NotificationView {
  const p = n.payload;
  const requestId = str(p.request_id);
  const home = level === "professional" ? "/pro" : "/student";

  switch (n.type) {
    case "new_request":
      return { title: `${str(p.student_name) ?? "A student"} requested a session`, detail: "Review it and accept or decline.", href: "/pro/requests", tone: "info" };

    case "request_accepted":
      return {
        title: `${str(p.professional_name) ?? "A professional"} accepted your request`,
        detail: "Your session is booked. Say hello in the conversation.",
        href: requestId ? `/student/requests/${requestId}` : "/student/requests",
        tone: "good",
      };

    case "request_declined":
      return {
        title: `${str(p.professional_name) ?? "A professional"} could not accept your request`,
        detail: str(p.reason),
        href: requestId ? `/student/requests/${requestId}` : "/student/requests",
        tone: "bad",
      };

    case "session_cancelled": {
      const by = str(p.cancelled_by);
      const withdrawn = p.was_pending === true;
      const other = level === "professional" ? str(p.student_name) ?? "The student" : str(p.professional_name) ?? "The professional";
      const title = withdrawn
        ? `${other} withdrew their request`
        : by === "admin"
          ? `A session with ${other} was cancelled by an administrator`
          : `${other} cancelled your session`;
      return { title, detail: str(p.reason), href: level === "professional" ? "/pro/sessions" : requestId ? `/student/requests/${requestId}` : "/student/requests", tone: "bad" };
    }

    case "verification_result":
      return p.status === "verified"
        ? { title: "Your professional account was verified", detail: "Students can now find you. Add your availability.", href: "/pro/availability", tone: "good" }
        : { title: "Your application was not approved", detail: str(p.reason), href: "/pro/settings", tone: "bad" };

    case "new_message":
      return { title: `New message from ${str(p.sender_name) ?? "someone"}`, detail: str(p.preview), href: requestId ? `/messages/${requestId}` : "/messages", tone: "info" };

    case "report_resolved":
      return { title: "An administrator reviewed your report", detail: "Thank you for helping keep Nexa safe.", href: null, tone: "good" };

    case "peer_request":
      return { title: `${str(p.name) ?? "A student"} wants to connect with you`, detail: "Accept or decline in your connections.", href: "/student/peers/connections?tab=received", tone: "info" };

    case "peer_connected":
      return { title: `${str(p.name) ?? "A student"} accepted your request`, detail: "You are now connected.", href: "/student/peers/connections?tab=connected", tone: "good" };

    case "session_reminder": {
      const other = level === "professional" ? str(p.student_name) ?? "the student" : str(p.professional_name) ?? "your mentor";
      return { title: `Reminder: your session with ${other} is coming up`, detail: str(p.start_time) ? `Starts ${new Intl.DateTimeFormat("en-GB", { timeZone: PLATFORM_TIMEZONE, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(str(p.start_time)!))}.` : undefined, href: level === "professional" ? "/pro/sessions" : requestId ? `/student/requests/${requestId}` : "/student/sessions", tone: "info" };
    }

    default:
      return { title: "You have a new notification", href: home, tone: "info" };
  }
}
