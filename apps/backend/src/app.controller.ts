import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Lightweight keep-alive for Render (and similar) free-tier spin-down.
   * Intentionally does not touch Mongo/Redis so a cron ping stays cheap and fast.
   * Mounted at GET /health (excluded from the /api/v1 prefix).
   */
  @Public()
  @Get('health')
  health() {
    return this.appService.getHealth();
  }
}
