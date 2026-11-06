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
  if (appEnv === "production") {
    if (wantsDemo) {
      throw new ConfigError("Refusing to start: DEMO sign-in must not be enabled when APP_ENV=production.");
    }
    // Production runs on Azure (ADR-0006 covers the interim Neon pilot). Neon in production is refused.
    for (const name of ["DATABASE_URL", "MIGRATION_DATABASE_URL", "WORKER_DATABASE_URL"]) {
      if (/(^|[.@/])neon\.tech(\W|$)/i.test(env[name] ?? "")) {
        throw new ConfigError(`Refusing to start: ${name} points at Neon while APP_ENV=production.`);
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

  return { appEnv, port: Number(env.PORT ?? 4000), demoSignIn };
}
