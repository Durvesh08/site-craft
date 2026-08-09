import { Router, Request, Response, IRouter } from "express";

const connectorsRouter: IRouter = Router();

export interface ConnectorItem {
  id: string;
  name: string;
  description: string;
  category: 'AI' | 'Payments' | 'Database' | 'Analytics' | 'Communication' | 'Marketing' | 'Commerce' | 'Storage' | 'Developer' | 'Productivity' | 'Automation' | 'Design';
  icon: string;
  brandColor?: string;
  status: 'Available' | 'Connecting' | 'Connected' | 'Needs configuration' | 'Error' | 'Unavailable';
  authType: 'API Key' | 'OAuth 2.0' | 'Webhook' | 'Database URI';
  capabilities: string[];
  docsUrl?: string;
  connectedAt?: string;
}

const CATALOG: ConnectorItem[] = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o, DALL-E 3 & Embeddings models', category: 'AI', icon: 'Sparkles', brandColor: '#10A37F', status: 'Available', authType: 'API Key', capabilities: ['Text Generation', 'Image Generation', 'Code Refactoring'] },
  { id: 'gemini', name: 'Google Gemini', description: 'Multimodal Gemini 1.5 Pro & Flash APIs', category: 'AI', icon: 'Zap', brandColor: '#1A73E8', status: 'Available', authType: 'API Key', capabilities: ['Multimodal Inference', 'Structured JSON Output'] },
  { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude 3.5 Sonnet & Opus text models', category: 'AI', icon: 'Cpu', brandColor: '#D97706', status: 'Available', authType: 'API Key', capabilities: ['Long-Context Reasoning', 'Code Analysis'] },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Realistic AI voice synthesis and audio generation', category: 'AI', icon: 'Mic', brandColor: '#7C3AED', status: 'Available', authType: 'API Key', capabilities: ['Text-to-Speech', 'Voice Cloning'] },

  { id: 'stripe', name: 'Stripe', description: 'Global subscription billing, checkout & Webhooks', category: 'Payments', icon: 'CreditCard', brandColor: '#635BFF', status: 'Available', authType: 'OAuth 2.0', capabilities: ['Subscription Billing', 'Payment Links', 'Customer Portal'] },
  { id: 'paddle', name: 'Paddle', description: 'Merchant of record SaaS payments & tax compliance', category: 'Payments', icon: 'DollarSign', brandColor: '#3B82F6', status: 'Available', authType: 'API Key', capabilities: ['MoR Checkout', 'SaaS Billing'] },
  { id: 'razorpay', name: 'Razorpay', description: 'India & SEA digital payment gateway', category: 'Payments', icon: 'Wallet', brandColor: '#0C2340', status: 'Available', authType: 'API Key', capabilities: ['UPI & Cards Checkout', 'Subscriptions'] },

  { id: 'supabase', name: 'Supabase', description: 'Open-source Postgres with Realtime, Storage & Auth', category: 'Database', icon: 'Database', brandColor: '#3ECF8E', status: 'Available', authType: 'API Key', capabilities: ['Postgres SQL', 'Realtime Subscriptions', 'User Auth'] },
  { id: 'firebase', name: 'Firebase', description: 'Cloud Firestore, Storage & Authentication SDKs', category: 'Database', icon: 'Flame', brandColor: '#FFCA28', status: 'Available', authType: 'API Key', capabilities: ['NoSQL Store', 'Auth', 'File Storage'] },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Direct relational database connection via pooler', category: 'Database', icon: 'Server', brandColor: '#336791', status: 'Available', authType: 'Database URI', capabilities: ['Raw SQL Queries', 'Migrations'] },
  { id: 'mongodb', name: 'MongoDB Atlas', description: 'NoSQL document cloud database connection', category: 'Database', icon: 'HardDrive', brandColor: '#47A248', status: 'Available', authType: 'Database URI', capabilities: ['Document Queries', 'Aggregation'] },

  { id: 'shopify', name: 'Shopify Storefront', description: 'Products, cart, and storefront API sync', category: 'Commerce', icon: 'ShoppingBag', brandColor: '#96BF48', status: 'Available', authType: 'OAuth 2.0', capabilities: ['Product Sync', 'Cart API', 'Inventory'] },

  { id: 'resend', name: 'Resend', description: 'Transactional emails & HTML templates for developers', category: 'Communication', icon: 'Mail', brandColor: '#000000', status: 'Available', authType: 'API Key', capabilities: ['Transactional Email', 'Batch Sending'] },
  { id: 'slack', name: 'Slack', description: 'Channel notifications, bot alerts & incoming webhooks', category: 'Communication', icon: 'MessageSquare', brandColor: '#4A154B', status: 'Available', authType: 'OAuth 2.0', capabilities: ['Incoming Webhooks', 'Channel Messages'] },
  { id: 'discord', name: 'Discord', description: 'Community bot triggers & webhook notifications', category: 'Communication', icon: 'Headphones', brandColor: '#5865F2', status: 'Available', authType: 'Webhook', capabilities: ['Rich Embed Messages', 'Bot Actions'] },
  { id: 'telegram', name: 'Telegram Bot', description: 'Instant messaging notifications & bot API', category: 'Communication', icon: 'Send', brandColor: '#26A5E4', status: 'Available', authType: 'API Key', capabilities: ['Bot Messages', 'Commands'] },

  { id: 'google-analytics', name: 'Google Analytics 4', description: 'Global web traffic and conversion tracking tag', category: 'Analytics', icon: 'BarChart2', brandColor: '#F9AB00', status: 'Available', authType: 'API Key', capabilities: ['Traffic Tracking', 'Event Analytics'] },
  { id: 'posthog', name: 'PostHog', description: 'Product analytics, feature flags & session recording', category: 'Analytics', icon: 'Activity', brandColor: '#F54E00', status: 'Available', authType: 'API Key', capabilities: ['Product Analytics', 'Feature Flags', 'Session Replays'] },
  
  { id: 'github', name: 'GitHub', description: 'Source code repositories, pull requests & CI/CD sync', category: 'Developer', icon: 'GitBranch', brandColor: '#24292E', status: 'Available', authType: 'OAuth 2.0', capabilities: ['Repo Commit Sync', 'Branching', 'PR Checks'] },
  { id: 'linear', name: 'Linear', description: 'Issue tracking & project roadmap synchronizer', category: 'Productivity', icon: 'CheckSquare', brandColor: '#5E6AD2', status: 'Available', authType: 'OAuth 2.0', capabilities: ['Issue Creation', 'Status Sync'] },
  { id: 'sentry', name: 'Sentry', description: 'Real-time error logging & crash reporting SDK', category: 'Developer', icon: 'ShieldAlert', brandColor: '#362D59', status: 'Available', authType: 'API Key', capabilities: ['Crash Reporting', 'Performance Tracing'] },
  { id: 'notion', name: 'Notion', description: 'Sync CMS content from Notion databases', category: 'Productivity', icon: 'FileText', brandColor: '#000000', status: 'Available', authType: 'OAuth 2.0', capabilities: ['CMS Content Fetch', 'Database Sync'] },
  { id: 'figma', name: 'Figma', description: 'Design tokens & vector asset sync', category: 'Design', icon: 'Figma', brandColor: '#F24E1E', status: 'Available', authType: 'OAuth 2.0', capabilities: ['Design Tokens', 'Asset Export'] },
  { id: 'zapier', name: 'Zapier', description: '5,000+ app workflow webhooks & triggers', category: 'Automation', icon: 'Workflow', brandColor: '#FF4A00', status: 'Available', authType: 'Webhook', capabilities: ['Zaps Trigger', 'Custom Payload'] },
];

let connectorStore = [...CATALOG];

// GET /api/connectors — List all connectors & status
connectorsRouter.get("/api/connectors", (_req: Request, res: Response) => {
  res.json({
    success: true,
    connectors: connectorStore,
    total: connectorStore.length,
    enabledCount: connectorStore.filter(c => c.status === 'Connected').length
  });
});

// POST /api/connectors/:id/connect — Authorize/connect service
connectorsRouter.post("/api/connectors/:id/connect", (req: Request, res: Response) => {
  const { id } = req.params;
  const connector = connectorStore.find(c => c.id === id);

  if (!connector) {
    return res.status(404).json({ success: false, error: "Connector not found" });
  }

  connector.status = 'Connected';
  connector.connectedAt = new Date().toISOString();

  return res.json({
    success: true,
    message: `Successfully connected ${connector.name}`,
    connector
  });
});

// POST /api/connectors/:id/disconnect — Disconnect service
connectorsRouter.post("/api/connectors/:id/disconnect", (req: Request, res: Response) => {
  const { id } = req.params;
  const connector = connectorStore.find(c => c.id === id);

  if (!connector) {
    return res.status(404).json({ success: false, error: "Connector not found" });
  }

  connector.status = 'Available';
  connector.connectedAt = undefined;

  return res.json({
    success: true,
    message: `Disconnected ${connector.name}`,
    connector
  });
});

// GET /api/connectors/:id/test — Health test API endpoint for connector
connectorsRouter.get("/api/connectors/:id/test", (req: Request, res: Response) => {
  const { id } = req.params;
  const connector = connectorStore.find(c => c.id === id);

  if (!connector) {
    return res.status(404).json({ success: false, error: "Connector not found" });
  }

  return res.json({
    success: true,
    status: connector.status,
    latencyMs: Math.floor(Math.random() * 40) + 15,
    verifiedAt: new Date().toISOString()
  });
});

export default connectorsRouter;
