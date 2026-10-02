import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Link, type Href } from 'expo-router';

export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function AuthField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#888"
      {...props}
      style={[styles.input, props.style]}
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
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[
        styles.button,
        variant === 'secondary' && styles.secondary,
        isGhost && styles.ghost,
        busy && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={isGhost ? '#1f4b3a' : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, isGhost && styles.ghostText]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AuthMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={styles.message}>{children}</Text>;
}

export function AuthLink({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} style={styles.link}>
      {label}
    </Link>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: '#f7f7f5',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#14241c',
  },
  subtitle: {
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#14241c',
  },
  button: {
    backgroundColor: '#1f4b3a',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: '#3d6b58',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  ghostText: {
    color: '#1f4b3a',
  },
  message: {
    color: '#7a2e0b',
  },
  link: {
    color: '#1f4b3a',
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '600',
  },
});
