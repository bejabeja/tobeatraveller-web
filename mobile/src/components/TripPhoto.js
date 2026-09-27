import { Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../utils/styles';

// A trip's photo or, without one, the brand gradient: never an empty box or
// an image fetched from somewhere else.
const TripPhoto = ({ uri, style }) => (uri
  ? <Image source={{ uri }} style={style} resizeMode="cover" />
  : <LinearGradient colors={[COLORS.accent, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style} />
);

export default TripPhoto;
