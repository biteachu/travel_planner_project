import OpenAI from "openai";
import { z } from "zod";

export function createChatGPTSession(
  token: string,
  model: string,
  signal: AbortSignal,
) {
  const client = new OpenAI({
    apiKey: token,
    baseURL: "https://api.openai.com/v1",
    maxRetries: 0,
    timeout: 90000,
  });
  return {
    async check() {
      return { connected: true, provider: "ChatGPT", model };
    },
    async generate<T>(
      system: string,
      data: unknown,
      schema: z.ZodType<T>,
    ): Promise<T> {
      signal.throwIfAborted();
      // Local Zod validation remains authoritative. Schema is supplied as text to
      // support the account's selectable models without assuming strict-output support.
      const stream = await client.responses.create(
        {
          model,
          store: false,
          stream: true,
          instructions:
            system +
            "\nReturn only one JSON object matching this JSON Schema, without markdown fences:\n" +
            JSON.stringify(z.toJSONSchema(schema, { unrepresentable: "any" })),
          input: [{ role: "user", content: JSON.stringify(data) }],
        },
        { signal },
      );
      let text = "";
      let completed = false;
      for await (const event of stream) {
        signal.throwIfAborted();
        if (event.type === "response.output_text.delta") {
          text += event.delta;
          if (text.length > 500000) {
            stream.controller.abort();
            throw new Error("MODEL_OUTPUT_LIMIT");
          }
        }
        if (event.type === "response.failed")
          throw new Error(
            String(event.response.error?.code) ===
              "subscription_sharing_usage_limit_exceeded"
              ? "CHATGPT_LIMIT"
              : "CHATGPT_FAILED",
          );
        if (event.type === "response.incomplete" || event.type === "error")
          throw new Error("MODEL_INCOMPLETE");
        if (event.type === "response.completed") completed = true;
      }
      signal.throwIfAborted();
      if (!completed) throw new Error("MODEL_INCOMPLETE");
      return schema.parse(JSON.parse(text));
    },
  };
}
