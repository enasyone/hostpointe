// Start-up configuration and the safety checks that stop the app from starting in an unsafe setup.
// Pure function of the environment, so it can be tested without starting the server.

export type AppEnv = "development" | "test" | "staging" | "production";
const APP_ENVS: readonly AppEnv[] = ["development", "test", "staging", "production"];

export interface Config {
  appEnv: AppEnv;
  port: number;
  /** DEMO sign-in is development tooling only. It is never allowed in production. */
  demoSignIn: { enabled: false } | { enabled: true; secret: string };
}

export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Fail closed: a missing APP_ENV is an error, never a silent default to a permissive mode.
  const appEnv = env.APP_ENV as AppEnv | undefined;
  if (!appEnv || !APP_ENVS.includes(appEnv)) {
    throw new ConfigError(`APP_ENV must be one of ${APP_ENVS.join(", ")}.`);
  }

  const wantsDemo = env.DEMO_SIGNIN === "enabled";
  // DEMO sign-in is for development and test only. It is refused in staging and production.
  if (wantsDemo && appEnv !== "development" && appEnv !== "test") {
    throw new ConfigError(`Refusing to start: DEMO sign-in is only allowed when APP_ENV is development or test (APP_ENV=${appEnv}).`);
  }
  if (appEnv === "production") {
    // Production may only talk to databases named in ALLOWED_DB_HOSTS (comma-separated host names).
    // Fail closed: no list means no start. This keeps the shared dev database (Neon "dev" branch,
    // or any other host) from ever being used by a production API, whatever provider hosts production.
    const allowed = (env.ALLOWED_DB_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
    if (allowed.length === 0) {
      throw new ConfigError("Refusing to start: APP_ENV=production needs ALLOWED_DB_HOSTS (the database host names this environment may use).");
    }
    for (const name of ["DATABASE_URL", "MIGRATION_DATABASE_URL", "WORKER_DATABASE_URL"]) {
      const value = env[name];
      if (!value) continue;
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        throw new ConfigError(`Refusing to start: ${name} is not a valid URL.`);
      }
      // The pg driver lets ?host= or ?hostaddr= override the host in the URL, which would bypass this list.
      for (const key of parsed.searchParams.keys()) {
        if (["host", "hostaddr"].includes(key.toLowerCase())) {
          throw new ConfigError(`Refusing to start: ${name} must not carry a host or hostaddr query parameter.`);
        }
      }
      const host = parsed.hostname.toLowerCase();
      if (!allowed.includes(host)) {
        throw new ConfigError(`Refusing to start: ${name} uses a host that is not in ALLOWED_DB_HOSTS.`);
      }
    }
  }

  let demoSignIn: Config["demoSignIn"] = { enabled: false };
  if (wantsDemo) {
    const secret = env.DEMO_SESSION_SECRET ?? "";
    if (secret.length < 32) {
      throw new ConfigError("DEMO_SIGNIN=enabled needs DEMO_SESSION_SECRET of at least 32 characters.");
    }
    demoSignIn = { enabled: true, secret };
  }

  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError("PORT must be a whole number between 1 and 65535.");
  }
  return { appEnv, port, demoSignIn };
}
