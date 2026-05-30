import { Platform } from 'react-native';

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

export const shadow = (offsetY, opacity, radius, elevation) =>
  Platform.select({
    web: { boxShadow: `0px ${offsetY}px ${radius}px rgba(0,0,0,${opacity})` },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  });

export const textShadow = (offsetY, opacity, radius) =>
  Platform.select({
    web: { textShadow: `0px ${offsetY}px ${radius}px rgba(0,0,0,${opacity})` },
    default: {
      textShadowColor: `rgba(0,0,0,${opacity})`,
      textShadowOffset: { width: 0, height: offsetY },
      textShadowRadius: radius,
    },
  });
