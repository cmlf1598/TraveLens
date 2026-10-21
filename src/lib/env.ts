import "server-only";

type ServerEnvKey = "UNSPLASH_ACCESS_KEY" | "GEMINI_API_KEY";

export function getServerEnv(key: ServerEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
