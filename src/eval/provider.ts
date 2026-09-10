import type { EvalProvider, ProviderOutput } from "./types.js";

/**
 * Provider adapters.
 *
 * `MockProvider` is deterministic and needs no network — used by the test
 * suite and the demo. The OpenAI-compatible and Anthropic adapters call real
 * APIs and read their keys from the environment; they are opt-in and never
 * exercised unless you construct them.
 */

export interface MockProviderOptions {
  latencyMs?: number;
  costUsd?: number;
  /** Extra phrases appended to the echoed prompt. */
  phrases?: string[];
  /** Tool names the mock "agent" invokes, in order. */
  toolCalls?: string[];
  /** Optional custom responder; overrides prompt echo + phrases. */
  respond?: (prompt: string) => string;
}

export class MockProvider implements EvalProvider {
  readonly name: string;
  readonly model: string;
  private readonly latencyMs: number;
  private readonly costUsd: number;
  private readonly phrases: string[];
  private readonly toolCalls: string[];
  private readonly respond?: (prompt: string) => string;

  constructor(name: string, model: string, opts: MockProviderOptions = {}) {
    this.name = name;
    this.model = model;
    this.latencyMs = opts.latencyMs ?? 500;
    this.costUsd = opts.costUsd ?? 0.001;
    this.phrases = opts.phrases ?? [];
    this.toolCalls = opts.toolCalls ?? [];
    this.respond = opts.respond;
  }

  async generate(prompt: string): Promise<ProviderOutput> {
    const text = this.respond
      ? this.respond(prompt)
      : [prompt, ...this.phrases].join(" ");
    return {
      text,
      latencyMs: this.latencyMs,
      costUsd: this.costUsd,
      toolCalls: [...this.toolCalls],
    };
  }
}

/** Pricing for a model, in USD per 1k tokens. */
export interface TokenPrice {
  inputPer1k: number;
  outputPer1k: number;
}

export interface OpenAIOptions {
  baseUrl?: string;
  apiKey?: string;
  /** Optional pricing; omitted yields costUsd 0 (no fabricated defaults). */
  price?: TokenPrice;
}

/**
 * Any OpenAI-compatible chat-completions endpoint (OpenAI itself, or a
 * compatible gateway). Requires OPENAI_API_KEY unless apiKey is passed.
 */
export class OpenAICompatibleProvider implements EvalProvider {
  readonly name: string;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly price?: TokenPrice;

  constructor(name: string, model: string, opts: OpenAIOptions = {}) {
    this.name = name;
    this.model = model;
    this.baseUrl = (opts.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    this.apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
    this.price = opts.price;
  }

  async generate(prompt: string): Promise<ProviderOutput> {
    if (!this.apiKey) {
      throw new Error(`${this.name}: OPENAI_API_KEY is not set`);
    }
    const started = Date.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      throw new Error(`${this.name}: HTTP ${res.status}: ${await res.text()}`);
    }
    // fetch().json() is typed unknown; cast once and access defensively.
    const data = (await res.json()) as any;
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const inTokens: number = data?.usage?.prompt_tokens ?? 0;
    const outTokens: number = data?.usage?.completion_tokens ?? 0;
    const costUsd = this.price
      ? (inTokens * this.price.inputPer1k + outTokens * this.price.outputPer1k) / 1000
      : 0;
    return { text, latencyMs, costUsd, toolCalls: [], inputTokens: inTokens, outputTokens: outTokens };
  }
}

export interface AnthropicOptions {
  apiKey?: string;
  price?: TokenPrice;
}

/** Anthropic Messages API adapter. Requires ANTHROPIC_API_KEY unless passed. */
export class AnthropicProvider implements EvalProvider {
  readonly name: string;
  readonly model: string;
  private readonly apiKey?: string;
  private readonly price?: TokenPrice;

  constructor(name: string, model: string, opts: AnthropicOptions = {}) {
    this.name = name;
    this.model = model;
    this.apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.price = opts.price;
  }

  async generate(prompt: string): Promise<ProviderOutput> {
    if (!this.apiKey) {
      throw new Error(`${this.name}: ANTHROPIC_API_KEY is not set`);
    }
    const started = Date.now();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      throw new Error(`${this.name}: HTTP ${res.status}: ${await res.text()}`);
    }
    // fetch().json() is typed unknown; cast once and access defensively.
    const data = (await res.json()) as any;
    const text: string =
      typeof data?.content?.[0]?.text === "string" ? data.content[0].text : "";
    const inTokens: number = data?.usage?.input_tokens ?? 0;
    const outTokens: number = data?.usage?.output_tokens ?? 0;
    const costUsd = this.price
      ? (inTokens * this.price.inputPer1k + outTokens * this.price.outputPer1k) / 1000
      : 0;
    return { text, latencyMs, costUsd, toolCalls: [], inputTokens: inTokens, outputTokens: outTokens };
  }
}
