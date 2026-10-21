import "server-only";

type ServerEnvKey = "UNSPLASH_ACCESS_KEY" | "GEMINI_API_KEY";

export function getServerEnv(key: ServerEnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Outside production, a missing key switches that service to bundled demo data
 * so the UI can be developed without credentials. Production always requires keys.
 */
export function isDemoMode(key: ServerEnvKey): boolean {
  return !process.env[key] && process.env.NODE_ENV !== "production";
}
