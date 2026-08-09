export interface AIProvider {
  id: string;
  name: string;
  brandColor: string;
  models: { id: string; name: string; description: string; contextWindow: string }[];
}

export const PROVIDER_REGISTRY: Record<string, AIProvider> = {
  google: {
    id: 'google',
    name: 'Google Gemini',
    brandColor: '#1A73E8',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Advanced multimodal reasoning & code synthesis', contextWindow: '2M tokens' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'High-speed low-latency assistant model', contextWindow: '1M tokens' },
    ],
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    brandColor: '#10A37F',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Flagship omni model for complex code refactoring', contextWindow: '128K tokens' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Lightweight fast chat & task assistant', contextWindow: '128K tokens' },
    ],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    brandColor: '#D97706',
    models: [
      { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Leading agentic coding & architectural model', contextWindow: '200K tokens' },
      { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Deep reasoning & complex technical writing', contextWindow: '200K tokens' },
    ],
  },
};

export interface WorkspaceAISettings {
  defaultProviderId: string;
  defaultModelId: string;
  connections: Record<string, { apiKeyMasked: string; status: 'Connected' | 'Not Configured' }>;
}

class ApiModelsService {
  private settings: WorkspaceAISettings = {
    defaultProviderId: 'google',
    defaultModelId: 'gemini-2.5-pro',
    connections: {
      google: { apiKeyMasked: '••••••••••••••••', status: 'Connected' },
      openai: { apiKeyMasked: '••••••••••••••••', status: 'Connected' },
      anthropic: { apiKeyMasked: '', status: 'Not Configured' },
    },
  };

  getSettings(): WorkspaceAISettings {
    return this.settings;
  }

  updateSettings(providerId: string, modelId: string, apiKey?: string) {
    this.settings.defaultProviderId = providerId;
    this.settings.defaultModelId = modelId;
    if (apiKey) {
      this.settings.connections[providerId] = {
        apiKeyMasked: '••••••••••••••••',
        status: 'Connected',
      };
    }
  }

  getAvailableModels(providerId: string) {
    return PROVIDER_REGISTRY[providerId]?.models || [];
  }
}

export const apiModelsService = new ApiModelsService();
