import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { APP_NAME } from '@/lib/constants';
import { colors, fonts, space } from '@/theme';

const markSource = require('../../assets/brand/saydo-mark.png');

/** Primary Saydo mark (lime mic badge). */
export function SaydoMark({
  size = 36,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={markSource}
      accessibilityLabel={APP_NAME}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
    />
  );
}

/** Mark + wordmark row used in chrome. */
export function SaydoWordmark({
  markSize = 36,
  color = colors.ink,
  showName = true,
  style,
  nameStyle,
}: {
  markSize?: number;
  color?: string;
  showName?: boolean;
  style?: StyleProp<ViewStyle>;
  nameStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.row, style]}>
      <SaydoMark size={markSize} />
      {showName ? (
        <Text style={[styles.name, { color }, nameStyle]}>{APP_NAME}</Text>
      ) : null}
    </View>
  );
}

export function SaydoBrandLockup({
  children,
  markSize = 36,
  color = colors.ink,
}: {
  children?: ReactNode;
  markSize?: number;
  color?: string;
}) {
  return (
    <View style={styles.row}>
      <SaydoMark size={markSize} />
      {children ?? (
        <Text style={[styles.name, { color }]}>{APP_NAME}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2] + 2,
  },
  name: {
    fontFamily: fonts.displaySemibold,
    fontSize: 22,
    letterSpacing: -0.3,
  },
});
