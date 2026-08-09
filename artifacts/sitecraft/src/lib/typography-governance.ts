export interface FontResolverOptions {
  role: 'heading' | 'body' | 'mono';
  projectFont?: string;
  weight?: 400 | 500 | 600 | 700;
}

export const ALLOWED_FONT_WEIGHTS = [400, 500, 600, 700];

export const PLATFORM_TYPOGRAPHY = {
  sans: '"Inter", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

/**
 * Universal Font Resolver
 * Guarantees valid fonts, allowed font weights, and clean fallback chains without Google Fonts leakage
 */
export function resolveFont({ role, projectFont, weight }: FontResolverOptions): { fontFamily: string; fontWeight: number } {
  const safeWeight = ALLOWED_FONT_WEIGHTS.includes(weight || 400) ? (weight || 400) : 400;

  if (role === 'mono') {
    return {
      fontFamily: PLATFORM_TYPOGRAPHY.mono,
      fontWeight: safeWeight,
    };
  }

  if (projectFont && projectFont.trim()) {
    return {
      fontFamily: `"${projectFont.replace(/"/g, '')}", ${PLATFORM_TYPOGRAPHY.sans}`,
      fontWeight: safeWeight,
    };
  }

  return {
    fontFamily: PLATFORM_TYPOGRAPHY.sans,
    fontWeight: safeWeight,
  };
}
