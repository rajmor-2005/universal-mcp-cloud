import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWorkspaceSchema, updateWorkspaceSchema, createApiKeySchema } from '@umcp/shared';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/workspaces')
export class WorkspaceController {
  constructor(private readonly workspaces: WorkspaceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workspace' })
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: any,
  ) {
    return this.workspaces.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces in organization' })
  async list(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaces.findByOrg(orgId, userId);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Get workspace details' })
  async findById(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workspaces.findById(workspaceId, userId);
  }

  @Put(':workspaceId')
  @ApiOperation({ summary: 'Update workspace' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: any,
  ) {
    return this.workspaces.update(workspaceId, userId, body);
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete workspace (soft)' })
  async delete(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.workspaces.delete(workspaceId, userId);
  }

  // ─── API Keys ─────────────────────────────────────

  @Post(':workspaceId/api-keys')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an API key for the workspace' })
  async createApiKey(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createApiKeySchema)) body: any,
  ) {
    return this.workspaces.createApiKey(workspaceId, userId, body.name, body.expiresAt);
  }

  @Get(':workspaceId/api-keys')
  @ApiOperation({ summary: 'List API keys for the workspace' })
  async listApiKeys(@Param('workspaceId') workspaceId: string) {
    return this.workspaces.listApiKeys(workspaceId);
  }

  @Delete(':workspaceId/api-keys/:apiKeyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revokeApiKey(
    @Param('apiKeyId') apiKeyId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.workspaces.revokeApiKey(apiKeyId, userId);
  }

  // ─── Execution Logs ───────────────────────────────

  @Get(':workspaceId/logs')
  @ApiOperation({ summary: 'Get workspace execution logs' })
  async getLogs(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.workspaces.getLogs(workspaceId, userId, limit ? Number(limit) : 50);
  }
}

