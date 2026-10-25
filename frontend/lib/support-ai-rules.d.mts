export type SupportMessage = { role: "user" | "assistant"; content: string };

export function containsHealthQuestion(messages: ReadonlyArray<SupportMessage>): boolean;
export function containsContactInfo(messages: ReadonlyArray<SupportMessage>): boolean;
export function getResponseText(payload: unknown): string;
