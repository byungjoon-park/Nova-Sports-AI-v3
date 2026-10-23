export function containsHealthQuestion(messages) {
  return messages.some((message) => message.role === "user" && /(부상|다쳤|다치|통증|아프|부었|진단|질병|병원|약 처방|복용|수술|재활|골절|인대|염증)/i.test(message.content));
}

export function containsContactInfo(messages) {
  return messages.some((message) => message.role === "user" && (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(message.content) ||
    /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/.test(message.content)
  ));
}

export function getResponseText(payload) {
  if (!payload || typeof payload !== "object") return "";
  const data = payload;
  if (typeof data.output_text === "string") return data.output_text.trim();
  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => typeof part.text === "string" ? part.text : "")
    .join("\n")
    .trim();
}
