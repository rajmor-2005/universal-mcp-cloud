import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboard() {
    return this.admin.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.admin.listUsers(page, pageSize);
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'List feature flags' })
  async listFeatureFlags() {
    return this.admin.listFeatureFlags();
  }

  @Put('feature-flags/:key')
  @ApiOperation({ summary: 'Update a feature flag' })
  async updateFeatureFlag(
    @Param('key') key: string,
    @Body() body: { isEnabled?: boolean; rolloutPercentage?: number },
  ) {
    return this.admin.updateFeatureFlag(key, body);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements' })
  async listAnnouncements() {
    return this.admin.listAnnouncements();
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create an announcement' })
  async createAnnouncement(@Body() body: any) {
    return this.admin.createAnnouncement(body);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get recent platform events' })
  async getEvents(@Query('limit') limit?: number) {
    return this.admin.getRecentEvents(limit);
  }
}
