export function requiredText(form: FormData, name: string, max = 12000) {
  const value = String(form.get(name) ?? "").trim();
  if (!value || value.length > max) throw new Error(`${name} is required and must be ${max} characters or fewer.`);
  return value;
}

export function assessmentInput(form: FormData, criteria: Array<{ id: string; maxScore: number }>) {
  const decision = String(form.get("decision") ?? "");
  if (!["ASSESSED", "NEEDS_REVISION"].includes(decision)) throw new Error("Choose a valid assessment decision.");
  const feedback = requiredText(form, "feedback", 4000);
  if (!criteria.length) throw new Error("A rubric must have at least one criterion.");
  const scores = criteria.map((criterion) => {
    const value = form.get(`criterion_${criterion.id}`);
    const score = Number(value);
    if (value === null || String(value).trim() === "" || !Number.isFinite(score) || score < 0 || score > criterion.maxScore) {
      throw new Error("Every rubric score must be within its allowed range.");
    }
    return score;
  });
  return { decision, feedback, scores };
}

export function evidenceSignature(bytes: Uint8Array, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n);
  const text = new TextDecoder().decode(bytes);
  if (mime === "image/webp") return text.startsWith("RIFF") && text.slice(8,12) === "WEBP";
  if (mime === "application/pdf") return text.startsWith("%PDF-");
  return false;
}

export type QuizDraft = { prompt: string; options: string[]; correctAnswer: string; explanation: string; skillId?: string };
export function parseQuizDraft(value: string): QuizDraft[] {
  let items: unknown;
  try { items = JSON.parse(value); } catch { throw new Error("Quiz questions must be valid JSON."); }
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new Error("Provide 1–20 quiz questions.");
  return items.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Invalid quiz question.");
    const q = item as Record<string, unknown>;
    if (typeof q.prompt !== "string" || !q.prompt.trim() || q.prompt.length > 1000 ||
      !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 ||
      q.options.some((o) => typeof o !== "string" || !o.trim() || o.length > 500) || new Set(q.options).size !== q.options.length ||
      typeof q.correctAnswer !== "string" || !q.options.includes(q.correctAnswer) ||
      typeof q.explanation !== "string" || !q.explanation.trim() || q.explanation.length > 2000) throw new Error("Each quiz question needs a prompt, distinct options, a matching answer and an explanation.");
    return { prompt: q.prompt.trim(), options: q.options as string[], correctAnswer: q.correctAnswer, explanation: q.explanation.trim(), ...(typeof q.skillId === "string" && q.skillId ? { skillId: q.skillId } : {}) };
  });
}
