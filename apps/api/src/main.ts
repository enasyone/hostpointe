import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { fileURLToPath } from "node:url";
import { ConfigError, loadConfig } from "./config.js";

// Local development: load the root .env if there is one (variables already set in the environment win).
// This file is apps/api/dist/main.js, so the repository root is three levels up.
try {
  process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

async function bootstrap() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const app = await NestFactory.create(AppModule.register(config));
  await app.listen(config.port);
}
void bootstrap();
