export interface IntegrationField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "json" | "textarea";
  placeholder?: string;
  helpUrl?: string;
  required?: boolean;
}

export interface IntegrationDef {
  id: string;
  name: string;
  category: "search" | "ai-model" | "developer" | "productivity" | "communication" | "social" | "messaging" | "finance" | "media" | "monitoring" | "database" | "storage";
  icon: string;
  description: string;
  fields: IntegrationField[];
}

export const INTEGRATIONS_REGISTRY: IntegrationDef[] = [
  // ── Search & Research ──
  { id: "brave-search", name: "Brave Search", category: "search", icon: "🦁", description: "Web search via Brave Search API", fields: [
    { key: "BRAVE_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://brave.com/search/api/" },
  ]},
  { id: "perplexity", name: "Perplexity", category: "search", icon: "🔍", description: "AI-powered search via Perplexity", fields: [
    { key: "PERPLEXITY_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://docs.perplexity.ai/" },
  ]},
  { id: "google-cse", name: "Google Custom Search", category: "search", icon: "🔎", description: "Google Custom Search Engine", fields: [
    { key: "GOOGLE_CSE_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://developers.google.com/custom-search/v1/introduction" },
    { key: "GOOGLE_CSE_ID", label: "Search Engine ID", type: "text", required: true },
  ]},
  { id: "serpapi", name: "SerpAPI", category: "search", icon: "🐍", description: "Search engine results API", fields: [
    { key: "SERPAPI_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://serpapi.com/dashboard" },
  ]},
  { id: "tavily", name: "Tavily", category: "search", icon: "🌐", description: "AI-optimized search API", fields: [
    { key: "TAVILY_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://tavily.com/" },
  ]},

  // ── AI Models ──
  { id: "openrouter", name: "OpenRouter", category: "ai-model", icon: "🔀", description: "Access multiple AI models via OpenRouter", fields: [
    { key: "OPENROUTER_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://openrouter.ai/keys" },
  ]},
  { id: "groq", name: "Groq", category: "ai-model", icon: "⚡", description: "Ultra-fast LLM inference", fields: [
    { key: "GROQ_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://console.groq.com/keys" },
  ]},
  { id: "mistral", name: "Mistral", category: "ai-model", icon: "🌀", description: "Mistral AI models", fields: [
    { key: "MISTRAL_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://console.mistral.ai/api-keys/" },
  ]},
  { id: "xai", name: "xAI (Grok)", category: "ai-model", icon: "🤖", description: "xAI Grok models", fields: [
    { key: "XAI_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://console.x.ai/" },
  ]},
  { id: "aws-bedrock", name: "AWS Bedrock", category: "ai-model", icon: "🪨", description: "AWS Bedrock foundation models", fields: [
    { key: "AWS_ACCESS_KEY_ID", label: "Access Key ID", type: "password", required: true, helpUrl: "https://console.aws.amazon.com/iam/home#/security_credentials" },
    { key: "AWS_SECRET_ACCESS_KEY", label: "Secret Access Key", type: "password", required: true },
    { key: "AWS_REGION", label: "Region", type: "text", placeholder: "us-east-1", required: true },
  ]},
  { id: "azure-openai", name: "Azure OpenAI", category: "ai-model", icon: "☁️", description: "Azure-hosted OpenAI models", fields: [
    { key: "AZURE_OPENAI_ENDPOINT", label: "Endpoint", type: "url", required: true, helpUrl: "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub" },
    { key: "AZURE_OPENAI_API_KEY", label: "API Key", type: "password", required: true },
    { key: "AZURE_OPENAI_DEPLOYMENT", label: "Deployment Name", type: "text", required: true },
  ]},

  // ── Developer Tools ──
  { id: "github", name: "GitHub", category: "developer", icon: "🐙", description: "GitHub API access", fields: [
    { key: "GITHUB_TOKEN", label: "Personal Access Token", type: "password", required: true, helpUrl: "https://github.com/settings/tokens" },
  ]},
  { id: "gitlab", name: "GitLab", category: "developer", icon: "🦊", description: "GitLab API access", fields: [
    { key: "GITLAB_TOKEN", label: "Personal Access Token", type: "password", required: true, helpUrl: "https://gitlab.com/-/user_settings/personal_access_tokens" },
  ]},
  { id: "linear", name: "Linear", category: "developer", icon: "📐", description: "Linear project management", fields: [
    { key: "LINEAR_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://linear.app/settings/api" },
  ]},
  { id: "jira", name: "Jira", category: "developer", icon: "📋", description: "Atlassian Jira integration", fields: [
    { key: "JIRA_API_TOKEN", label: "API Token", type: "password", required: true, helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens" },
    { key: "JIRA_EMAIL", label: "Email", type: "text", required: true },
    { key: "JIRA_DOMAIN", label: "Domain", type: "text", placeholder: "yourcompany.atlassian.net", required: true },
  ]},
  { id: "vercel", name: "Vercel", category: "developer", icon: "▲", description: "Vercel deployment platform", fields: [
    { key: "VERCEL_TOKEN", label: "Access Token", type: "password", required: true, helpUrl: "https://vercel.com/account/tokens" },
  ]},
  { id: "supabase", name: "Supabase", category: "developer", icon: "⚡", description: "Supabase backend-as-a-service", fields: [
    { key: "SUPABASE_URL", label: "Project URL", type: "url", required: true, helpUrl: "https://supabase.com/dashboard/project/_/settings/api" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Service Role Key", type: "password", required: true },
  ]},
  { id: "cloudflare", name: "Cloudflare", category: "developer", icon: "🔶", description: "Cloudflare API", fields: [
    { key: "CLOUDFLARE_API_TOKEN", label: "API Token", type: "password", required: true, helpUrl: "https://dash.cloudflare.com/profile/api-tokens" },
  ]},
  { id: "flyio", name: "Fly.io", category: "developer", icon: "🪁", description: "Fly.io deployment platform", fields: [
    { key: "FLY_API_TOKEN", label: "API Token", type: "password", required: true, helpUrl: "https://fly.io/user/personal_access_tokens" },
  ]},
  { id: "railway", name: "Railway", category: "developer", icon: "🚂", description: "Railway deployment platform", fields: [
    { key: "RAILWAY_TOKEN", label: "API Token", type: "password", required: true, helpUrl: "https://railway.app/account/tokens" },
  ]},
  { id: "docker-hub", name: "Docker Hub", category: "developer", icon: "🐳", description: "Docker Hub registry", fields: [
    { key: "DOCKER_USERNAME", label: "Username", type: "text", required: true, helpUrl: "https://hub.docker.com/settings/security" },
    { key: "DOCKER_TOKEN", label: "Access Token", type: "password", required: true },
  ]},

  // ── Productivity ──
  { id: "notion", name: "Notion", category: "productivity", icon: "📝", description: "Notion workspace integration", fields: [
    { key: "NOTION_TOKEN", label: "Integration Token", type: "password", required: true, helpUrl: "https://www.notion.so/my-integrations" },
  ]},
  { id: "google-workspace", name: "Google Workspace", category: "productivity", icon: "📧", description: "Gmail, Calendar, Drive access", fields: [
    { key: "GOOGLE_CLIENT_ID", label: "Client ID", type: "text", required: true, helpUrl: "https://console.cloud.google.com/apis/credentials" },
    { key: "GOOGLE_CLIENT_SECRET", label: "Client Secret", type: "password", required: true },
    { key: "GOOGLE_REFRESH_TOKEN", label: "Refresh Token", type: "password", required: true },
  ]},
  { id: "todoist", name: "Todoist", category: "productivity", icon: "✅", description: "Todoist task management", fields: [
    { key: "TODOIST_API_TOKEN", label: "API Token", type: "password", required: true, helpUrl: "https://todoist.com/app/settings/integrations/developer" },
  ]},
  { id: "airtable", name: "Airtable", category: "productivity", icon: "📊", description: "Airtable database", fields: [
    { key: "AIRTABLE_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://airtable.com/account" },
    { key: "AIRTABLE_BASE_ID", label: "Base ID", type: "text", required: true },
  ]},

  // ── Communication ──
  { id: "resend", name: "Resend", category: "communication", icon: "📨", description: "Transactional email via Resend", fields: [
    { key: "RESEND_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://resend.com/api-keys" },
  ]},
  { id: "sendgrid", name: "SendGrid", category: "communication", icon: "📬", description: "Email delivery via SendGrid", fields: [
    { key: "SENDGRID_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://app.sendgrid.com/settings/api_keys" },
  ]},
  { id: "twilio", name: "Twilio", category: "communication", icon: "📞", description: "SMS and voice via Twilio", fields: [
    { key: "TWILIO_ACCOUNT_SID", label: "Account SID", type: "text", required: true, helpUrl: "https://console.twilio.com/" },
    { key: "TWILIO_AUTH_TOKEN", label: "Auth Token", type: "password", required: true },
    { key: "TWILIO_PHONE_NUMBER", label: "Phone Number", type: "text", placeholder: "+1234567890", required: true },
  ]},
  { id: "mailgun", name: "Mailgun", category: "communication", icon: "✉️", description: "Email delivery via Mailgun", fields: [
    { key: "MAILGUN_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://app.mailgun.com/settings/api_security" },
    { key: "MAILGUN_DOMAIN", label: "Domain", type: "text", required: true },
  ]},

  // ── Messaging ──
  { id: "telegram", name: "Telegram", category: "messaging", icon: "✈️", description: "Telegram bot integration", fields: [
    { key: "TELEGRAM_BOT_TOKEN", label: "Bot Token", type: "password", required: true, helpUrl: "https://t.me/BotFather" },
  ]},
  { id: "discord", name: "Discord", category: "messaging", icon: "💬", description: "Discord bot integration", fields: [
    { key: "DISCORD_BOT_TOKEN", label: "Bot Token", type: "password", required: true, helpUrl: "https://discord.com/developers/applications" },
    { key: "DISCORD_APP_ID", label: "Application ID", type: "text", required: true },
  ]},
  { id: "slack", name: "Slack", category: "messaging", icon: "💼", description: "Slack bot integration", fields: [
    { key: "SLACK_BOT_TOKEN", label: "Bot Token", type: "password", required: true, helpUrl: "https://api.slack.com/apps" },
    { key: "SLACK_APP_TOKEN", label: "App Token", type: "password", required: true },
    { key: "SLACK_SIGNING_SECRET", label: "Signing Secret", type: "password", required: true },
  ]},

  // ── Social ──
  { id: "x-twitter", name: "X / Twitter", category: "social", icon: "𝕏", description: "X/Twitter API access", fields: [
    { key: "X_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://developer.x.com/en/portal/dashboard" },
    { key: "X_API_SECRET", label: "API Secret", type: "password", required: true },
    { key: "X_ACCESS_TOKEN", label: "Access Token", type: "password", required: true },
    { key: "X_ACCESS_TOKEN_SECRET", label: "Access Token Secret", type: "password", required: true },
  ]},
  { id: "reddit", name: "Reddit", category: "social", icon: "🤖", description: "Reddit API access", fields: [
    { key: "REDDIT_CLIENT_ID", label: "Client ID", type: "text", required: true, helpUrl: "https://www.reddit.com/prefs/apps" },
    { key: "REDDIT_CLIENT_SECRET", label: "Client Secret", type: "password", required: true },
    { key: "REDDIT_USERNAME", label: "Username", type: "text", required: true },
    { key: "REDDIT_PASSWORD", label: "Password", type: "password", required: true },
  ]},
  { id: "bluesky", name: "Bluesky", category: "social", icon: "🦋", description: "Bluesky social network", fields: [
    { key: "BLUESKY_HANDLE", label: "Handle", type: "text", placeholder: "you.bsky.social", required: true, helpUrl: "https://bsky.app/settings/app-passwords" },
    { key: "BLUESKY_APP_PASSWORD", label: "App Password", type: "password", required: true },
  ]},
  { id: "mastodon", name: "Mastodon", category: "social", icon: "🐘", description: "Mastodon/Fediverse access", fields: [
    { key: "MASTODON_INSTANCE_URL", label: "Instance URL", type: "url", placeholder: "https://mastodon.social", required: true },
    { key: "MASTODON_ACCESS_TOKEN", label: "Access Token", type: "password", required: true },
  ]},

  // ── Finance ──
  { id: "stripe", name: "Stripe", category: "finance", icon: "💳", description: "Stripe payments", fields: [
    { key: "STRIPE_SECRET_KEY", label: "Secret Key", type: "password", required: true, helpUrl: "https://dashboard.stripe.com/apikeys" },
    { key: "STRIPE_WEBHOOK_SECRET", label: "Webhook Secret", type: "password" },
  ]},
  { id: "plaid", name: "Plaid", category: "finance", icon: "🏦", description: "Banking data via Plaid", fields: [
    { key: "PLAID_CLIENT_ID", label: "Client ID", type: "text", required: true, helpUrl: "https://dashboard.plaid.com/developers/keys" },
    { key: "PLAID_SECRET", label: "Secret", type: "password", required: true },
    { key: "PLAID_ENV", label: "Environment", type: "text", placeholder: "sandbox", required: true },
  ]},

  // ── Media & Smart Home ──
  { id: "spotify", name: "Spotify", category: "media", icon: "🎵", description: "Spotify music integration", fields: [
    { key: "SPOTIFY_CLIENT_ID", label: "Client ID", type: "text", required: true, helpUrl: "https://developer.spotify.com/dashboard" },
    { key: "SPOTIFY_CLIENT_SECRET", label: "Client Secret", type: "password", required: true },
    { key: "SPOTIFY_REFRESH_TOKEN", label: "Refresh Token", type: "password", required: true },
  ]},
  { id: "home-assistant", name: "Home Assistant", category: "media", icon: "🏠", description: "Home Assistant smart home", fields: [
    { key: "HOME_ASSISTANT_URL", label: "URL", type: "url", placeholder: "http://homeassistant.local:8123", required: true },
    { key: "HOME_ASSISTANT_TOKEN", label: "Long-Lived Access Token", type: "password", required: true, helpUrl: "https://www.home-assistant.io/docs/authentication/#your-account-profile" },
  ]},
  { id: "philips-hue", name: "Philips Hue", category: "media", icon: "💡", description: "Philips Hue smart lights", fields: [
    { key: "HUE_BRIDGE_IP", label: "Bridge IP", type: "text", required: true, helpUrl: "https://developers.meethue.com/develop/get-started-2/" },
    { key: "HUE_USERNAME", label: "Username/API Key", type: "password", required: true },
  ]},

  // ── Monitoring ──
  { id: "sentry", name: "Sentry", category: "monitoring", icon: "🐛", description: "Error tracking via Sentry", fields: [
    { key: "SENTRY_DSN", label: "DSN", type: "url", required: true, helpUrl: "https://sentry.io/settings/projects/" },
    { key: "SENTRY_AUTH_TOKEN", label: "Auth Token", type: "password", helpUrl: "https://sentry.io/settings/auth-tokens/" },
  ]},
  { id: "datadog", name: "Datadog", category: "monitoring", icon: "🐕", description: "Monitoring via Datadog", fields: [
    { key: "DATADOG_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://app.datadoghq.com/organization-settings/api-keys" },
    { key: "DATADOG_APP_KEY", label: "Application Key", type: "password", required: true },
  ]},
  { id: "uptimerobot", name: "UptimeRobot", category: "monitoring", icon: "🤖", description: "Uptime monitoring", fields: [
    { key: "UPTIMEROBOT_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://uptimerobot.com/dashboard#mySettings" },
  ]},
  { id: "pagerduty", name: "PagerDuty", category: "monitoring", icon: "🚨", description: "Incident management", fields: [
    { key: "PAGERDUTY_API_KEY", label: "API Key", type: "password", required: true, helpUrl: "https://support.pagerduty.com/docs/api-access-keys" },
  ]},

  // ── Databases & Storage ──
  { id: "postgresql", name: "PostgreSQL", category: "database", icon: "🐘", description: "PostgreSQL database connection", fields: [
    { key: "DATABASE_URL", label: "Connection URL", type: "url", placeholder: "postgresql://user:pass@host:5432/db", required: true },
  ]},
  { id: "redis", name: "Redis / Upstash", category: "database", icon: "🔴", description: "Redis or Upstash connection", fields: [
    { key: "REDIS_URL", label: "Redis URL", type: "url", required: true, helpUrl: "https://console.upstash.com/" },
    { key: "REDIS_TOKEN", label: "Token (Upstash)", type: "password" },
  ]},
  { id: "mongodb", name: "MongoDB", category: "database", icon: "🍃", description: "MongoDB database connection", fields: [
    { key: "MONGODB_URI", label: "Connection URI", type: "url", placeholder: "mongodb+srv://...", required: true, helpUrl: "https://cloud.mongodb.com/" },
  ]},
  { id: "aws-s3", name: "AWS S3", category: "storage", icon: "🪣", description: "AWS S3 object storage", fields: [
    { key: "AWS_S3_ACCESS_KEY", label: "Access Key", type: "password", required: true, helpUrl: "https://console.aws.amazon.com/iam/home#/security_credentials" },
    { key: "AWS_S3_SECRET_KEY", label: "Secret Key", type: "password", required: true },
    { key: "AWS_S3_BUCKET", label: "Bucket Name", type: "text", required: true },
    { key: "AWS_S3_REGION", label: "Region", type: "text", placeholder: "us-east-1", required: true },
  ]},
  { id: "firebase", name: "Firebase", category: "storage", icon: "🔥", description: "Firebase/Firestore", fields: [
    { key: "FIREBASE_CONFIG", label: "Config JSON", type: "textarea", required: true, helpUrl: "https://console.firebase.google.com/project/_/settings/general" },
  ]},
];

export function getIntegrationDef(id: string): IntegrationDef | undefined {
  return INTEGRATIONS_REGISTRY.find(i => i.id === id);
}
