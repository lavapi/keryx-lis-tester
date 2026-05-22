export interface AppConfig {
  port: number;
  host: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  defaultScenarioId: string;
}

const DEFAULT_PORT = 8088;
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_LOG_LEVEL = "info";
const DEFAULT_SCENARIO_ID = "civic-us";

const ALLOWED_LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

type LogLevel = (typeof ALLOWED_LOG_LEVELS)[number];

const parsePort = (raw: string | undefined): number => {
  if (!raw) return DEFAULT_PORT;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }
  return parsed;
};

const parseLogLevel = (raw: string | undefined): LogLevel => {
  if (!raw) return DEFAULT_LOG_LEVEL;
  if ((ALLOWED_LOG_LEVELS as readonly string[]).includes(raw)) {
    return raw as LogLevel;
  }
  throw new Error(`Invalid LOG_LEVEL value: ${raw}`);
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  port: parsePort(env.PORT),
  host: env.HOST ?? DEFAULT_HOST,
  logLevel: parseLogLevel(env.LOG_LEVEL),
  defaultScenarioId: env.DEFAULT_SCENARIO ?? DEFAULT_SCENARIO_ID,
});
