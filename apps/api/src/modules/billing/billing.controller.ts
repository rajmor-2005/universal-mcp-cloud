import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCheckoutSchema, SubscriptionPlan } from '@umcp/shared';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available subscription plans' })
  async getPlans() {
    return this.billing.getPlans();
  }

  @Get('organizations/:orgId/subscription')
  @ApiOperation({ summary: 'Get current subscription and usage' })
  async getSubscription(@Param('orgId') orgId: string) {
    return this.billing.getSubscription(orgId);
  }

  @Get('organizations/:orgId/usage')
  @ApiOperation({ summary: 'Get current usage metrics' })
  async getUsage(@Param('orgId') orgId: string) {
    return this.billing.getUsage(orgId);
  }

  @Post('organizations/:orgId/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a checkout session to upgrade' })
  async createCheckout(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createCheckoutSchema)) body: any,
  ) {
    return this.billing.createCheckoutSession(
      orgId, userId, body.plan, body.successUrl, body.cancelUrl,
    );
  }

  @Post('organizations/:orgId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancel(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.billing.cancelSubscription(orgId, userId);
  }
}
