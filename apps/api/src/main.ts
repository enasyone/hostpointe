import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ConfigError, loadConfig } from "./config.js";

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
