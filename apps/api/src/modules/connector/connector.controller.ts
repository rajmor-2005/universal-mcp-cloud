import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConnectorService } from './connector.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { connectConnectorSchema } from '@umcp/shared';

@ApiTags('connectors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('connectors')
export class ConnectorController {
  constructor(private readonly connectors: ConnectorService) {}

  @Get('marketplace')
  @ApiOperation({ summary: 'Browse connector marketplace' })
  async listDefinitions(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.connectors.listDefinitions({ category, search });
  }

  @Get('marketplace/slug/:slug')
  @ApiOperation({ summary: 'Get connector definition details by slug' })
  async getDefinitionBySlug(@Param('slug') slug: string) {
    return this.connectors.getDefinitionBySlug(slug);
  }

  @Get('marketplace/:definitionId')
  @ApiOperation({ summary: 'Get connector definition details' })
  async getDefinition(@Param('definitionId') definitionId: string) {
    return this.connectors.getDefinition(definitionId);
  }

  @Get('workspace/:workspaceId')
  @ApiOperation({ summary: 'List connected apps for a workspace' })
  async getWorkspaceConnectors(@Param('workspaceId') workspaceId: string) {
    return this.connectors.getWorkspaceConnectors(workspaceId);
  }

  @Get('workspace/:workspaceId/tools')
  @ApiOperation({ summary: 'List all available tools for a workspace' })
  async getWorkspaceTools(@Param('workspaceId') workspaceId: string) {
    return this.connectors.getToolsForWorkspace(workspaceId);
  }

  @Post('workspace/:workspaceId/connect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Connect an app to the workspace' })
  async connectApp(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(connectConnectorSchema)) body: any,
  ) {
    return this.connectors.connectApp(workspaceId, userId, body);
  }

  @Post('workspace/:workspaceId/auto-import')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Auto-generate MCP tools from API URL or OpenAPI spec' })
  async autoImportApi(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { url?: string; rawSpec?: Record<string, any>; apiKey?: string; bearerToken?: string; name?: string },
  ) {
    return this.connectors.autoImportApi(workspaceId, userId, body);
  }

  @Patch('instance/:instanceId/toggle')
  @ApiOperation({ summary: 'Enable or disable a connected app' })
  async toggleApp(
    @Param('instanceId') instanceId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { isEnabled: boolean },
  ) {
    return this.connectors.toggleApp(instanceId, body.isEnabled, userId);
  }

  @Post('instance/:instanceId/reconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reconnect or update credentials for a connected app' })
  async reconnectApp(
    @Param('instanceId') instanceId: string,
    @CurrentUser('id') userId: string,
    @Body() body: { credentials?: Record<string, string> },
  ) {
    return this.connectors.reconnectApp(instanceId, userId, body.credentials);
  }

  @Get('instance/:instanceId/health')
  @ApiOperation({ summary: 'Run real-time health diagnostic for a connected app' })
  async checkHealth(@Param('instanceId') instanceId: string) {
    return this.connectors.checkHealth(instanceId);
  }

  @Delete('instance/:instanceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an app' })
  async disconnectApp(
    @Param('instanceId') instanceId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.connectors.disconnectApp(instanceId, userId);
  }
}
