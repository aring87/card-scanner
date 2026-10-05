export const colors = {
  background: '#0B0E13',
  surface: '#151A22',
  surfaceRaised: '#1D2430',
  border: '#2A3342',
  text: '#F2F5F9',
  textMuted: '#9AA6B8',
  textSubtle: '#6B778A',
  primary: '#3B82F6',
  primaryPressed: '#2563EB',
  onPrimary: '#FFFFFF',
  accent: '#F5C451',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  overlay: 'rgba(0, 0, 0, 0.55)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  title: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
  heading: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  subheading: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textMuted, letterSpacing: 0.4 },
  caption: { fontSize: 13, color: colors.textMuted },
};

/** Standard trading card: 2.5in × 3.5in. */
export const CARD_ASPECT_RATIO = 2.5 / 3.5;

/** Below this best-match confidence the UI presents the result as uncertain. */
export const CONFIDENT_MATCH_THRESHOLD = 0.75;
