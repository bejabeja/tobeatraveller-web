import { Platform } from 'react-native';

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
