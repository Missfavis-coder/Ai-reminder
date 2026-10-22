
import "server-only";

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | undefined;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  client ??= new GoogleGenAI({ apiKey });

  return client;
}

export function getGeminiModel(): string {
  const model = process.env.GEMINI_MODEL;

  if (!model) {
    throw new Error("GEMINI_MODEL is not configured.");
  }

  return model;
}
