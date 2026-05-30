export const COLORS = {
  primary:     '#E8743B',
  primaryDark: '#C45A22',
  accent:      '#1A535C',
  accentDark:  '#0C3540',
  bg:          '#FFF8F3',
  bgLight:     '#FFF0E8',
  text:        '#1C1C1E',
  textSub:     '#6B6B6B',
  border:      '#E5E7EB',
};

// CSS custom property names → COLORS key mapping
// Used by web client to inject CSS variables from shared
export const CSS_VAR_MAP = {
  '--primary-color':       'primary',
  '--primary-color-hover': 'primaryDark',
  '--accent-color':        'accent',
  '--accent-color-dark':   'accentDark',
  '--primary-light':       'bgLight',
};
