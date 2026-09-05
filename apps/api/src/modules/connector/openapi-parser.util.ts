import { slugify, namespaceTool } from '@umcp/shared';

export interface ParsedMcpTool {
  name: string;
  namespacedName: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  inputSchema: Record<string, unknown>;
  category: string;
}

export interface ParsedOpenApiResult {
  title: string;
  slug: string;
  description: string;
  baseUrl: string;
  tools: ParsedMcpTool[];
}

/**
 * Parse an OpenAPI 3.x or Swagger 2.0 specification object into MCP Tool Definitions.
 */
export function parseOpenApiSpec(
  spec: Record<string, any>,
  fallbackBaseUrl?: string,
): ParsedOpenApiResult {
  const title = spec.info?.title || 'Custom API';
  const slug = slugify(title) || 'custom-api';
  const description = spec.info?.description || `Auto-generated MCP integration for ${title}`;

  // Extract base URL
  let baseUrl = fallbackBaseUrl || '';
  if (spec.servers && Array.isArray(spec.servers) && spec.servers.length > 0) {
    baseUrl = spec.servers[0].url || baseUrl;
  } else if (spec.host) {
    const scheme = spec.schemes && spec.schemes[0] ? spec.schemes[0] : 'https';
    const basePath = spec.basePath || '';
    baseUrl = `${scheme}://${spec.host}${basePath}`;
  }

  const tools: ParsedMcpTool[] = [];
  const paths = spec.paths || {};

  for (const [pathKey, pathObj] of Object.entries<Record<string, any>>(paths)) {
    if (!pathObj || typeof pathObj !== 'object') continue;

    const methods: Array<'get' | 'post' | 'put' | 'delete' | 'patch'> = [
      'get',
      'post',
      'put',
      'delete',
      'patch',
    ];

    for (const method of methods) {
      const op = (pathObj as Record<string, any>)[method];
      if (!op || typeof op !== 'object') continue;

      const rawName =
        op.operationId ||
        `${method}_${pathKey.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')}`;
      const toolName = slugify(rawName).replace(/-/g, '_');
      const namespacedName = namespaceTool(slug, toolName);
      const toolDescription =
        op.summary || op.description || `${method.toUpperCase()} ${pathKey}`;

      const properties: Record<string, any> = {};
      const required: string[] = [];

      // Parse parameters (path & query)
      const parameters = [...(pathObj.parameters || []), ...(op.parameters || [])];
      for (const param of parameters) {
        if (!param || !param.name) continue;
        const pName = param.name;
        const pDesc = param.description || `Parameter ${pName} (${param.in})`;
        const pType = param.schema?.type || param.type || 'string';

        properties[pName] = {
          type: pType === 'integer' ? 'number' : pType,
          description: pDesc,
        };

        if (param.required) {
          required.push(pName);
        }
      }

      // Parse requestBody (OpenAPI 3.x)
      if (op.requestBody?.content) {
        const jsonContent =
          op.requestBody.content['application/json'] ||
          Object.values(op.requestBody.content)[0];
        const bodySchema = (jsonContent as any)?.schema;

        if (bodySchema && bodySchema.properties) {
          for (const [propKey, propObj] of Object.entries<any>(bodySchema.properties)) {
            properties[propKey] = {
              type: propObj.type || 'string',
              description: propObj.description || propKey,
            };
            if (bodySchema.required?.includes(propKey)) {
              required.push(propKey);
            }
          }
        }
      }

      const inputSchema: Record<string, unknown> = {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required: Array.from(new Set(required)) } : {}),
      };

      tools.push({
        name: toolName,
        namespacedName,
        description: toolDescription,
        method: method.toUpperCase() as any,
        path: pathKey,
        inputSchema,
        category: op.tags?.[0] || 'custom',
      });
    }
  }

  return {
    title,
    slug,
    description,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    tools,
  };
}
