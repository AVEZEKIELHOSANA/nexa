/** A chat message as the UI uses it. Safe to import from client and server code. */
export type Message = {
  id: string;
  requestId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export const MESSAGE_MAX = 2000;
