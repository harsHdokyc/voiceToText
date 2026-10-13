/**
 * Minimal Saydo UI primitives (Step 3). Not a full design-system package.
 */
import { type ReactNode, useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, radius, space, type } from '@/theme';

export type ButtonVariant =
  | 'cta'
  | 'ink'
  | 'lime'
  | 'quiet'
  | 'ghost'
  | 'destructive'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variantStyles: Record<
  ButtonVariant,
  { bg: string; fg: string; border?: string; rounded?: number }
> = {
  cta: { bg: colors.cobalt, fg: colors.card, rounded: radius.pill },
  ink: { bg: colors.ink, fg: colors.paper, rounded: radius.pill },
  lime: { bg: colors.lime, fg: colors.ink, rounded: radius.pill },
  quiet: {
    bg: 'transparent',
    fg: colors.ink,
    border: colors.border,
    rounded: radius.pill,
  },
  ghost: { bg: 'transparent', fg: colors.ink },
  destructive: { bg: colors.destructive, fg: colors.card },
  link: { bg: 'transparent', fg: colors.cobalt },
};

const sizeStyles: Record<
  ButtonSize,
  { minH: number; px: number; fontSize: number; icon: number }
> = {
  sm: { minH: 32, px: 12, fontSize: 12, icon: 32 },
  md: { minH: 40, px: 16, fontSize: 14, icon: 40 },
  lg: { minH: 44, px: 20, fontSize: 15, icon: 44 },
  xl: { minH: 52, px: 28, fontSize: 15, icon: 52 },
  icon: { minH: 40, px: 0, fontSize: 14, icon: 40 },
};

export function Button({
  variant = 'cta',
  size = 'md',
  children,
  onPress,
  disabled,
  style,
  textStyle,
  accessibilityLabel,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
}) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isIcon = size === 'icon';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          borderRadius: v.rounded ?? radius.md,
          minHeight: isIcon ? s.icon : s.minH,
          width: isIcon ? s.icon : undefined,
          paddingHorizontal: isIcon ? 0 : s.px,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          style={[
            styles.btnText,
            {
              color: v.fg,
              fontSize: s.fontSize,
              textDecorationLine: variant === 'link' ? 'underline' : 'none',
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function Eyebrow({
  children,
  style,
  color = colors.stone,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
}) {
  return (
    <Text style={[type.eyebrow, { color }, style]}>{children}</Text>
  );
}

export function TextField({
  style,
  className,
  ...props
}: TextInputProps & {
  style?: StyleProp<TextStyle>;
  /** Web: Saydo scrollbar / chrome (see saydo-web.css). */
  className?: string;
}) {
  return (
    <TextInput
      placeholderTextColor={colors.stone}
      {...props}
      // RN Web forwards className to the DOM node.
      {...(className ? ({ className } as object) : null)}
      style={[styles.field, style]}
    />
  );
}

export function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View style={styles.empty} accessibilityRole="text">
      <Text style={styles.emptyIcon}>inbox</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

/** Matches ui/goals-in-motion-55 VoiceRibbon exactly (Experience.tsx). */
const RIBBON_BARS = 52;
/** Cap bar width — flex-1 alone fattens bars on wide cobalt bands. */
const RIBBON_BAR_W = 2;

export function VoiceRibbon({
  live = true,
  color = colors.cobalt,
  compact = false,
}: {
  live?: boolean;
  color?: string;
  /** Shorter bars for tight surfaces (capture dialog on phone). */
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const desktop = width >= 768;
  // Prototype: h-16 / md:h-24 wrap; h-14 / md:h-20 bars
  const barH = compact ? 40 : desktop ? 80 : 56;
  const wrapH = compact ? 48 : desktop ? 96 : 64;

  return (
    <View
      style={[styles.ribbon, { height: wrapH }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: RIBBON_BARS }, (_, i) => (
        <RibbonBar
          key={i}
          index={i}
          live={!!live && !reduced}
          color={color}
          height={barH}
        />
      ))}
    </View>
  );
}

function RibbonBar({
  index,
  live,
  color,
  height,
}: {
  index: number;
  live: boolean;
  color: string;
  height: number;
}) {
  // Prototype keyframes: [0.15+(i%5)/10, 0.4+(i%7)/12, 0.15+(i%5)/10]
  const low = 0.15 + (index % 5) / 10;
  const high = 0.4 + (index % 7) / 12;
  const scale = useSharedValue(0.2);

  useEffect(() => {
    if (!live) {
      scale.value = 0.2;
      return;
    }
    // Prototype: duration 1.4, delay i*0.04, scaleY [low, high, low], repeat Infinity
    scale.value = low;
    scale.value = withDelay(
      index * 40,
      withRepeat(
        withSequence(
          withTiming(high, { duration: 700 }),
          withTiming(low, { duration: 700 }),
        ),
        -1,
        false,
      ),
    );
  }, [high, index, live, low, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.ribbonBar,
        { backgroundColor: color, height, width: RIBBON_BAR_W },
        anim,
      ]}
    />
  );
}

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View style={styles.sheetCard} accessibilityViewIsModal>
          <Text style={styles.sheetTitle}>{title}</Text>
          {description ? (
            <Text style={styles.sheetDesc}>{description}</Text>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  btnText: {
    fontFamily: fonts.sansMedium,
    fontWeight: '500',
  },
  field: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    paddingHorizontal: space[4],
    fontSize: 16,
    fontFamily: fonts.sans,
    color: colors.ink,
  },
  empty: {
    paddingVertical: space[10],
    alignItems: 'center',
  },
  emptyIcon: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.stone,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyTitle: {
    marginTop: space[5],
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
  },
  emptyBody: {
    marginTop: space[3],
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.stone,
    textAlign: 'center',
    paddingHorizontal: space[6],
  },
  ribbon: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  // Prototype bars are thin needles (~2px), not flex-grown slabs.
  ribbonBar: {
    borderRadius: 999,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: space[4],
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(23, 23, 23, 0.45)',
  },
  sheetCard: {
    maxHeight: '90%',
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: space[6],
    gap: space[3],
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
  },
  sheetDesc: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.stone,
    marginBottom: space[2],
  },
});
