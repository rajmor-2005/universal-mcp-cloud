/**
 * Database seed script — populates initial data for development.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Connector Definitions (25+ Enterprise Integrations) ───

  const connectors = [
    {
      name: 'GitHub',
      slug: 'github',
      description: 'Connect to GitHub to manage repositories, issues, pull requests, and CI workflows.',
      iconUrl: 'https://cdn.simpleicons.org/github/white',
      category: 'DEVELOPER_TOOLS',
      authType: 'OAUTH2',
      version: '1.2.0',
      isOfficial: true,
      oauthConfig: {
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'read:org', 'read:user', 'user:email'],
      },
      metadata: {
        documentationUrl: 'https://docs.github.com/en/rest',
        setupGuide: [
          'Go to GitHub Settings -> Developer Settings -> Personal Access Tokens -> Tokens (classic).',
          'Click "Generate new token (classic)" and set a descriptive note.',
          'Select the required scopes: `repo`, `read:org`, `read:user`.',
          'Copy your generated Personal Access Token (`ghp_...`).',
          'Paste the token into the Bearer Token field in Universal MCP Cloud.',
        ],
        actions: [
          { name: 'create_issue', displayName: 'Create Issue', description: 'Create a new issue in a repository' },
          { name: 'create_pull_request', displayName: 'Create PR', description: 'Open a new pull request' },
          { name: 'list_repositories', displayName: 'List Repositories', description: 'Fetch all user or org repositories' },
        ],
        triggers: [
          { name: 'push', displayName: 'Push Event', description: 'Triggered when code is pushed', type: 'WEBHOOK' },
          { name: 'issues', displayName: 'Issue Opened', description: 'Triggered on new issue creation', type: 'WEBHOOK' },
        ],
      },
    },
    {
      name: 'Slack',
      slug: 'slack',
      description: 'Connect to Slack to send messages, manage channels, and interact with your team.',
      iconUrl: 'https://cdn.simpleicons.org/slack',
      category: 'COMMUNICATION',
      authType: 'OAUTH2',
      version: '1.1.0',
      isOfficial: true,
      oauthConfig: {
        authorizationUrl: 'https://slack.com/oauth/v2/authorize',
        tokenUrl: 'https://slack.com/api/oauth.v2.access',
        scopes: ['chat:write', 'channels:read', 'channels:manage', 'users:read'],
      },
      metadata: {
        documentationUrl: 'https://api.slack.com/messaging',
        setupGuide: [
          'Go to Slack API Portal (api.slack.com/apps) and click "Create New App" -> "From Scratch".',
          'Navigate to "OAuth & Permissions" in the sidebar.',
          'Add Bot Token Scopes: `chat:write`, `channels:read`, `channels:manage`, `users:read`.',
          'Click "Install to Workspace" at the top of the page.',
          'Copy the "Bot User OAuth Token" (`xoxb-...`) and paste it into Bearer Token below.',
        ],
        actions: [
          { name: 'send_message', displayName: 'Send Channel Message', description: 'Post text or blocks to a channel' },
          { name: 'create_channel', displayName: 'Create Channel', description: 'Create public or private channel' },
        ],
        triggers: [
          { name: 'app_mention', displayName: 'App Mentioned', description: 'Triggered when bot is tagged', type: 'WEBHOOK' },
        ],
      },
    },
    {
      name: 'Notion',
      slug: 'notion',
      description: 'Connect to Notion to create and manage pages, databases, and workspace blocks.',
      iconUrl: 'https://cdn.simpleicons.org/notion/white',
      category: 'PRODUCTIVITY',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      oauthConfig: {
        authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
        tokenUrl: 'https://api.notion.com/v1/oauth/token',
        scopes: [],
      },
      metadata: {
        documentationUrl: 'https://developers.notion.com',
        setupGuide: [
          'Go to Notion Developers Portal (notion.so/my-integrations) and click "+ New integration".',
          'Select your target Notion workspace and set capabilities to Read, Update, and Insert content.',
          'Save your integration and copy the "Internal Integration Secret" (`secret_...`).',
          'Share your target Notion pages/databases with your integration via the "..." menu in Notion.',
          'Paste your secret into the Bearer Token field below.',
        ],
        actions: [
          { name: 'create_page', displayName: 'Create Page', description: 'Create a new Notion page' },
          { name: 'query_database', displayName: 'Query Database', description: 'Filter and fetch database records' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Stripe',
      slug: 'stripe',
      description: 'Connect to Stripe to manage payments, customers, subscriptions, and invoices.',
      iconUrl: 'https://cdn.simpleicons.org/stripe',
      category: 'PAYMENTS',
      authType: 'API_KEY',
      version: '2.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://stripe.com/docs/api',
        setupGuide: [
          'Log in to Stripe Dashboard (dashboard.stripe.com) and navigate to Developers -> API keys.',
          'Under Standard keys, click "Reveal secret key" or create a restricted API key.',
          'Copy your secret API key (`sk_live_...` or `sk_test_...`).',
          'Paste your secret key into the API Key field below.',
        ],
        actions: [
          { name: 'create_customer', displayName: 'Create Customer', description: 'Register a new payment customer' },
          { name: 'list_invoices', displayName: 'List Invoices', description: 'Fetch billing invoices' },
        ],
        triggers: [
          { name: 'charge.succeeded', displayName: 'Payment Received', description: 'Triggered on successful charge', type: 'WEBHOOK' },
        ],
      },
    },
    {
      name: 'Google Workspace',
      slug: 'google-workspace',
      description: 'Connect to Google Workspace for Gmail, Calendar, Drive, and Docs.',
      iconUrl: 'https://cdn.simpleicons.org/google',
      category: 'PRODUCTIVITY',
      authType: 'OAUTH2',
      version: '1.3.0',
      isOfficial: true,
      oauthConfig: {
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: [
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/drive',
        ],
      },
      metadata: {
        documentationUrl: 'https://developers.google.com/workspace',
        setupGuide: [
          'Go to Google Cloud Console (console.cloud.google.com) and create a Project.',
          'Enable Gmail API, Google Calendar API, and Google Drive API under Enabled APIs.',
          'Configure OAuth Consent Screen and create OAuth 2.0 Client ID Credentials.',
          'Or use Service Account JSON Key for server-to-server workspace access.',
        ],
        actions: [
          { name: 'send_email', displayName: 'Send Gmail Email', description: 'Draft and send emails' },
          { name: 'create_event', displayName: 'Create Calendar Event', description: 'Schedule Google Calendar event' },
        ],
        triggers: [],
      },
    },
    {
      name: 'OpenAI',
      slug: 'openai',
      description: 'Connect to OpenAI for GPT-4o, Embeddings, DALL-E, and Assistants API.',
      iconUrl: 'https://cdn.simpleicons.org/openai/white',
      category: 'AI',
      authType: 'API_KEY',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://platform.openai.com/docs/api-reference',
        setupGuide: [
          'Log in to OpenAI Platform (platform.openai.com/account/api-keys).',
          'Click "+ Create new secret key", enter a key name, and set permissions.',
          'Copy the secret key (`sk-proj-...` or `sk-...`).',
          'Paste the key into the API Key field below.',
        ],
        actions: [
          { name: 'generate_text', displayName: 'Generate Text (Chat)', description: 'Invoke GPT-4o chat completion' },
          { name: 'create_embeddings', displayName: 'Create Embeddings', description: 'Generate vector embeddings' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Anthropic',
      slug: 'anthropic',
      description: 'Connect to Anthropic for Claude 3.5 Sonnet and Haiku AI models.',
      iconUrl: 'https://cdn.simpleicons.org/anthropic/white',
      category: 'AI',
      authType: 'API_KEY',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://docs.anthropic.com/claude/reference',
        setupGuide: [
          'Go to Anthropic Console (console.anthropic.com/settings/keys).',
          'Click "Create Key" and specify a key name.',
          'Copy your secret API key (`sk-ant-api03-...`).',
          'Paste the key into the API Key field below.',
        ],
        actions: [
          { name: 'create_message', displayName: 'Create Claude Message', description: 'Invoke Claude 3.5 Sonnet model' },
        ],
        triggers: [],
      },
    },
    {
      name: 'HubSpot',
      slug: 'hubspot',
      description: 'Connect to HubSpot for CRM, contacts, deals, and marketing automation.',
      iconUrl: 'https://cdn.simpleicons.org/hubspot',
      category: 'CRM',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      oauthConfig: {
        authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
        tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
        scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
      },
      metadata: {
        documentationUrl: 'https://developers.hubspot.com/docs/api/overview',
        setupGuide: [
          'Log in to HubSpot -> Settings -> Integrations -> Private Apps.',
          'Click "Create a private app", enter app name, and select `crm.objects.contacts` scope.',
          'Click "Create app" and copy the Access Token (`pat-na1-...`).',
          'Paste your Private App token into Bearer Token below.',
        ],
        actions: [
          { name: 'create_contact', displayName: 'Create Contact', description: 'Add CRM contact record' },
          { name: 'list_deals', displayName: 'List Deals', description: 'Retrieve sales pipeline deals' },
        ],
        triggers: [],
      },
    },
    {
      name: 'PostgreSQL',
      slug: 'postgresql',
      description: 'Connect directly to your PostgreSQL databases for live SQL querying and tables inspection.',
      iconUrl: 'https://cdn.simpleicons.org/postgresql',
      category: 'DATABASES',
      authType: 'CUSTOM',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://node-postgres.com',
        setupGuide: [
          'Provide your PostgreSQL connection credentials.',
          'Connection String format: `postgresql://username:password@host:5432/dbname`.',
          'Ensure your database firewall allows incoming connections from your API server.',
        ],
        actions: [
          { name: 'execute_query', displayName: 'Execute Read Query', description: 'Run SELECT query on database' },
          { name: 'list_tables', displayName: 'List Schema Tables', description: 'Inspect database tables' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Redis',
      slug: 'redis',
      description: 'Connect to Redis key-value store for caching, pub/sub, and session data.',
      iconUrl: 'https://cdn.simpleicons.org/redis',
      category: 'DATABASES',
      authType: 'CUSTOM',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://redis.io/docs',
        setupGuide: [
          'Provide Redis connection string: `redis://:password@host:6379`.',
          'Or enter Redis Host, Port, and Password in the configuration fields below.',
        ],
        actions: [
          { name: 'get_key', displayName: 'Get Key', description: 'Read string value by key' },
          { name: 'set_key', displayName: 'Set Key', description: 'Write string key with TTL' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Shopify',
      slug: 'shopify',
      description: 'Connect to Shopify to manage products, orders, inventory, and customers.',
      iconUrl: 'https://cdn.simpleicons.org/shopify',
      category: 'COMMERCE',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      oauthConfig: {
        authorizationUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
        tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
        scopes: ['read_products', 'write_products', 'read_orders'],
      },
      metadata: {
        documentationUrl: 'https://shopify.dev/docs/api/admin-rest',
        setupGuide: [
          'Go to Shopify Admin -> Settings -> Apps and sales channels -> Develop apps.',
          'Click "Create an app", select Admin API scopes (`read_products`, `read_orders`).',
          'Click "Install app" and copy the Admin API Access Token (`shpat_...`).',
          'Paste your token into Bearer Token below.',
        ],
        actions: [
          { name: 'list_products', displayName: 'List Store Products', description: 'Fetch products catalog' },
          { name: 'get_order', displayName: 'Get Order Details', description: 'Fetch order status by ID' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Mailchimp',
      slug: 'mailchimp',
      description: 'Connect to Mailchimp to manage email marketing lists, campaigns, and subscribers.',
      iconUrl: 'https://cdn.simpleicons.org/mailchimp',
      category: 'MARKETING',
      authType: 'API_KEY',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://mailchimp.com/developer/marketing/api',
        setupGuide: [
          'Log in to Mailchimp -> Account & billing -> Extras -> API keys.',
          'Click "Create A Key", enter a name, and copy the generated API Key (`...-us21`).',
          'Paste your key into the API Key field below.',
        ],
        actions: [
          { name: 'add_subscriber', displayName: 'Add List Subscriber', description: 'Subscribe email to list' },
          { name: 'create_campaign', displayName: 'Create Campaign', description: 'Draft email newsletter' },
        ],
        triggers: [],
      },
    },
    {
      name: 'QuickBooks',
      slug: 'quickbooks',
      description: 'Connect to QuickBooks Online for accounting, invoicing, expenses, and financial reports.',
      iconUrl: 'https://cdn.simpleicons.org/quickbooks',
      category: 'FINANCE',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice',
        setupGuide: [
          'Go to Intuit Developer Portal (developer.intuit.com) and create a developer app.',
          'Get your Client ID and Client Secret from Keys & OAuth.',
          'Authorize your QuickBooks Online company to grant OAuth 2.0 access.',
        ],
        actions: [
          { name: 'create_invoice', displayName: 'Create Invoice', description: 'Generate accounting invoice' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Google Analytics',
      slug: 'google-analytics',
      description: 'Connect to GA4 for website traffic, conversion reports, and user metrics.',
      iconUrl: 'https://cdn.simpleicons.org/googleanalytics',
      category: 'ANALYTICS',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
        setupGuide: [
          'Go to Google Cloud Console -> Enable Google Analytics Data API v1.',
          'Create a Service Account Key (JSON) or OAuth 2.0 Client Credentials.',
          'Add your Service Account email as a Viewer in GA4 Property Access Management.',
        ],
        actions: [
          { name: 'run_report', displayName: 'Run Traffic Report', description: 'Query GA4 active users & sessions' },
        ],
        triggers: [],
      },
    },
    {
      name: 'X (Twitter)',
      slug: 'twitter',
      description: 'Connect to X / Twitter to post tweets, read timelines, and analyze social engagement.',
      iconUrl: 'https://cdn.simpleicons.org/x/white',
      category: 'SOCIAL_MEDIA',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://developer.x.com/en/docs/x-api',
        setupGuide: [
          'Go to X Developer Portal (developer.x.com) -> Projects & Apps.',
          'Under Keys and tokens, generate a Bearer Token or OAuth 2.0 User Access Token.',
          'Copy the Bearer Token and paste it below.',
        ],
        actions: [
          { name: 'post_tweet', displayName: 'Post Tweet / Post', description: 'Publish text or media post' },
        ],
        triggers: [],
      },
    },
    {
      name: 'AWS S3',
      slug: 'aws-s3',
      description: 'Connect to Amazon S3 for cloud object storage, file uploads, and bucket management.',
      iconUrl: 'https://cdn.simpleicons.org/amazonaws/white',
      category: 'CLOUD',
      authType: 'API_KEY',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html',
        setupGuide: [
          'Log in to AWS IAM Console -> Users -> Security credentials.',
          'Click "Create access key" for programmatic access.',
          'Copy AWS Access Key ID and Secret Access Key into configuration fields below.',
        ],
        actions: [
          { name: 'list_objects', displayName: 'List Bucket Objects', description: 'List files in S3 bucket' },
          { name: 'upload_file', displayName: 'Upload Object', description: 'Upload file buffer to S3' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Linear',
      slug: 'linear',
      description: 'Connect to Linear to manage issues, projects, cycles, and software engineering roadmaps.',
      iconUrl: 'https://cdn.simpleicons.org/linear',
      category: 'DEVELOPER_TOOLS',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
        setupGuide: [
          'Go to Linear Settings -> Account -> API (linear.app/settings/api).',
          'Under Personal API keys, click "Create key", enter a label, and copy the key (`lin_api_...`).',
          'Paste your key into the API Key / Bearer Token field below.',
        ],
        actions: [
          { name: 'create_issue', displayName: 'Create Linear Issue', description: 'Add new issue to backlog' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Jira',
      slug: 'jira',
      description: 'Connect to Atlassian Jira for enterprise issue tracking and agile sprint management.',
      iconUrl: 'https://cdn.simpleicons.org/jira',
      category: 'DEVELOPER_TOOLS',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
        setupGuide: [
          'Go to Atlassian API Tokens page (id.atlassian.com/manage-profile/security/api-tokens).',
          'Click "Create API token", enter a label, and copy the generated token.',
          'Use your Atlassian Account Email as Username and the API Token as Password.',
        ],
        actions: [
          { name: 'create_issue', displayName: 'Create Jira Issue', description: 'Create task or bug ticket' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Discord',
      slug: 'discord',
      description: 'Connect to Discord to post bot messages, manage roles, and monitor community servers.',
      iconUrl: 'https://cdn.simpleicons.org/discord',
      category: 'COMMUNICATION',
      authType: 'BEARER_TOKEN',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://discord.com/developers/docs/intro',
        setupGuide: [
          'Go to Discord Developer Portal (discord.com/developers/applications).',
          'Click "New Application", go to Bot tab, and click "Reset Token".',
          'Copy the Bot Token and paste it into Bearer Token below.',
        ],
        actions: [
          { name: 'send_message', displayName: 'Post Channel Message', description: 'Send text via Discord Bot' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Cloudflare',
      slug: 'cloudflare',
      description: 'Connect to Cloudflare for DNS management, Workers, and CDN caching.',
      iconUrl: 'https://cdn.simpleicons.org/cloudflare',
      category: 'CLOUD',
      authType: 'API_KEY',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://developers.cloudflare.com/api/',
        setupGuide: [
          'Go to Cloudflare Dashboard -> User Profile -> API Tokens (dash.cloudflare.com/profile/api-tokens).',
          'Click "Create Token", select a template (e.g. Edit Zone DNS), and generate token.',
          'Copy your API Token and paste it below.',
        ],
        actions: [
          { name: 'purge_cache', displayName: 'Purge Zone Cache', description: 'Clear Cloudflare CDN cache' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Twilio',
      slug: 'twilio',
      description: 'Connect to Twilio for programmatic SMS, Voice, and WhatsApp notifications.',
      iconUrl: 'https://cdn.simpleicons.org/twilio',
      category: 'COMMUNICATION',
      authType: 'BASIC_AUTH',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://www.twilio.com/docs/usage/api',
        setupGuide: [
          'Log in to Twilio Console (console.twilio.com).',
          'Copy your Account SID into Username and Auth Token into Password.',
        ],
        actions: [
          { name: 'send_sms', displayName: 'Send SMS Message', description: 'Dispatch text SMS message' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Dropbox',
      slug: 'dropbox',
      description: 'Connect to Dropbox to manage cloud files, shared folders, and paper documents.',
      iconUrl: 'https://cdn.simpleicons.org/dropbox',
      category: 'STORAGE',
      authType: 'OAUTH2',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://www.dropbox.com/developers/documentation',
        setupGuide: [
          'Go to Dropbox App Console (dropbox.com/developers/apps).',
          'Click "Create app", choose Scoped access, set permissions, and generate Access Token.',
          'Copy the token and paste it into Bearer Token below.',
        ],
        actions: [
          { name: 'list_folder', displayName: 'List Folder Files', description: 'Browse files in Dropbox directory' },
        ],
        triggers: [],
      },
    },
    {
      name: 'Custom REST API',
      slug: 'custom-rest-api',
      description: 'Connect any OpenAPI / Swagger endpoint or internal Microservice via REST URL & Headers.',
      iconUrl: 'https://cdn.simpleicons.org/openapiinitiative',
      category: 'CUSTOM_API',
      authType: 'CUSTOM',
      version: '1.0.0',
      isOfficial: true,
      metadata: {
        documentationUrl: 'https://swagger.io/specification/',
        setupGuide: [
          'Provide the Base URL of your OpenAPI / REST Microservice.',
          'Optionally specify custom HTTP headers (e.g. `X-API-Key: secret`).',
        ],
        actions: [
          { name: 'http_request', displayName: 'Execute HTTP Request', description: 'Make GET, POST, PUT, DELETE REST call' },
        ],
        triggers: [],
      },
    },
  ];

  for (const connector of connectors) {
    await prisma.connectorDefinition.upsert({
      where: { slug: connector.slug },
      update: connector,
      create: connector,
    });
    console.log(`  ✅ Connector: ${connector.name} (${connector.category})`);
  }

  // ─── Pre-configured Tool Definitions ──────────────────

  const toolMappings = [
    {
      slug: 'github',
      tools: [
        {
          name: 'list_repositories',
          namespacedName: 'github.list_repositories',
          description: 'List all GitHub repositories (public and private) for the connected GitHub account. Use this tool whenever the user asks to see or list their GitHub repositories, repos, or projects.',
          inputSchema: {
            type: 'object',
            properties: {
              org: { type: 'string', description: 'Organization name' },
              per_page: { type: 'number', description: 'Results per page (max 100)' },
            },
          },
        },
        {
          name: 'get_repository',
          namespacedName: 'github.get_repository',
          description: 'Get details of a specific GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'get_file_contents',
          namespacedName: 'github.get_file_contents',
          description: 'Get the content of a file or directory in a GitHub repository. Use this whenever the user asks to inspect, read, check, or view files in a repo.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner (e.g. rajmor-2005)' },
              repo: { type: 'string', description: 'Repository name (e.g. studymate-ai)' },
              path: { type: 'string', description: 'File path inside repository (e.g. package.json, src/index.js, or empty for root directory)' },
              ref: { type: 'string', description: 'Branch name, tag, or commit SHA (optional)' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'list_contents',
          namespacedName: 'github.list_contents',
          description: 'List files and folders in a repository directory.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              path: { type: 'string', description: 'Directory path (optional, leave blank for root directory)' },
              ref: { type: 'string', description: 'Branch name or commit SHA (optional)' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'create_or_update_file',
          namespacedName: 'github.create_or_update_file',
          description: 'Create or update a file in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              path: { type: 'string', description: 'File path (e.g. README.md)' },
              message: { type: 'string', description: 'Commit message' },
              content: { type: 'string', description: 'Base64 encoded file content or text content' },
              sha: { type: 'string', description: 'Blob SHA of the file being replaced (required if updating existing file)' },
              branch: { type: 'string', description: 'Branch name (optional)' },
            },
            required: ['owner', 'repo', 'path', 'message', 'content'],
          },
        },
        {
          name: 'list_branches',
          namespacedName: 'github.list_branches',
          description: 'List branches in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'list_commits',
          namespacedName: 'github.list_commits',
          description: 'List commits in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              sha: { type: 'string', description: 'Branch name or commit SHA to start listing from' },
              path: { type: 'string', description: 'Only commits containing this file path' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'create_issue',
          namespacedName: 'github.create_issue',
          description: 'Create a new issue in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              title: { type: 'string', description: 'Issue title' },
              body: { type: 'string', description: 'Issue body (Markdown)' },
            },
            required: ['owner', 'repo', 'title'],
          },
        },
        {
          name: 'list_issues',
          namespacedName: 'github.list_issues',
          description: 'List issues in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              state: { type: 'string', description: 'State filter: open, closed, all' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'add_issue_comment',
          namespacedName: 'github.add_issue_comment',
          description: 'Add a comment to a GitHub issue or pull request.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              issue_number: { type: 'number', description: 'Issue or PR number' },
              body: { type: 'string', description: 'Comment text (Markdown)' },
            },
            required: ['owner', 'repo', 'issue_number', 'body'],
          },
        },
        {
          name: 'create_pull_request',
          namespacedName: 'github.create_pull_request',
          description: 'Create a new pull request in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              title: { type: 'string', description: 'PR title' },
              head: { type: 'string', description: 'Branch containing changes' },
              base: { type: 'string', description: 'Branch to merge into' },
              body: { type: 'string', description: 'PR description' },
            },
            required: ['owner', 'repo', 'title', 'head', 'base'],
          },
        },
        {
          name: 'list_pull_requests',
          namespacedName: 'github.list_pull_requests',
          description: 'List pull requests in a GitHub repository.',
          inputSchema: {
            type: 'object',
            properties: {
              owner: { type: 'string', description: 'Repository owner' },
              repo: { type: 'string', description: 'Repository name' },
              state: { type: 'string', description: 'State filter: open, closed, all' },
            },
            required: ['owner', 'repo'],
          },
        },
        {
          name: 'get_user',
          namespacedName: 'github.get_user',
          description: 'Get authenticated GitHub user profile information.',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    },
    {
      slug: 'slack',
      tools: [
        {
          name: 'send_message',
          namespacedName: 'slack.send_message',
          description: 'Send a text or block message to a Slack channel.',
          inputSchema: {
            type: 'object',
            properties: {
              channel: { type: 'string', description: 'Channel ID or name' },
              text: { type: 'string', description: 'Message text' },
            },
            required: ['channel', 'text'],
          },
        },
      ],
    },
    {
      slug: 'openai',
      tools: [
        {
          name: 'generate_text',
          namespacedName: 'openai.generate_text',
          description: 'Generate text completions or chat responses using GPT-4o.',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'User prompt' },
              model: { type: 'string', description: 'Model name (e.g. gpt-4o)' },
            },
            required: ['prompt'],
          },
        },
      ],
    },
    {
      slug: 'stripe',
      tools: [
        {
          name: 'create_customer',
          namespacedName: 'stripe.create_customer',
          description: 'Create a new customer in Stripe billing system.',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', description: 'Customer email' },
              name: { type: 'string', description: 'Customer full name' },
            },
            required: ['email'],
          },
        },
      ],
    },
  ];

  for (const mapping of toolMappings) {
    const def = await prisma.connectorDefinition.findUnique({ where: { slug: mapping.slug } });
    if (def) {
      for (const tool of mapping.tools) {
        await prisma.toolDefinition.upsert({
          where: {
            connectorDefinitionId_name: {
              connectorDefinitionId: def.id,
              name: tool.name,
            },
          },
          update: { ...tool, connectorDefinitionId: def.id },
          create: { ...tool, connectorDefinitionId: def.id },
        });
        console.log(`    🔧 Tool: ${tool.namespacedName}`);
      }
    }
  }

  // ─── Default Dev User & Workspace ───────────────────
  const bcryptModule = await import('bcryptjs');
  const hashFn = bcryptModule.hash || bcryptModule.default?.hash || bcryptModule.hashSync;
  const passwordHash = await hashFn('Password123!', 10);

  const testUser = await prisma.user.upsert({
    where: { email: 'dev@example.com' },
    update: {},
    create: {
      email: 'dev@example.com',
      passwordHash,
      name: 'Dev User',
      emailVerified: true,
    },
  });

  const testOrg = await prisma.organization.upsert({
    where: { slug: 'dev-org' },
    update: {},
    create: {
      name: "Dev User's Org",
      slug: 'dev-org',
      ownerId: testUser.id,
      members: {
        create: {
          userId: testUser.id,
          role: 'OWNER',
        },
      },
      subscriptions: {
        create: {
          plan: 'STARTER',
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      },
    },
  });

  const testWorkspace = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: testOrg.id, slug: 'default' } },
    update: {},
    create: {
      organizationId: testOrg.id,
      name: 'Default Workspace',
      slug: 'default',
      mcpEndpoint: `http://localhost:4000/mcp/u/ws_default`,
      members: {
        create: {
          userId: testUser.id,
          role: 'ADMIN',
        },
      },
    },
  });

  console.log(`  👤 Dev User: dev@example.com / Password123!`);
  console.log(`  🏢 Org: ${testOrg.name}`);
  console.log(`  📦 Workspace: ${testWorkspace.name}`);

  console.log('\n✨ Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
