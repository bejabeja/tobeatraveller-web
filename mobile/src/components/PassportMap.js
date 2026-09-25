import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { MAP_COUNTRY_STATES, passportMap } from '@tobeatraveller/shared';

// Same colours as the web map (client/src/components/passport/PassportMap.scss).
const LAND = '#e7ddc8';
const GOLD = '#d9a441';
const GOLD_LIGHT = '#ecd08f';
const PAPER = '#fbf6ec';
const NAVY = '#1b2a41';
const INK_MUTED = '#8a8172';
const BORDER_WIDTH = 0.4;
const DECLARED_BORDER_WIDTH = 0.8;
const DECLARED_DASH = '2,1.5';
const DOT_RADIUS = 3;

const FILL = {
  [MAP_COUNTRY_STATES.VISITED]: GOLD,
  [MAP_COUNTRY_STATES.PRIVATE]: GOLD_LIGHT,
  [MAP_COUNTRY_STATES.DECLARED]: PAPER,
};
const LEGEND = [
  { state: MAP_COUNTRY_STATES.VISITED, labelKey: 'passport.mapVisited' },
  { state: MAP_COUNTRY_STATES.PRIVATE, labelKey: 'passport.mapPrivate' },
  { state: MAP_COUNTRY_STATES.DECLARED, labelKey: 'passport.mapDeclared' },
];

const countryStroke = (state) => (state === MAP_COUNTRY_STATES.DECLARED
  ? { stroke: GOLD, strokeWidth: DECLARED_BORDER_WIDTH, strokeDasharray: DECLARED_DASH }
  : { stroke: PAPER, strokeWidth: BORDER_WIDTH });

// The world with the passport's countries painted in, as on the web. The
// list of country stamps says the same in text, so for screen readers the
// map is a single image with how many are painted.
const PassportMap = ({ passport }) => {
  const { t } = useTranslation();
  const map = useMemo(() => passportMap(passport), [passport]);
  const painted = map.countries.filter(country => country.state);
  const states = new Set(painted.map(country => country.state));

  return (
    <View style={styles.container}>
      <View accessible accessibilityRole="image" accessibilityLabel={t('passport.mapLabel', { count: painted.length })}>
        <Svg width="100%" style={{ aspectRatio: map.width / map.height }} viewBox={`0 0 ${map.width} ${map.height}`}>
          {map.countries.map(({ code, d, state }) => d && (
            <Path key={code} testID={`map-country-${code}`} d={d} fill={FILL[state] ?? LAND} {...countryStroke(state)} />
          ))}
          {painted.filter(country => country.dot).map(({ code, dot, state }) => (
            <Circle
              key={`${code}-dot`}
              testID={`map-dot-${code}`}
              cx={dot[0]}
              cy={dot[1]}
              r={DOT_RADIUS}
              fill={FILL[state]}
              stroke={NAVY}
              strokeWidth={DECLARED_BORDER_WIDTH}
            />
          ))}
        </Svg>
      </View>
      {states.size > 0 && (
        <View style={styles.legend}>
          {LEGEND.filter(({ state }) => states.has(state)).map(({ state, labelKey }) => (
            <View key={state} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: FILL[state] }, state === MAP_COUNTRY_STATES.DECLARED && styles.swatchDeclared]} />
              <Text style={styles.legendText}>{t(labelKey)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 6, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 11, height: 11, borderRadius: 3 },
  swatchDeclared: { borderWidth: 1, borderStyle: 'dashed', borderColor: GOLD },
  legendText: { fontSize: 12, color: INK_MUTED },
});

// Hundreds of outlines: redrawn only when the passport changes, not on
// every change elsewhere on the screen (opening a sheet, a dialog...).
export default memo(PassportMap);
