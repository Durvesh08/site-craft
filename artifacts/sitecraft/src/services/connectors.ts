export interface Connector {
  id: string;
  name: string;
  description: string;
  category: 'AI' | 'Payments' | 'Database' | 'Analytics' | 'Communication' | 'Marketing' | 'Commerce' | 'Storage' | 'Developer' | 'Productivity' | 'Automation' | 'Design';
  icon: string; // Lucide icon name or emoji
  status: 'connected' | 'disconnected' | 'configuring';
  docsUrl?: string;
}

const CATALOG: Connector[] = [
  // AI
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o, DALL-E & Embeddings models', category: 'AI', icon: 'Sparkles', status: 'connected' },
  { id: 'gemini', name: 'Google Gemini', description: 'Multimodal Gemini 1.5 Pro & Flash APIs', category: 'AI', icon: 'Zap', status: 'connected' },
  { id: 'anthropic', name: 'Anthropic Claude', description: 'Claude 3.5 Sonnet & Opus text models', category: 'AI', icon: 'Cpu', status: 'disconnected' },
  { id: 'elevenlabs', name: 'ElevenLabs', description: 'Realistic AI voice synthesis and audio', category: 'AI', icon: 'Mic', status: 'disconnected' },
  
  // Payments
  { id: 'stripe', name: 'Stripe', description: 'Global subscription billing & checkout', category: 'Payments', icon: 'CreditCard', status: 'connected' },
  { id: 'paddle', name: 'Paddle', description: 'Merchant of record SaaS payments', category: 'Payments', icon: 'DollarSign', status: 'disconnected' },
  { id: 'razorpay', name: 'Razorpay', description: 'India & SEA digital payment gateway', category: 'Payments', icon: 'Wallet', status: 'disconnected' },
  
  // Database & Storage
  { id: 'supabase', name: 'Supabase', description: 'Open-source Postgres with Realtime & Auth', category: 'Database', icon: 'Database', status: 'connected' },
  { id: 'firebase', name: 'Firebase', description: 'Firestore, Storage & Authentication', category: 'Database', icon: 'Flame', status: 'disconnected' },
  { id: 'postgresql', name: 'PostgreSQL', description: 'Direct relational database connection', category: 'Database', icon: 'Server', status: 'disconnected' },
  { id: 'mongodb', name: 'MongoDB Atlas', description: 'NoSQL document cloud database', category: 'Database', icon: 'HardDrive', status: 'disconnected' },
  
  // Commerce
  { id: 'shopify', name: 'Shopify Storefront', description: 'Products, cart, and storefront API', category: 'Commerce', icon: 'ShoppingBag', status: 'disconnected' },

  // Communication & Marketing
  { id: 'resend', name: 'Resend', description: 'Transactional emails for developers', category: 'Communication', icon: 'Mail', status: 'connected' },
  { id: 'slack', name: 'Slack', description: 'Channel notifications & bot webhooks', category: 'Communication', icon: 'MessageSquare', status: 'disconnected' },
  { id: 'discord', name: 'Discord', description: 'Bot triggers & community integration', category: 'Communication', icon: 'Headphones', status: 'disconnected' },
  { id: 'telegram', name: 'Telegram Bot', description: 'Instant messaging notifications', category: 'Communication', icon: 'Send', status: 'disconnected' },
  { id: 'twilio', name: 'Twilio SMS', description: 'SMS authentication & phone alerts', category: 'Communication', icon: 'Phone', status: 'disconnected' },

  // Analytics
  { id: 'google-analytics', name: 'Google Analytics 4', description: 'Global web traffic and conversion tracking', category: 'Analytics', icon: 'BarChart2', status: 'connected' },
  { id: 'posthog', name: 'PostHog', description: 'Product analytics, feature flags & session recording', category: 'Analytics', icon: 'Activity', status: 'disconnected' },
  { id: 'mixpanel', name: 'Mixpanel', description: 'Funnel analysis and event tracking', category: 'Analytics', icon: 'PieChart', status: 'disconnected' },
  { id: 'google-ads', name: 'Google Ads', description: 'Conversion tracking pixel', category: 'Marketing', icon: 'Target', status: 'disconnected' },
  { id: 'hubspot', name: 'HubSpot CRM', description: 'Lead capture & contact synchronization', category: 'Marketing', icon: 'Users', status: 'disconnected' },

  // Developer & Productivity
  { id: 'github', name: 'GitHub', description: 'Code repositories & GitHub Actions CI', category: 'Developer', icon: 'GitBranch', status: 'connected' },
  { id: 'gitlab', name: 'GitLab', description: 'DevOps & Git repository hosting', category: 'Developer', icon: 'Code', status: 'disconnected' },
  { id: 'linear', name: 'Linear', description: 'Issue tracking & project roadmap sync', category: 'Productivity', icon: 'CheckSquare', status: 'disconnected' },
  { id: 'sentry', name: 'Sentry', description: 'Real-time error logging & crash reporting', category: 'Developer', icon: 'ShieldAlert', status: 'disconnected' },
  { id: 'notion', name: 'Notion', description: 'Sync content from Notion databases', category: 'Productivity', icon: 'FileText', status: 'disconnected' },
  { id: 'gdrive', name: 'Google Drive', description: 'Asset sync & document import', category: 'Storage', icon: 'Folder', status: 'disconnected' },
  { id: 'airtable', name: 'Airtable', description: 'Relational spreadsheet API', category: 'Database', icon: 'Grid', status: 'disconnected' },
  { id: 'figma', name: 'Figma', description: 'Design tokens & asset sync', category: 'Design', icon: 'Figma', status: 'disconnected' },

  // Automation
  { id: 'zapier', name: 'Zapier', description: '5,000+ app workflow webhooks', category: 'Automation', icon: 'Workflow', status: 'disconnected' },
  { id: 'make', name: 'Make / Integromat', description: 'Visual automation scenarios', category: 'Automation', icon: 'Repeat', status: 'disconnected' },
];

class ConnectorsService {
  private connectors: Connector[] = [...CATALOG];

  getAll(category?: string): Connector[] {
    if (!category || category === 'All') return this.connectors;
    return this.connectors.filter(c => c.category === category);
  }

  toggleConnection(id: string): Connector | undefined {
    const conn = this.connectors.find(c => c.id === id);
    if (conn) {
      conn.status = conn.status === 'connected' ? 'disconnected' : 'connected';
    }
    return conn;
  }
}

export const connectorsService = new ConnectorsService();
