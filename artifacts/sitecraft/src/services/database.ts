export interface DBTable {
  name: string;
  rowCount: number;
  columns: { name: string; type: string; isPrimary: boolean }[];
}

export interface DBConnection {
  provider: 'Zovaix DB' | 'Supabase' | 'PostgreSQL' | 'Firebase' | 'MongoDB' | null;
  status: 'connected' | 'disconnected';
  host?: string;
  tables: DBTable[];
}

class DatabaseService {
  private connections: Record<string, DBConnection> = {};

  getConnection(projectId: string): DBConnection {
    if (!this.connections[projectId]) {
      this.connections[projectId] = {
        provider: null,
        status: 'disconnected',
        tables: [],
      };
    }
    return this.connections[projectId];
  }

  connectProvider(projectId: string, provider: 'Zovaix DB' | 'Supabase' | 'PostgreSQL' | 'Firebase' | 'MongoDB'): DBConnection {
    this.connections[projectId] = {
      provider,
      status: 'connected',
      host: `${provider.toLowerCase().replace(/\s+/g, '')}.db.internal`,
      tables: [
        {
          name: 'users',
          rowCount: 1420,
          columns: [
            { name: 'id', type: 'uuid', isPrimary: true },
            { name: 'email', type: 'text', isPrimary: false },
            { name: 'created_at', type: 'timestamp', isPrimary: false },
          ],
        },
        {
          name: 'projects',
          rowCount: 42,
          columns: [
            { name: 'id', type: 'text', isPrimary: true },
            { name: 'name', type: 'text', isPrimary: false },
            { name: 'status', type: 'varchar(20)', isPrimary: false },
          ],
        },
      ],
    };
    return this.connections[projectId];
  }
}

export const databaseService = new DatabaseService();
