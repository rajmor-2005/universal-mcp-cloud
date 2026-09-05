import { Controller, Get, Post, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWebhookEndpointSchema } from '@umcp/shared';

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/webhooks')
export class WebhookController {
  constructor(private readonly webhooks: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body(new ZodValidationPipe(createWebhookEndpointSchema)) body: any,
  ) {
    return this.webhooks.createEndpoint(workspaceId, body.url, body.events);
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints' })
  async list(@Param('workspaceId') workspaceId: string) {
    return this.webhooks.listEndpoints(workspaceId);
  }

  @Delete(':endpointId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  async delete(@Param('endpointId') endpointId: string) {
    await this.webhooks.deleteEndpoint(endpointId);
  }
}
