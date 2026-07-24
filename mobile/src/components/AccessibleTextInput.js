import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/appStore';
import { getTheme, scaledFont, radii, spacing } from '../utils/theme';

export default function AccessibleTextInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  secureTextEntry = false,
  autoCapitalize = 'sentences',
}) {
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: theme.text, fontSize: scaledFont(14, fontScale) }]}>{label}</Text>
      ) : null}
      <TextInput
        accessibilityLabel={label || placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            fontSize: scaledFont(16, fontScale),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontWeight: '600', marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
});
