import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';

import { SaydoMark } from '@/components/saydo-mark';
import { Eyebrow, TextField, VoiceRibbon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { colors } from '@/theme';

const WIDE = 900;

export function AuthScreen({
  eyebrow = 'Your next chapter',
  title,
  subtitle,
  children,
  tabs,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
  /** Optional Sign in / Sign up tab row under the subtitle. */
  tabs?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  return (
    <View
      className={cn(
        'flex-1 bg-paper',
        wide && 'flex-row items-stretch gap-10 p-6',
      )}
    >
      {wide ? <AuthBrandPanel /> : null}
      <ScrollView
        className="flex-1"
        contentContainerClassName="w-full max-w-md flex-grow items-center justify-center gap-3 self-center px-6 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <Eyebrow color={colors.cobalt}>{eyebrow}</Eyebrow>
        <Text className="mb-1 font-display text-[40px] leading-[46px] text-ink">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mb-2 font-sans text-[15px] text-stone">{subtitle}</Text>
        ) : null}
        {tabs}
        {children}
      </ScrollView>
    </View>
  );
}

/** Left feature card — matches marketing SignInPage brand panel. */
export function AuthBrandPanel() {
  return (
    <View
      className="min-h-[640px] max-w-[560px] flex-1 justify-between overflow-hidden rounded-xl bg-ink p-10"
      accessibilityElementsHidden
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <SaydoMark size={34} />
          <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-lime">
            Said → sorted
          </Text>
        </View>
        <Text
          className="font-sans-medium text-xl leading-[22px] text-lime"
          accessibilityElementsHidden
        >
          ↗
        </Text>
      </View>

      <View className="gap-6 py-8">
        <Text className="font-display text-[48px] leading-[52px] text-paper">
          Good thoughts.{'\n'}
          Clearer <Text className="font-sans-italic text-lime">next steps.</Text>
        </Text>
        <View className="mt-2">
          <VoiceRibbon live color={colors.lime} />
        </View>
        <View
          className="rounded-lg bg-lavender p-6"
          style={{ transform: [{ rotate: '-2deg' }] }}
        >
          <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-ink/55">
            From your voice note
          </Text>
          <Text className="mt-4 font-display text-[22px] leading-[30px] text-ink">
            “Send the revised proposal to Maya by Thursday.”
          </Text>
          <View className="mt-6 flex-row items-center justify-between border-t border-ink/15 pt-4">
            <Text className="font-sans text-sm text-ink">One clear next step.</Text>
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark" size={16} color={colors.ink} />
              <Text className="font-sans text-sm text-ink">Approved</Text>
            </View>
          </View>
        </View>
      </View>

      <Text className="font-mono text-[11px] uppercase tracking-[1.5px] text-paper/55">
        AI proposes. You decide.
      </Text>
    </View>
  );
}

export function AuthTabs({ active }: { active: 'signin' | 'signup' }) {
  return (
    <View className="mb-2 flex-row border-b border-border">
      <Link
        href="/(auth)/sign-in"
        className={cn(
          'min-h-[48px] flex-1 items-center justify-center border-b-2',
          active === 'signin' ? 'border-cobalt' : 'border-transparent',
        )}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'signin' }}
      >
        <Text
          className={cn(
            'font-sans-medium text-[15px]',
            active === 'signin' ? 'text-cobalt' : 'text-stone',
          )}
        >
          Sign in
        </Text>
      </Link>
      <Link
        href="/(auth)/sign-up"
        className={cn(
          'min-h-[48px] flex-1 items-center justify-center border-b-2',
          active === 'signup' ? 'border-cobalt' : 'border-transparent',
        )}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'signup' }}
      >
        <Text
          className={cn(
            'font-sans-medium text-[15px]',
            active === 'signup' ? 'text-cobalt' : 'text-stone',
          )}
        >
          Sign up
        </Text>
      </Link>
    </View>
  );
}

export function AuthLabeledField({
  label,
  trailing,
  ...props
}: TextInputProps & {
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="mt-1 gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-sans text-sm text-ink">{label}</Text>
        {trailing}
      </View>
      <AuthField {...props} />
    </View>
  );
}

export function AuthPasswordField({
  label = 'Password',
  trailing,
  ...props
}: TextInputProps & {
  label?: string;
  trailing?: ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <View className="mt-1 gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="font-sans text-sm text-ink">{label}</Text>
        {trailing}
      </View>
      <View className="relative justify-center">
        <AuthField
          {...props}
          secureTextEntry={!show}
          className="pr-12"
          style={props.style}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          hitSlop={8}
          onPress={() => setShow((v) => !v)}
          className="absolute right-2 h-11 w-11 items-center justify-center"
        >
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.stone}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function AuthField({
  className,
  style,
  ...props
}: TextInputProps & { className?: string }) {
  return (
    <TextField
      {...props}
      style={style}
      className={cn('min-h-[52px]', className)}
    />
  );
}

export function AuthButton({
  label,
  onPress,
  busy,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}) {
  const isGhost = variant === 'ghost';
  const isSecondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      hitSlop={8}
      className={cn(
        'mt-2 min-h-[52px] items-center justify-center rounded-pill px-6 py-3.5',
        isGhost
          ? 'border border-border bg-transparent'
          : isSecondary
            ? 'bg-cobalt-deep'
            : 'bg-cobalt',
        busy && 'opacity-55',
        !busy && 'active:opacity-90',
      )}
    >
      {busy ? (
        <ActivityIndicator color={isGhost ? colors.cobalt : colors.card} />
      ) : (
        <Text
          className={cn(
            'font-sans-medium text-[15px]',
            isGhost ? 'text-ink' : 'text-card',
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text className="font-sans text-sm text-destructive" accessibilityRole="alert">
      {children}
    </Text>
  );
}

export function AuthLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link
      href={href}
      className="min-h-[44px] py-2 text-center font-sans-medium text-cobalt"
    >
      {label}
    </Link>
  );
}

/** Inline link beside field labels (e.g. Forgot password). */
export const authInlineLinkClassName =
  'min-h-[44px] py-2.5 text-center font-sans-medium text-sm text-cobalt';
