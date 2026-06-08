import crypto from "crypto";

export const MESSAGE_BODY_MAX = 4000;
export const MESSAGE_SUBJECT_MAX = 140;

export function newThreadToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function trekkerThreadUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/messages/${token}`;
}

export function ownerThreadUrl(threadId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/owner/messages/${threadId}`;
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
