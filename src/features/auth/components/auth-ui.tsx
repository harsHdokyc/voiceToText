import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
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

import { SaydoMark } from '@/components/saydo-mark';
import { Eyebrow, TextField, VoiceRibbon } from '@/components/ui';
import { colors, fonts, radius, space } from '@/theme';

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
    <View style={[styles.root, wide && styles.rootWide]}>
      {wide ? <AuthBrandPanel /> : null}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Eyebrow color={colors.cobalt}>{eyebrow}</Eyebrow>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {tabs}
        {children}
      </ScrollView>
    </View>
  );
}

/** Left feature card — matches marketing SignInPage brand panel. */
export function AuthBrandPanel() {
  return (
    <View style={styles.inkPanel} accessibilityElementsHidden>
      <View style={styles.inkTop}>
        <View style={styles.inkBrand}>
          <SaydoMark size={34} />
          <Text style={styles.inkEyebrow}>Said → sorted</Text>
        </View>
        <Text style={styles.inkArrow} accessibilityElementsHidden>
          ↗
        </Text>
      </View>

      <View style={styles.inkMid}>
        <Text style={styles.inkHeadline}>
          Good thoughts.{'\n'}
          Clearer <Text style={styles.inkAccent}>next steps.</Text>
        </Text>
        <View style={styles.ribbonWrap}>
          <VoiceRibbon live color={colors.lime} />
        </View>
        <View style={styles.quoteCard}>
          <Text style={styles.quoteEyebrow}>From your voice note</Text>
          <Text style={styles.quoteBody}>
            “Send the revised proposal to Maya by Thursday.”
          </Text>
          <View style={styles.quoteFooter}>
            <Text style={styles.quoteMeta}>One clear next step.</Text>
            <View style={styles.quoteApproved}>
              <Ionicons name="checkmark" size={16} color={colors.ink} />
              <Text style={styles.quoteMeta}>Approved</Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.inkFooter}>AI proposes. You decide.</Text>
    </View>
  );
}

export function AuthTabs({ active }: { active: 'signin' | 'signup' }) {
  return (
    <View style={styles.tabs}>
      <Link
        href="/(auth)/sign-in"
        style={StyleSheet.flatten([
          styles.tab,
          active === 'signin' && styles.tabActive,
        ])}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'signin' }}
      >
        <Text
          style={StyleSheet.flatten([
            styles.tabLabel,
            active === 'signin' && styles.tabLabelActive,
          ])}
        >
          Sign in
        </Text>
      </Link>
      <Link
        href="/(auth)/sign-up"
        style={StyleSheet.flatten([
          styles.tab,
          active === 'signup' && styles.tabActive,
        ])}
        accessibilityRole="tab"
        accessibilityState={{ selected: active === 'signup' }}
      >
        <Text
          style={StyleSheet.flatten([
            styles.tabLabel,
            active === 'signup' && styles.tabLabelActive,
          ])}
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
    <View style={styles.labeledField}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
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
    <View style={styles.labeledField}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {trailing}
      </View>
      <View style={styles.passwordWrap}>
        <AuthField
          {...props}
          secureTextEntry={!show}
          style={[styles.passwordField, props.style]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          hitSlop={8}
          onPress={() => setShow((v) => !v)}
          style={styles.eyeBtn}
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
  rootWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: space[6],
    gap: space[10],
  },
  inkPanel: {
    flex: 1,
    maxWidth: 560,
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: space[10],
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 640,
  },
  inkTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inkBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  inkEyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.lime,
  },
  inkArrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 20,
    color: colors.lime,
    lineHeight: 22,
  },
  inkMid: { gap: space[6], paddingVertical: space[8] },
  inkHeadline: {
    fontFamily: fonts.display,
    fontSize: 48,
    lineHeight: 52,
    color: colors.paper,
  },
  inkAccent: {
    fontFamily: fonts.sansItalic,
    color: colors.lime,
  },
  ribbonWrap: { marginTop: space[2] },
  quoteCard: {
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    padding: space[6],
    transform: [{ rotate: '-2deg' }],
  },
  quoteEyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(23, 23, 23, 0.55)',
  },
  quoteBody: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
    marginTop: space[4],
  },
  quoteFooter: {
    marginTop: space[6],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(23, 23, 23, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quoteMeta: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  quoteApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  inkFooter: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(246, 244, 239, 0.55)',
  },
  formScroll: { flex: 1 },
  form: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space[6],
    paddingHorizontal: space[6],
    gap: space[3],
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 46,
    color: colors.ink,
    marginBottom: space[1],
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.stone,
    marginBottom: space[2],
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: space[2],
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.cobalt },
  tabLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.stone,
  },
  tabLabelActive: { color: colors.cobalt },
  labeledField: { gap: space[2], marginTop: space[1] },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.ink,
  },
  field: { minHeight: 52 },
  passwordWrap: { position: 'relative', justifyContent: 'center' },
  passwordField: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  inlineLink: {
    fontFamily: fonts.sansMedium,
    color: colors.cobalt,
    fontSize: 14,
    minHeight: 44,
    textAlignVertical: 'center',
    paddingVertical: 10,
  },
});

export const authInlineLinkStyle = styles.inlineLink;
