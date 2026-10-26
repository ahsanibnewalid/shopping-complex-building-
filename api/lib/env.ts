import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

const sessionSecret = required("SESSION_SECRET") || (process.env.NODE_ENV === "production" ? "" : required("APP_SECRET"));
if (process.env.NODE_ENV === "production" && sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be at least 32 characters in production");
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  sessionSecret,
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  appBaseUrl: required("APP_BASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
};
