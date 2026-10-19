/**
 * Minimal Saydo UI primitives — NativeWind / Tailwind className styling.
 */
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
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

import { cn } from '@/lib/cn';
import { colors, layout } from '@/theme';

export type ButtonVariant =
  | 'cta'
  | 'ink'
  | 'lime'
  | 'quiet'
  | 'ghost'
  | 'destructive'
  | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variantClass: Record<ButtonVariant, string> = {
  cta: 'bg-cobalt rounded-pill',
  ink: 'bg-ink rounded-pill',
  lime: 'bg-lime rounded-pill',
  quiet: 'bg-transparent border border-border rounded-pill',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive rounded-md',
  link: 'bg-transparent',
};

const variantTextClass: Record<ButtonVariant, string> = {
  cta: 'text-card',
  ink: 'text-paper',
  lime: 'text-ink',
  quiet: 'text-ink',
  ghost: 'text-ink',
  destructive: 'text-card',
  link: 'text-cobalt underline',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3',
  md: 'min-h-10 px-4',
  lg: 'min-h-11 px-5',
  xl: 'min-h-[52px] px-7',
  icon: 'h-10 w-10 px-0',
};

const sizeTextClass: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-[15px]',
  xl: 'text-[15px]',
  icon: 'text-sm',
};

export function Button({
  variant = 'cta',
  size = 'md',
  children,
  onPress,
  disabled,
  style,
  className,
  textStyle,
  textClassName,
  accessibilityLabel,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
  textStyle?: StyleProp<TextStyle>;
  textClassName?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center gap-2 active:opacity-90',
        variantClass[variant],
        sizeClass[size],
        disabled && 'opacity-50',
        className,
      )}
      style={style}
    >
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text
          className={cn(
            'font-sans-medium font-medium',
            variantTextClass[variant],
            sizeTextClass[size],
            textClassName,
          )}
          style={textStyle}
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
  className,
  color = colors.stone,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  className?: string;
  color?: string;
}) {
  return (
    <Text
      className={cn(
        'font-mono text-[11px] uppercase tracking-[1.5px]',
        className,
      )}
      style={[{ color }, style]}
    >
      {children}
    </Text>
  );
}

export function TextField({
  style,
  className,
  ...props
}: TextInputProps & {
  style?: StyleProp<TextStyle>;
  className?: string;
}) {
  return (
    <TextInput
      placeholderTextColor={colors.stone}
      {...props}
      className={cn(
        'w-full min-h-[52px] rounded-[14px] border border-input bg-card px-4 text-base font-sans text-ink',
        className,
      )}
      style={style}
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
    <View className="items-center py-10" accessibilityRole="text">
      <Text className="font-mono text-xs uppercase tracking-wide text-stone">
        inbox
      </Text>
      <Text className="mt-5 font-display text-2xl text-ink">{title}</Text>
      <Text className="mt-3 px-6 text-center font-sans text-sm text-stone">
        {body}
      </Text>
    </View>
  );
}

/** Matches ui/goals-in-motion-55 VoiceRibbon (Experience.tsx): flex-1 equal bars + beat. */
const RIBBON_BARS = 52;

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
  const desktop = width >= layout.desktopMin;
  // Prototype: h-16 / md:h-24 wrap; h-14 / md:h-20 bars; gap-1 / md:gap-1.5
  const barH = compact ? 40 : desktop ? 80 : 56;
  const wrapH = compact ? 48 : desktop ? 96 : 64;
  const gap = compact ? 3 : desktop ? 6 : 4;

  // Layout + Reanimated must use `style` — NativeWind className on
  // Animated.View drops flex widths, so bars vanish on web/native.
  return (
    <View
      style={{
        width: '100%',
        minWidth: 0,
        height: wrapH,
        gap,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
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
  const scale = useSharedValue(live ? low : 0.2);

  useEffect(() => {
    if (!live) {
      scale.value = 0.2;
      return;
    }
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
        {
          flex: 1,
          minWidth: 0,
          borderRadius: 999,
          backgroundColor: color,
          height,
        },
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
      <View className="flex-1 items-center justify-center p-4">
        <Pressable
          className="absolute inset-0 bg-ink/55"
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />
        <View
          className="max-h-[90%] w-full max-w-lg rounded-xl border border-border bg-paper px-6 pb-6 pt-6 shadow-lg"
          accessibilityViewIsModal
        >
          <Pressable
            onPress={onClose}
            hitSlop={12}
            className="absolute right-4 top-4 z-[2] h-8 w-8 items-center justify-center rounded-sm"
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={18} color={colors.stone} />
          </Pressable>
          <Text className="pr-8 font-display text-[28px] font-medium text-ink">
            {title}
          </Text>
          {description ? (
            <Text className="mt-2 font-sans text-sm leading-5 text-stone">
              {description}
            </Text>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="mt-5 gap-4 pb-2"
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
