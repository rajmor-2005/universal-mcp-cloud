import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { ToolExecutionService } from './tool-execution.service';
import { ConnectorModule } from '../connector/connector.module';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [ConnectorModule, VaultModule],
  controllers: [McpController],
  providers: [McpService, ToolExecutionService],
  exports: [McpService],
})
export class McpModule {}
