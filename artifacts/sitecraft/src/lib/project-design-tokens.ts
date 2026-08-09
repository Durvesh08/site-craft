export interface ProjectDesignSystem {
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  colorPrimary: string;
  radiusCard: string;
  spaceUnit: string;
}

export const DEFAULT_PROJECT_TOKENS: ProjectDesignSystem = {
  fontHeading: 'var(--platform-font-sans)',
  fontBody: 'var(--platform-font-sans)',
  fontMono: 'var(--platform-font-mono)',
  colorPrimary: 'var(--platform-accent)',
  radiusCard: 'var(--radius-lg)',
  spaceUnit: '8px',
};

/**
 * Returns clean CSS variable object for generated website design systems
 */
export function getProjectTokenVariables(customTokens?: Partial<ProjectDesignSystem>): Record<string, string> {
  const merged = { ...DEFAULT_PROJECT_TOKENS, ...customTokens };
  return {
    '--font-heading': merged.fontHeading,
    '--font-body': merged.fontBody,
    '--font-mono': merged.fontMono,
    '--color-primary': merged.colorPrimary,
    '--radius-card': merged.radiusCard,
    '--space-unit': merged.spaceUnit,
  };
}
