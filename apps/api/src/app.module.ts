import { Controller, Get, Module, type DynamicModule } from "@nestjs/common";
import type { Config } from "./config.js";
import { createDemoModule } from "./demo/demo.module.js";

@Controller("health")
class HealthController {
  @Get()
  health() {
    return { status: "ok" };
  }
}

@Module({})
export class AppModule {
  static register(config: Config): DynamicModule {
    return {
      module: AppModule,
      controllers: [HealthController],
      // DEMO sign-in exists only when explicitly enabled, and loadConfig refuses that in production.
      imports: config.demoSignIn.enabled ? [createDemoModule(config.demoSignIn.secret)] : [],
    };
  }
}
