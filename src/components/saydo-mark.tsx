import {
  Image,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { APP_NAME } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

const markSource = require('../../assets/brand/saydo-mark.png');

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

export function SaydoWordmark({
  markSize = 36,
  color = colors.ink,
  showName = true,
  style,
  className,
  nameStyle,
  nameClassName,
}: {
  markSize?: number;
  color?: string;
  showName?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  nameStyle?: StyleProp<TextStyle>;
  nameClassName?: string;
}) {
  return (
    <View className={cn('flex-row items-center gap-[10px]', className)} style={style}>
      <SaydoMark size={markSize} />
      {showName ? (
        <Text
          className={cn(
            'font-display-semibold text-[22px] tracking-[-0.3px]',
            nameClassName,
          )}
          style={[{ color }, nameStyle]}
        >
          {APP_NAME}
        </Text>
      ) : null}
    </View>
  );
}
