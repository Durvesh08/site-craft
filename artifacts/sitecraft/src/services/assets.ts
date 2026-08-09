export interface Asset {
  id: string;
  name: string;
  category: 'images' | 'videos' | 'fonts' | 'icons' | 'documents';
  url: string;
  size: string;
  dimensions?: string;
  createdAt: string;
}

class AssetsService {
  private assets: Asset[] = [];

  async fetchAssets(projectId?: string): Promise<Asset[]> {
    try {
      const url = projectId ? `/api/projects/${projectId}/files` : `/api/storage/objects`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const files = Array.isArray(data) ? data : data.files || [];
        const mapped: Asset[] = files
          .filter((f: any) => {
            const name = (f.name || f.path || "").toLowerCase();
            return /\.(png|jpe?g|webp|gif|svg|mp4|webm|woff2?|ttf|pdf|doc|docx)$/i.test(name);
          })
          .map((f: any, idx: number) => {
            const name = f.name || f.path || `file-${idx}`;
            let cat: Asset['category'] = 'documents';
            if (/\.(png|jpe?g|webp|gif)$/i.test(name)) cat = 'images';
            else if (/\.(mp4|webm)$/i.test(name)) cat = 'videos';
            else if (/\.(svg)$/i.test(name)) cat = 'icons';
            else if (/\.(woff2?|ttf)$/i.test(name)) cat = 'fonts';

            return {
              id: f.id || `ast-${idx}`,
              name,
              category: cat,
              url: f.url || (f.content ? `data:image/svg+xml;utf8,${encodeURIComponent(f.content)}` : `/api/storage/objects/${name}`),
              size: f.size ? `${(f.size / 1024).toFixed(1)} KB` : '12 KB',
              createdAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'Just now',
            };
          });
        this.assets = mapped;
      }
    } catch {
      // Keep current assets state
    }
    return this.assets;
  }

  getAssets(category?: Asset['category']): Asset[] {
    if (!category || category === ('all' as any)) return this.assets;
    return this.assets.filter(a => a.category === category);
  }

  addUploadedAsset(url: string, name: string, category: Asset['category'] = 'images'): Asset {
    const newAsset: Asset = {
      id: `ast-${Date.now()}`,
      name,
      category,
      url,
      size: '120 KB',
      createdAt: 'Just now',
    };
    this.assets.unshift(newAsset);
    return newAsset;
  }

  delete(id: string): boolean {
    const idx = this.assets.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.assets.splice(idx, 1);
      return true;
    }
    return false;
  }
}

export const assetsService = new AssetsService();
