import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'whatschat-demo',
      timestamp: new Date().toISOString(),
    };
  }
}