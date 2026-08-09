export interface Asset {
  id: string;
  name: string;
  category: 'images' | 'videos' | 'fonts' | 'icons' | 'documents';
  url: string;
  size: string;
  dimensions?: string;
  createdAt: string;
}

const INITIAL_ASSETS: Asset[] = [
  {
    id: 'ast-1',
    name: 'hero-architecture-bg.jpg',
    category: 'images',
    url: '/previews/lumina.jpg',
    size: '1.2 MB',
    dimensions: '3840 x 1920',
    createdAt: 'Aug 1, 2026',
  },
  {
    id: 'ast-2',
    name: 'analytics-dashboard-hero.jpg',
    category: 'images',
    url: '/previews/pulsar.jpg',
    size: '890 KB',
    dimensions: '1920 x 1080',
    createdAt: 'Aug 3, 2026',
  },
  {
    id: 'ast-3',
    name: 'esports-banner.jpg',
    category: 'images',
    url: '/previews/clout.jpg',
    size: '2.1 MB',
    dimensions: '3840 x 2160',
    createdAt: 'Aug 4, 2026',
  },
  {
    id: 'ast-4',
    name: 'headphones-spec.jpg',
    category: 'images',
    url: '/previews/sonora.jpg',
    size: '1.4 MB',
    dimensions: '2560 x 1440',
    createdAt: 'Aug 6, 2026',
  },
  {
    id: 'ast-5',
    name: 'studio-atelier.jpg',
    category: 'images',
    url: '/previews/nova.jpg',
    size: '950 KB',
    dimensions: '1920 x 1080',
    createdAt: 'Aug 7, 2026',
  },
  {
    id: 'ast-6',
    name: 'brand-logo-mark.svg',
    category: 'icons',
    url: '/public/favicon.svg',
    size: '4 KB',
    dimensions: '24 x 24',
    createdAt: 'Aug 2, 2026',
  },
  {
    id: 'ast-7',
    name: 'CabinetGrotesk-Bold.woff2',
    category: 'fonts',
    url: '#',
    size: '42 KB',
    createdAt: 'Aug 2, 2026',
  },
];

class AssetsService {
  private assets: Asset[] = [...INITIAL_ASSETS];

  getAssets(category?: Asset['category']): Asset[] {
    if (!category || category === ('all' as any)) return this.assets;
    return this.assets.filter(a => a.category === category);
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
