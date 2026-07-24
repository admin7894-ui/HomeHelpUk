import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../components/Card';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';
import { useBookingStore } from '../../store/bookingStore';
import { getApplicablePricingModels } from '../../utils/pricingModelScoping';

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
  const { categories } = useBookingStore();
  
  // Pricing model state (supports array for multi-component selection)
  const [enabledModels, setEnabledModels] = useState(['fixed']);
  const [customPrice, setCustomPrice] = useState('20');

  // Hourly rules state
  const [includedHours, setIncludedHours] = useState('1');
  const [additionalHourPrice, setAdditionalHourPrice] = useState('20');
  const [minHours, setMinHours] = useState('1');
  const [maxHours, setMaxHours] = useState('8');

  // Quantity / Person / Unit rules state
  const [includedQuantity, setIncludedQuantity] = useState('4');
  const [additionalUnitPrice, setAdditionalUnitPrice] = useState('10');
  const [minimumQuantity, setMinimumQuantity] = useState('1');
  const [maximumQuantity, setMaximumQuantity] = useState('12');
  
  // Overview, inclusions, addons, FAQs state
  const [customDescription, setCustomDescription] = useState('');
  const [whatsIncludedText, setWhatsIncludedText] = useState('');
  const [whatsNotIncludedText, setWhatsNotIncludedText] = useState('');
  const [addOns, setAddOns] = useState([]);
  const [faqs, setFaqs] = useState([]);
  
  // Addon inputs & Editing state
  const [editingAddonId, setEditingAddonId] = useState(null);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState('');
  const [newAddonDesc, setNewAddonDesc] = useState('');

  // FAQ inputs & Editing state
  const [editingFaqIndex, setEditingFaqIndex] = useState(null);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const [saving, setSaving] = useState(false);

  // Compute allowed pricing models for active service
  const parentCat = categories?.find(c => c.subcategories?.some(sub => sub.services?.some(s => s.id === service?.id)));
  const categoryName = service?.categoryName || service?.category || parentCat?.name || null;
  const applicableModels = getApplicablePricingModels(service?.id, categoryName);

  useEffect(() => {
    if (service) {
      const mergedRules = existingConfig?.pricingRules || service.pricingRules || {};
      
      // Determine initial enabled models
      let initialModels = [];
      if (Array.isArray(mergedRules.enabledModels) && mergedRules.enabledModels.length > 0) {
        initialModels = mergedRules.enabledModels;
      } else if (mergedRules.pricingModel === 'multi') {
        initialModels = ['per_hour', 'per_person'];
      } else if (mergedRules.pricingModel) {
        initialModels = [mergedRules.pricingModel];
      } else {
        initialModels = [service.unit === 'hr' ? 'per_hour' : 'fixed'];
      }

      // Filter against allowed applicable models
      const validModels = initialModels.filter(m => applicableModels.some(am => am.id === m));
      setEnabledModels(validModels.length > 0 ? validModels : [applicableModels[0]?.id || 'fixed']);

      // Populate base price
      setCustomPrice(String(existingConfig?.customPrice || mergedRules.basePrice || service.price || 20));

      // Populate hourly rules
      setIncludedHours(String(mergedRules.includedHours || 1));
      setAdditionalHourPrice(String(mergedRules.additionalHourPrice || mergedRules.additionalUnitPrice || service.price || 20));
      setMinHours(String(mergedRules.minHours || 1));
      setMaxHours(String(mergedRules.maxHours || 8));

      // Populate unit / person rules
      setIncludedQuantity(String(mergedRules.includedQuantity || 4));
      setAdditionalUnitPrice(String(mergedRules.additionalUnitPrice || service.additionalCharge || 10));
      setMinimumQuantity(String(mergedRules.minimumQuantity || 1));
      setMaximumQuantity(String(mergedRules.maximumQuantity || 12));

      setCustomDescription(existingConfig?.customDescription || service.description || '');
      
      const inc = existingConfig?.customWhatsIncluded || service.whatsIncluded || [];
      setWhatsIncludedText(Array.isArray(inc) ? inc.join('\n') : String(inc));

      const exc = existingConfig?.customWhatsNotIncluded || service.whatsNotIncluded || [];
      setWhatsNotIncludedText(Array.isArray(exc) ? exc.join('\n') : String(exc));

      const adds = existingConfig?.customAddOns || service.customAddOns || service.addOns || service.addons || [];
      setAddOns(JSON.parse(JSON.stringify(adds)));

      const fq = existingConfig?.customFaqs || service.faqs || [];
      setFaqs(JSON.parse(JSON.stringify(fq)));

      // Clear edit states
      setEditingAddonId(null);
      setNewAddonName('');
      setNewAddonPrice('');
      setNewAddonDesc('');

      setEditingFaqIndex(null);
      setNewFaqQ('');
      setNewFaqA('');
    }
  }, [service, existingConfig, visible]);

  // Find non-hourly unit model metadata (e.g. per_person, per_room, per_pet)
  const unitModelMeta = applicableModels.find(m => m.id !== 'fixed' && m.id !== 'per_hour') || { unit: 'person' };
  const unitLabel = unitModelMeta.unit || 'person';

  const togglePricingModel = (modelId) => {
    if (enabledModels.includes(modelId)) {
      if (enabledModels.length === 1) return;
      setEnabledModels(enabledModels.filter(m => m !== modelId));
    } else {
      let next = [...enabledModels, modelId];
      if (modelId !== 'fixed' && next.includes('fixed')) {
        next = next.filter(m => m !== 'fixed');
      } else if (modelId === 'fixed') {
        next = ['fixed'];
      }
      setEnabledModels(next);
    }
  };

  // Add-on Handlers
  const handleStartEditAddon = (add) => {
    setEditingAddonId(add.id);
    setNewAddonName(add.name);
    setNewAddonPrice(String(add.price));
    setNewAddonDesc(add.description || '');
  };

  const handleCancelAddonEdit = () => {
    setEditingAddonId(null);
    setNewAddonName('');
    setNewAddonPrice('');
    setNewAddonDesc('');
  };

  const handleSaveAddon = () => {
    if (!newAddonName.trim() || !newAddonPrice.trim()) {
      Alert.alert('Required', 'Please enter add-on name and price');
      return;
    }
    const priceNum = Number(newAddonPrice) || 10;
    if (editingAddonId) {
      setAddOns(addOns.map(a => a.id === editingAddonId ? {
        ...a,
        name: newAddonName.trim(),
        description: newAddonDesc.trim(),
        price: priceNum
      } : a));
      handleCancelAddonEdit();
    } else {
      const item = {
        id: `custom_addon_${Date.now()}`,
        name: newAddonName.trim(),
        description: newAddonDesc.trim(),
        price: priceNum,
        enabled: true
      };
      setAddOns([...addOns, item]);
      setNewAddonName('');
      setNewAddonPrice('');
      setNewAddonDesc('');
    }
  };

  const handleRemoveAddonConfirm = (add) => {
    Alert.alert(
      'Delete Add-on?',
      `Are you sure you want to delete "${add.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setAddOns(addOns.filter(a => a.id !== add.id));
            if (editingAddonId === add.id) {
              handleCancelAddonEdit();
            }
          }
        }
      ]
    );
  };

  // FAQ Handlers
  const handleStartEditFaq = (f, idx) => {
    setEditingFaqIndex(idx);
    setNewFaqQ(f.q);
    setNewFaqA(f.a);
  };

  const handleCancelFaqEdit = () => {
    setEditingFaqIndex(null);
    setNewFaqQ('');
    setNewFaqA('');
  };

  const handleSaveFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) {
      Alert.alert('Required', 'Please enter both question and answer');
      return;
    }
    if (editingFaqIndex !== null) {
      setFaqs(faqs.map((f, i) => i === editingFaqIndex ? { q: newFaqQ.trim(), a: newFaqA.trim() } : f));
      handleCancelFaqEdit();
    } else {
      setFaqs([...faqs, { q: newFaqQ.trim(), a: newFaqA.trim() }]);
      setNewFaqQ('');
      setNewFaqA('');
    }
  };

  const handleRemoveFaqConfirm = (f, idx) => {
    Alert.alert(
      'Delete FAQ?',
      `Are you sure you want to delete "${f.q}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setFaqs(faqs.filter((_, i) => i !== idx));
            if (editingFaqIndex === idx) {
              handleCancelFaqEdit();
            }
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const incArray = whatsIncludedText.split('\n').map(s => s.trim()).filter(Boolean);
      const excArray = whatsNotIncludedText.split('\n').map(s => s.trim()).filter(Boolean);

      const isPerHour = enabledModels.includes('per_hour');
      const isUnitModel = enabledModels.some(m => m !== 'fixed' && m !== 'per_hour');

      const pricingRulesObj = {
        pricingModel: enabledModels.length > 1 ? 'multi' : (enabledModels[0] || 'fixed'),
        enabledModels,
        basePrice: Number(customPrice) || 0,

        // Hourly component rules
        enablePerHour: isPerHour,
        includedHours: isPerHour ? (Number(includedHours) || 1) : 1,
        additionalHourPrice: isPerHour ? (Number(additionalHourPrice) || 20) : 0,
        minHours: isPerHour ? (Number(minHours) || 1) : 1,
        maxHours: isPerHour ? (Number(maxHours) || 8) : 8,

        // Quantity / Person / Unit component rules
        enablePerUnit: isUnitModel,
        includedQuantity: isUnitModel ? (Number(includedQuantity) || 1) : 1,
        includedUnit: unitLabel,
        additionalUnitPrice: isUnitModel ? (Number(additionalUnitPrice) || 0) : 0,
        additionalUnit: unitLabel,
        minimumQuantity: isUnitModel ? (Number(minimumQuantity) || 1) : 1,
        maximumQuantity: isUnitModel ? (Number(maximumQuantity) || 12) : 12
      };

      const payload = {
        customPrice: Number(customPrice),
        customDescription,
        customWhatsIncluded: incArray,
        customWhatsNotIncluded: excArray,
        customAddOns: addOns,
        customFaqs: faqs,
        pricingRules: pricingRulesObj
      };

      const { data } = await api.put(`/providers/${providerId}/services/${service.id}`, payload);
      if (data.success) {
        Alert.alert('Saved', 'Service details and pricing rules updated successfully!');
        if (onSuccess) onSuccess(data.provider);
        onClose();
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update service details');
    } finally {
      setSaving(false);
    }
  };

  if (!service) return null;

  const isPerHourEnabled = enabledModels.includes('per_hour');
  const isUnitEnabled = enabledModels.some(m => m !== 'fixed' && m !== 'per_hour');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Modal Header */}
        <View style={[styles.header, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text, fontSize: scaledFont(17, fontScale) }]}>
            Edit: {service.name}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Pricing Configuration Card */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Pricing Configuration</Text>
            
            {/* Single Shared Base Price */}
            <AccessibleTextInput
              label="Base Price (£)"
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="numeric"
              style={{ backgroundColor: theme.background, color: theme.text, marginBottom: spacing.sm }}
            />

            {/* Pricing Model Multi-Select Toggles */}
            <Text style={[styles.subLabel, { color: theme.textMuted }]}>Select Enabled Pricing Components</Text>
            <View style={styles.chipRow}>
              {applicableModels.map((model) => {
                const selected = enabledModels.includes(model.id);
                return (
                  <Pressable
                    key={model.id}
                    onPress={() => togglePricingModel(model.id)}
                    style={[
                      styles.modelChip,
                      {
                        borderColor: selected ? theme.providerAccent : theme.border,
                        backgroundColor: selected ? theme.providerAccentSoft : theme.background
                      }
                    ]}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={18}
                      color={selected ? theme.providerAccent : theme.textMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={{ color: selected ? theme.providerAccent : theme.text, fontWeight: '700', fontSize: 13 }}>
                      {model.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Per Hour Rules Section */}
            {isPerHourEnabled && (
              <View style={[styles.componentBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={[styles.boxTitle, { color: theme.providerAccent }]}>Hourly Rules</Text>
                
                <AccessibleTextInput
                  label="Included Hours (Base Includes)"
                  value={includedHours}
                  onChangeText={setIncludedHours}
                  keyboardType="numeric"
                  placeholder="e.g. 1"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                />

                <AccessibleTextInput
                  label="Additional Hour Charge (£ per extra hour)"
                  value={additionalHourPrice}
                  onChangeText={setAdditionalHourPrice}
                  keyboardType="numeric"
                  placeholder="e.g. 20"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                />

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AccessibleTextInput
                      label="Min Hours"
                      value={minHours}
                      onChangeText={setMinHours}
                      keyboardType="numeric"
                      style={{ backgroundColor: theme.surface, color: theme.text }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AccessibleTextInput
                      label="Max Hours"
                      value={maxHours}
                      onChangeText={setMaxHours}
                      keyboardType="numeric"
                      style={{ backgroundColor: theme.surface, color: theme.text }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Quantity / Unit / Person Rules Section */}
            {isUnitEnabled && (
              <View style={[styles.componentBox, { borderColor: theme.border, backgroundColor: theme.background, marginTop: spacing.sm }]}>
                <Text style={[styles.boxTitle, { color: theme.providerAccent }]}>
                  {unitLabel.toUpperCase()} Rules
                </Text>
                
                <AccessibleTextInput
                  label={`Included ${unitLabel.toUpperCase()}S (Base Includes)`}
                  value={includedQuantity}
                  onChangeText={setIncludedQuantity}
                  keyboardType="numeric"
                  placeholder="e.g. 4"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                />

                <AccessibleTextInput
                  label={`Additional ${unitLabel.toUpperCase()} Charge (£ per extra ${unitLabel})`}
                  value={additionalUnitPrice}
                  onChangeText={setAdditionalUnitPrice}
                  keyboardType="numeric"
                  placeholder="e.g. 10"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                />

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <AccessibleTextInput
                      label={`Min ${unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}s`}
                      value={minimumQuantity}
                      onChangeText={setMinimumQuantity}
                      keyboardType="numeric"
                      style={{ backgroundColor: theme.surface, color: theme.text }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AccessibleTextInput
                      label={`Max ${unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1)}s`}
                      value={maximumQuantity}
                      onChangeText={setMaximumQuantity}
                      keyboardType="numeric"
                      style={{ backgroundColor: theme.surface, color: theme.text }}
                    />
                  </View>
                </View>
              </View>
            )}
          </Card>

          {/* Custom Description */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Service Overview / Description</Text>
            <AccessibleTextInput
              label="Description"
              value={customDescription}
              onChangeText={setCustomDescription}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: theme.background, color: theme.text, height: 80 }}
            />
          </Card>

          {/* What's Included */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>What's Included (1 item per line)</Text>
            <AccessibleTextInput
              label="What's Included"
              value={whatsIncludedText}
              onChangeText={setWhatsIncludedText}
              multiline
              numberOfLines={5}
              style={{ backgroundColor: theme.background, color: theme.text, height: 110 }}
            />
          </Card>

          {/* What's Not Included */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>What's Not Included (1 item per line)</Text>
            <AccessibleTextInput
              label="What's Not Included"
              value={whatsNotIncludedText}
              onChangeText={setWhatsNotIncludedText}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: theme.background, color: theme.text, height: 90 }}
            />
          </Card>

          {/* Custom Add-ons Section */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Custom Add-ons</Text>
            
            {addOns.map((add) => {
              const isEditing = editingAddonId === add.id;
              return (
                <View key={add.id} style={[styles.itemRow, { borderColor: theme.border }, isEditing && { backgroundColor: theme.providerAccentSoft, borderRadius: radii.sm, paddingHorizontal: spacing.xs }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>{add.name}</Text>
                    {add.description ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>{add.description}</Text> : null}
                    <Text style={{ color: theme.providerAccent, fontWeight: '800', marginTop: 2 }}>+£{add.price}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable onPress={() => handleStartEditAddon(add)} style={{ padding: 6 }}>
                      <Ionicons name="pencil" size={18} color={theme.providerAccent} />
                    </Pressable>
                    <Pressable onPress={() => handleRemoveAddonConfirm(add)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <View style={styles.addForm}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.formSubTitle, { color: theme.text }]}>
                  {editingAddonId ? `Editing Add-on` : `Add New Custom Add-on`}
                </Text>
                {editingAddonId && (
                  <Pressable onPress={handleCancelAddonEdit} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                  </Pressable>
                )}
              </View>

              <AccessibleTextInput
                label="Name"
                placeholder="e.g. Extra Portion"
                value={newAddonName}
                onChangeText={setNewAddonName}
              />
              <AccessibleTextInput
                label="Price (£)"
                placeholder="e.g. 10"
                value={newAddonPrice}
                onChangeText={setNewAddonPrice}
                keyboardType="numeric"
              />
              <AccessibleTextInput
                label="Description"
                placeholder="e.g. Prepares 2 extra portion packages"
                value={newAddonDesc}
                onChangeText={setNewAddonDesc}
              />
              
              <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                <Pressable
                  onPress={handleSaveAddon}
                  style={[styles.addBtn, { backgroundColor: theme.providerAccent, flex: 1 }]}
                >
                  <Ionicons name={editingAddonId ? "checkmark" : "add"} size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 4 }}>
                    {editingAddonId ? 'Update Add-on' : 'Add Add-on'}
                  </Text>
                </Pressable>
                {editingAddonId && (
                  <Pressable
                    onPress={handleCancelAddonEdit}
                    style={[styles.addBtn, { backgroundColor: '#F1F5F9', paddingHorizontal: 16 }]}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Card>

          {/* FAQs Section */}
          <Card style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Frequently Asked Questions (FAQs)</Text>
            
            {faqs.map((f, idx) => {
              const isEditing = editingFaqIndex === idx;
              return (
                <View key={idx} style={[styles.itemRow, { borderColor: theme.border }, isEditing && { backgroundColor: theme.providerAccentSoft, borderRadius: radii.sm, paddingHorizontal: spacing.xs }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: '700' }}>Q: {f.q}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}>A: {f.a}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Pressable onPress={() => handleStartEditFaq(f, idx)} style={{ padding: 6 }}>
                      <Ionicons name="pencil" size={18} color={theme.providerAccent} />
                    </Pressable>
                    <Pressable onPress={() => handleRemoveFaqConfirm(f, idx)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            <View style={styles.addForm}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.formSubTitle, { color: theme.text }]}>
                  {editingFaqIndex !== null ? `Editing FAQ` : `Add New FAQ`}
                </Text>
                {editingFaqIndex !== null && (
                  <Pressable onPress={handleCancelFaqEdit} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 12 }}>Cancel</Text>
                  </Pressable>
                )}
              </View>

              <AccessibleTextInput
                label="Question"
                placeholder="e.g. Do I need to provide supplies?"
                value={newFaqQ}
                onChangeText={setNewFaqQ}
              />
              <AccessibleTextInput
                label="Answer"
                placeholder="e.g. Yes, all materials provided."
                value={newFaqA}
                onChangeText={setNewFaqA}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                <Pressable
                  onPress={handleSaveFaq}
                  style={[styles.addBtn, { backgroundColor: theme.providerAccent, flex: 1 }]}
                >
                  <Ionicons name={editingFaqIndex !== null ? "checkmark" : "add"} size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', marginLeft: 4 }}>
                    {editingFaqIndex !== null ? 'Update FAQ' : 'Add FAQ'}
                  </Text>
                </Pressable>
                {editingFaqIndex !== null && (
                  <Pressable
                    onPress={handleCancelFaqEdit}
                    style={[styles.addBtn, { backgroundColor: '#F1F5F9', paddingHorizontal: 16 }]}
                  >
                    <Text style={{ color: theme.text, fontWeight: '700' }}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Card>
        </ScrollView>

        {/* Modal Footer */}
        <View style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <AppButton label="Save Changes" onPress={handleSave} loading={saving} variant="primary" />
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
  cardTitle: { fontWeight: '800', fontSize: 16, marginBottom: spacing.sm },
  subLabel: { fontSize: 13, fontWeight: '700', marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  componentBox: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  boxTitle: { fontWeight: '800', fontSize: 14, marginBottom: 4 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    marginBottom: spacing.xs,
  },
  addForm: { marginTop: spacing.md, gap: spacing.xs },
  formSubTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1,
  }
});
