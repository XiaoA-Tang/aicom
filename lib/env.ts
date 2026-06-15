export function getServerEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalServerEnv(name: string, fallback: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}
