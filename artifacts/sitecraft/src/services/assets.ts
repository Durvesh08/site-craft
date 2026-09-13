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
      const url = projectId ? `/api/assets?projectId=${projectId}` : `/api/assets`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const files = Array.isArray(data) ? data : data.assets || data.files || [];
        const mapped: Asset[] = files.map((f: any) => {
            const name = f.name || `file-${f.id}`;
            let cat: Asset['category'] = 'documents';
            if (/\.(png|jpe?g|webp|gif)$/i.test(name)) cat = 'images';
            else if (/\.(mp4|webm)$/i.test(name)) cat = 'videos';
            else if (/\.(svg)$/i.test(name)) cat = 'icons';
            else if (/\.(woff2?|ttf)$/i.test(name)) cat = 'fonts';

            return {
              id: f.id,
              name,
              category: cat,
              url: f.url,
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

  async addUploadedAsset(file: any, projectId?: string): Promise<Asset | null> {
    try {
      const res = await fetch(`/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size || 0,
          url: file.url,
          projectId
        }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const newAsset: Asset = {
          id: data.id,
          name: data.name,
          category: 'images',
          url: data.url,
          size: data.size ? `${(data.size / 1024).toFixed(1)} KB` : '12 KB',
          createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Just now',
        };
        
        if (/\.(png|jpe?g|webp|gif)$/i.test(data.name)) newAsset.category = 'images';
        else if (/\.(mp4|webm)$/i.test(data.name)) newAsset.category = 'videos';
        else if (/\.(svg)$/i.test(data.name)) newAsset.category = 'icons';
        else if (/\.(woff2?|ttf)$/i.test(data.name)) newAsset.category = 'fonts';
        else newAsset.category = 'documents';

        this.assets.unshift(newAsset);
        return newAsset;
      }
    } catch {
      // Handle error
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        const idx = this.assets.findIndex(a => a.id === id);
        if (idx !== -1) {
          this.assets.splice(idx, 1);
        }
        return true;
      }
    } catch {
      // Handle error
    }
    return false;
  }
}

export const assetsService = new AssetsService();
