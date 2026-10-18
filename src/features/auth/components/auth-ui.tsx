import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';

import { Eyebrow, TextField } from '@/components/ui';
import { APP_NAME } from '@/lib/constants';
import { colors, fonts, radius, space } from '@/theme';

const WIDE = 900;

export function AuthScreen({
  eyebrow = 'Your next chapter',
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;

  return (
    <View style={[styles.root, wide && styles.rootWide]}>
      {wide ? (
        <View style={styles.inkPanel} accessibilityElementsHidden>
          <Text style={styles.inkWordmark}>{APP_NAME}</Text>
          <Text style={styles.inkTagline}>
            Good thoughts.{'\n'}
            <Text style={styles.inkAccent}>Clearer next steps.</Text>
          </Text>
        </View>
      ) : null}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Eyebrow color={colors.cobalt}>{eyebrow}</Eyebrow>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
    </View>
  );
}

export function AuthField(props: TextInputProps) {
  return <TextField {...props} style={[styles.field, props.style]} />;
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
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        busy && styles.disabled,
        pressed && !busy ? { opacity: 0.9 } : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isGhost ? colors.cobalt : colors.card} />
      ) : (
        <Text style={[styles.buttonText, isGhost && styles.ghostText]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Text style={styles.message} accessibilityRole="alert">
      {children}
    </Text>
  );
}

export function AuthLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} style={styles.link}>
      {label}
    </Link>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  rootWide: { flexDirection: 'row' },
  inkPanel: {
    width: '42%',
    maxWidth: 420,
    backgroundColor: colors.ink,
    padding: space[10],
    justifyContent: 'flex-end',
    gap: space[4],
  },
  inkWordmark: {
    fontFamily: fonts.displaySemibold,
    fontSize: 28,
    color: colors.lime,
  },
  inkTagline: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 40,
    color: colors.paper,
  },
  inkAccent: {
    fontFamily: fonts.sansItalic,
    color: colors.lime,
  },
  formScroll: { flex: 1 },
  form: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: space[6],
    gap: space[3],
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.ink,
    marginBottom: space[1],
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.stone,
    marginBottom: space[2],
  },
  field: { minHeight: 48 },
  button: {
    backgroundColor: colors.cobalt,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: space[6],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: space[2],
  },
  secondary: { backgroundColor: colors.cobaltDeep },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: { opacity: 0.55 },
  buttonText: {
    fontFamily: fonts.sansMedium,
    color: colors.card,
    fontSize: 15,
  },
  ghostText: { color: colors.ink },
  message: {
    fontFamily: fonts.sans,
    color: colors.destructive,
    fontSize: 14,
  },
  link: {
    fontFamily: fonts.sansMedium,
    color: colors.cobalt,
    textAlign: 'center',
    paddingVertical: space[2],
    minHeight: 44,
  },
});
