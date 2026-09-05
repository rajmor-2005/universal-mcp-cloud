import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { createLogger } from '@umcp/logger';
import { NotFoundError, EventType } from '@umcp/shared';
import { generateToken, signWebhookPayload } from '@umcp/crypto';

@Injectable()
export class WebhookService {
  private readonly logger = createLogger('WebhookService');

  constructor(private readonly db: DatabaseService) {}

  async createEndpoint(workspaceId: string, url: string, events: EventType[]) {
    const secret = generateToken(32);
    const { createHmacSignature } = await import('@umcp/crypto');
    const secretHash = createHmacSignature(secret, 'webhook-secret-key');

    const endpoint = await this.db.webhookEndpoint.create({
      data: {
        workspaceId,
        url,
        secretHash,
        events: events as string[],
      },
    });

    // Return the secret only once
    return { ...endpoint, secret };
  }

  async listEndpoints(workspaceId: string) {
    return this.db.webhookEndpoint.findMany({
      where: { workspaceId },
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteEndpoint(endpointId: string) {
    await this.db.webhookEndpoint.delete({ where: { id: endpointId } });
  }

  async deliver(endpointId: string, eventType: string, payload: Record<string, unknown>) {
    const endpoint = await this.db.webhookEndpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint || !endpoint.isActive) return;

    const delivery = await this.db.webhookDelivery.create({
      data: {
        endpointId,
        eventType,
        payload: payload as any,
        status: 'PENDING',
      },
    });

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const body = JSON.stringify(payload);
      const signature = signWebhookPayload(body, endpoint.secretHash, timestamp);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-umcp-signature-256': signature,
          'x-umcp-timestamp': String(timestamp),
          'x-umcp-webhook-id': delivery.id,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      await this.db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'SUCCESS' : 'FAILED',
          statusCode: response.status,
          responseBody: await response.text().catch(() => null),
          attempts: 1,
          deliveredAt: response.ok ? new Date() : null,
        },
      });
    } catch (error) {
      await this.db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          attempts: 1,
          responseBody: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
