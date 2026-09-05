import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '@umcp/shared';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgs: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization' })
  async create(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createOrganizationSchema)) body: any,
  ) {
    return this.orgs.create(userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for current user' })
  async list(@CurrentUser('id') userId: string) {
    return this.orgs.findByUser(userId);
  }

  @Get(':orgId')
  @ApiOperation({ summary: 'Get organization details' })
  async findById(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgs.findById(orgId, userId);
  }

  @Put(':orgId')
  @ApiOperation({ summary: 'Update organization' })
  async update(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: any,
  ) {
    return this.orgs.update(orgId, userId, body);
  }

  @Post(':orgId/members/invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a member to the organization' })
  async inviteMember(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: any,
  ) {
    return this.orgs.inviteMember(orgId, userId, body);
  }

  @Delete(':orgId/members/:memberUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.orgs.removeMember(orgId, userId, memberUserId);
  }

  @Put(':orgId/members/:memberUserId/role')
  @ApiOperation({ summary: 'Update a member\'s role' })
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: any,
  ) {
    await this.orgs.updateMemberRole(orgId, userId, memberUserId, body.role);
    return { message: 'Role updated' };
  }
}
