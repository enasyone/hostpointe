// DEMO ONLY. Added to the app only when DEMO_SIGNIN=enabled and APP_ENV is development or test (see config.ts).
import { BadRequestException, Body, CanActivate, Controller, ExecutionContext, Get, Injectable, Module, Post, UnauthorizedException, UseGuards, type DynamicModule } from "@nestjs/common";
import { DEMO_USERS, issueToken, verifyToken, type DemoSession } from "./demo-session.js";

const SESSION_SECONDS = 8 * 60 * 60;

@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(private readonly secret: string) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; demoSession?: DemoSession }>();
    const header = req.headers.authorization ?? "";
    const session = header.startsWith("Bearer ") ? verifyToken(header.slice(7), this.secret) : null;
    if (!session) throw new UnauthorizedException();
    req.demoSession = session;
    return true;
  }
}

export function createDemoModule(secret: string): DynamicModule {
  const guard = new DemoAuthGuard(secret);

  @Controller("demo")
  class DemoController {
    /** DEMO sign-in: pick one of the seeded fake organisers. No password. Development only. */
    @Post("sign-in")
    signIn(@Body() body: { user?: string }) {
      const user = body?.user && Object.hasOwn(DEMO_USERS, body.user) ? DEMO_USERS[body.user] : undefined;
      if (!user) throw new BadRequestException(`user must be one of: ${Object.keys(DEMO_USERS).join(", ")}`);
      const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
      return { demo: true, label: user.label, token: issueToken({ userId: user.userId, tenantId: user.tenantId, exp }, secret) };
    }

    @Get("me")
    @UseGuards(guard)
    me() {
      return { demo: true };
    }
  }

  return { module: DemoModule, controllers: [DemoController] };
}

@Module({})
export class DemoModule {}
