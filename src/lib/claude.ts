import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const defaultClaudeModel = "claude-sonnet-5-5";

export function createClaudeSession(key: string, signal: AbortSignal) {
  const client = new Anthropic({
    apiKey: key,
    baseURL: "https://api.anthropic.com",
    timeout: 90000,
    maxRetries: 0,
  });
  const model = process.env.ANTHROPIC_MODEL || defaultClaudeModel;
  const ensureActive = () => {
    if (signal.aborted) throw new Error("ABORTED");
  };
  return {
    async check() {
      ensureActive();
      const info = await client.models.retrieve(model, {}, { signal });
      ensureActive();
      return { connected: true, provider: "Anthropic", model: info.id };
    },
    async generate<T>(
      system: string,
      data: unknown,
      schema: z.ZodType<T>,
    ): Promise<T> {
      ensureActive();
      const response = await client.messages.create(
        {
          model,
          max_tokens: 16384,
          system,
          messages: [{ role: "user", content: JSON.stringify(data) }],
          output_config: { format: zodOutputFormat(schema) },
        },
        { signal },
      );
      ensureActive();
      if (response.stop_reason === "max_tokens")
        throw new Error("MODEL_OUTPUT_LIMIT");
      if (response.stop_reason === "refusal") throw new Error("MODEL_REFUSAL");
      if (response.stop_reason !== "end_turn")
        throw new Error("MODEL_INCOMPLETE");
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      return schema.parse(JSON.parse(text));
    },
  };
}
