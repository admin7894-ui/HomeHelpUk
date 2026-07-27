import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import api from '../../services/api';
import { scaledFont, spacing, radii } from '../../utils/theme';

export default function EditServiceDetailModal({
  visible,
  onClose,
  providerId,
  service,
  existingConfig,
  theme,
  fontScale,
  onSuccess
}) {
  const [providerNotes, setProviderNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!service) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      // Providers are restricted to setting participation / availability status only
      const { data } = await api.put(`/providers/${providerId}/services/${service.id}`, {
        enabled: true
      });
      if (data.success) {
        Alert.alert('Saved', 'Provider service settings updated.');
        if (onSuccess) onSuccess(data.provider);
        onClose();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update provider service settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Modal Header */}
        <View style={[styles.header, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: scaledFont(17, fontScale) }]}>
            Provider Service Settings: {service.name}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Read-Only Admin Service Configuration Summary */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Ionicons name="shield-checkmark" size={20} color={theme.providerAccent} style={{ marginRight: 6 }} />
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 0 }]}>Admin Canonical Service Rules</Text>
            </View>
            <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
              Base pricing, inclusions, exclusions, and requirements are managed centrally by Admin and apply to all providers.
            </Text>

            <View style={[styles.infoRow, { borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Base Price:</Text>
              <Text style={[styles.infoVal, { color: theme.providerAccent }]}>£{service.price}/{service.unit || 'visit'}</Text>
            </View>

            <View style={[styles.infoRow, { borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Pricing Model:</Text>
              <Text style={[styles.infoVal, { color: theme.text }]}>{service.pricingRules?.pricingModel || 'Fixed / Unit Based'}</Text>
            </View>

            <View style={[styles.infoRow, { borderColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>Expected Duration:</Text>
              <Text style={[styles.infoVal, { color: theme.text }]}>{service.duration || 'Standard duration'}</Text>
            </View>
          </Card>

          {/* Read-Only Inclusions & Requirements */}
          {Array.isArray(service.whatsIncluded) && service.whatsIncluded.length > 0 && (
            <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>What's Included (Admin Managed)</Text>
              {service.whatsIncluded.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                  <Text style={{ color: theme.text, fontSize: 13 }}>{item}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Provider-Specific Notes */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Provider Notes (Internal)</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.xs }}>
              Add optional personal reminders or notes for offering this service.
            </Text>
            <AccessibleTextInput
              label="Notes"
              value={providerNotes}
              onChangeText={setProviderNotes}
              multiline
              numberOfLines={3}
              placeholder="e.g. Always bring heavy-duty tools"
              style={{ backgroundColor: theme.background, color: theme.text, height: 70 }}
            />
          </Card>
        </ScrollView>

        {/* Modal Footer */}
        <View style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <AppButton label="Done" onPress={onClose} variant="primary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4, marginRight: spacing.sm },
  headerTitle: { fontWeight: '800', flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.md, padding: spacing.md },
  cardTitle: { fontWeight: '800', fontSize: 15, marginBottom: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoVal: { fontSize: 13, fontWeight: '700' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  }
});
