export interface SecretItem {
  id: string;
  key: string;
  environment: 'Development' | 'Preview' | 'Production';
  status: 'configured' | 'missing';
  updatedAt: string;
}

const INITIAL_SECRETS: Record<string, SecretItem[]> = {
  lumina: [
    { id: 'sec-1', key: 'OPENAI_API_KEY', environment: 'Production', status: 'configured', updatedAt: '2 days ago' },
    { id: 'sec-2', key: 'STRIPE_SECRET_KEY', environment: 'Production', status: 'configured', updatedAt: '1 week ago' },
    { id: 'sec-3', key: 'DATABASE_URL', environment: 'Production', status: 'configured', updatedAt: 'Aug 1, 2026' },
  ],
};

class SecretsService {
  private secretsByProject: Record<string, SecretItem[]> = { ...INITIAL_SECRETS };

  getSecrets(projectId: string): SecretItem[] {
    if (!this.secretsByProject[projectId]) {
      this.secretsByProject[projectId] = [
        { id: `sec-${Date.now()}-1`, key: 'VITE_APP_URL', environment: 'Production', status: 'configured', updatedAt: 'Just now' },
      ];
    }
    return this.secretsByProject[projectId];
  }

  addSecret(projectId: string, key: string, environment: SecretItem['environment']): SecretItem {
    const list = this.getSecrets(projectId);
    const item: SecretItem = {
      id: `sec-${Date.now()}`,
      key: key.toUpperCase().replace(/[^A_Z0-9_]/g, '_'),
      environment,
      status: 'configured',
      updatedAt: 'Just now',
    };
    list.unshift(item);
    return item;
  }

  deleteSecret(projectId: string, id: string): boolean {
    const list = this.getSecrets(projectId);
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const secretsService = new SecretsService();
