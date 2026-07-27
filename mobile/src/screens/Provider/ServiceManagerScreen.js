import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import AppButton from '../../components/AppButton';
import Card from '../../components/Card';
import SectionTitle from '../../components/SectionTitle';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

import EditServiceDetailModal from './EditServiceDetailModal';

export default function ServiceManagerScreen({ navigation }) {
  const { highContrast, fontScale } = useAppStore();
  const { user } = useAuthStore();
  const { categories, fetchCategories } = useBookingStore();
  const theme = getTheme(highContrast);

  const [providerProfile, setProviderProfile] = useState(null);
  const [selectedCats, setSelectedCats] = useState([]);
  const [servicesConfig, setServicesConfig] = useState({}); // { serviceId: { price, enabled } }
  const [expandedCats, setExpandedCats] = useState({}); // { catId: boolean } - collapsed by default
  const [saving, setSaving] = useState(false);
  const [activeEditService, setActiveEditService] = useState(null);

  const reloadProfile = () => {
    if (user?.providerId) {
      api.get(`/providers/${user.providerId}`).then(({ data }) => {
        setProviderProfile(data.provider);
        setSelectedCats(data.provider.categories || []);
        
        const config = {};
        if (data.provider.services) {
          data.provider.services.forEach((s) => {
            config[s.serviceId] = { price: String(s.customPrice), enabled: s.enabled };
          });
        }
        setServicesConfig(config);
      });
    }
  };

  useEffect(() => {
    fetchCategories();
    reloadProfile();
  }, [user]);

  const toggleCategory = (catId) => {
    if (selectedCats.includes(catId)) {
      setSelectedCats(selectedCats.filter((id) => id !== catId));
    } else {
      setSelectedCats([...selectedCats, catId]);
    }
  };

  const toggleExpandCategory = (catId) => {
    setExpandedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handlePriceChange = (serviceId, text) => {
    setServicesConfig({
      ...servicesConfig,
      [serviceId]: {
        ...servicesConfig[serviceId],
        price: text,
      },
    });
  };

  const toggleServiceEnabled = (serviceId, catId) => {
    const cat = categories.find((c) => c.id === catId);
    const catServices = [];
    cat?.subcategories?.forEach((sub) => sub.services?.forEach((s) => catServices.push(s.id)));

    const activeInCat = catServices.filter((sId) =>
      servicesConfig[sId] !== undefined ? servicesConfig[sId].enabled : true
    );
    const isCurrentlyEnabled = servicesConfig[serviceId] !== undefined ? servicesConfig[serviceId].enabled : true;

    if (isCurrentlyEnabled && activeInCat.length <= 1) {
      Alert.alert(
        'Cannot Disable Service',
        'At least one service must remain enabled for an active category. To disable all services in this category, uncheck the category from "Select Active Categories" above.'
      );
      return;
    }

    setServicesConfig({
      ...servicesConfig,
      [serviceId]: {
        ...(servicesConfig[serviceId] || { price: '20', enabled: true }),
        enabled: !isCurrentlyEnabled,
      },
    });
  };

  const handleOpenEditModal = (service, catId, catName) => {
    // Smart Navigation: Keep category expanded
    setExpandedCats((prev) => ({ ...prev, [catId]: true }));
    setActiveEditService({ ...service, categoryId: catId, categoryName: catName });
  };

  const handleSave = async () => {
    if (!user?.providerId) {
      Alert.alert('Error', 'Provider ID not associated. Please restart the app or re-login.');
      return;
    }
    setSaving(true);
    
    try {
      const formattedServices = Object.keys(servicesConfig).map((sId) => ({
        serviceId: sId,
        customPrice: Number(servicesConfig[sId].price) || 20,
        enabled: servicesConfig[sId].enabled,
      }));

      await api.patch(`/providers/${user.providerId}`, {
        categories: selectedCats,
        services: formattedServices,
      });

      Alert.alert('Success', 'Service preferences saved successfully!');
      reloadProfile();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={{ paddingRight: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>
          Manage Services
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md, fontSize: scaledFont(14, fontScale) }}>
          Toggle active categories, customize service pricing, and manage custom add-ons & FAQs.
        </Text>

        {/* Section 1: Active Categories */}
        <SectionTitle>Select Active Categories</SectionTitle>
        <View style={{ marginBottom: spacing.md }}>
          {categories.map((cat) => {
            const selected = selectedCats.includes(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => toggleCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: selected ? theme.providerAccent : theme.border,
                    backgroundColor: selected ? theme.providerAccentSoft : theme.surface,
                  },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <Ionicons
                  name={selected ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={selected ? theme.providerAccent : theme.textMuted}
                  style={{ marginRight: 10 }}
                />
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaledFont(15, fontScale) }}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Section 2: Services Offered (Read-Only Admin Pricing) */}
        <SectionTitle>Select Services You Offer</SectionTitle>
        {selectedCats.map((catId) => {
          const cat = categories.find((c) => c.id === catId);
          if (!cat) return null;

          const isExpanded = Boolean(expandedCats[catId]);
          
          // Calculate active service count in category
          let totalServicesCount = 0;
          let activeServicesCount = 0;

          cat.subcategories?.forEach((sub) => {
            sub.services?.forEach((s) => {
              totalServicesCount++;
              const cfg = servicesConfig[s.id];
              if (cfg ? cfg.enabled : true) {
                activeServicesCount++;
              }
            });
          });

          return (
            <View key={catId} style={styles.collapsibleCategoryContainer}>
              {/* Category Header Bar */}
              <Pressable
                onPress={() => toggleExpandCategory(catId)}
                style={[
                  styles.categoryHeader,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderBottomLeftRadius: isExpanded ? 0 : radii.md,
                    borderBottomRightRadius: isExpanded ? 0 : radii.md,
                  },
                ]}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={20}
                  color={theme.providerAccent}
                  style={{ marginRight: spacing.xs }}
                />
                <Text style={[styles.categoryTitleText, { color: theme.text }]}>
                  {cat.name} Services
                </Text>

                <View style={[styles.badgeChip, { backgroundColor: theme.providerAccentSoft }]}>
                  <Text style={[styles.badgeText, { color: theme.providerAccent }]}>
                    {activeServicesCount}/{totalServicesCount} Active
                  </Text>
                </View>
              </Pressable>

              {/* Expandable Services List */}
              {isExpanded && (
                <View style={[styles.categoryBody, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  {cat.subcategories?.map((sub) =>
                    sub.services?.map((s) => {
                      const cfg = servicesConfig[s.id] || { price: String(s.price), enabled: true };
                      const isEnabled = cfg.enabled;

                      return (
                        <Card
                          key={s.id}
                          style={[
                            styles.serviceCard,
                            !isEnabled && styles.disabledServiceCard,
                            { backgroundColor: isEnabled ? theme.surface : theme.background, borderColor: theme.border }
                          ]}
                        >
                          <View style={styles.row}>
                            {/* Standardized Service Checkbox */}
                            <Pressable
                              onPress={() => toggleServiceEnabled(s.id, catId)}
                              style={styles.checkboxContainer}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: isEnabled }}
                            >
                              <Ionicons
                                name={isEnabled ? 'checkbox' : 'square-outline'}
                                size={22}
                                color={isEnabled ? theme.providerAccent : theme.textMuted}
                              />
                            </Pressable>

                            <View style={styles.serviceMetaWrapper}>
                              <Text
                                style={[
                                  styles.serviceName,
                                  { color: isEnabled ? theme.text : theme.textMuted },
                                  !isEnabled && styles.disabledText
                                ]}
                              >
                                {s.name}
                              </Text>
                              <Text style={[styles.serviceBaseText, { color: theme.textMuted }]}>
                                Admin Base Price: £{s.price}/{s.unit || 'visit'}
                              </Text>
                            </View>

                            {/* Read-only Base Price Badge */}
                            <View
                              style={[
                                styles.readOnlyPriceBadge,
                                { borderColor: theme.border, backgroundColor: isEnabled ? theme.providerAccentSoft : theme.background },
                                !isEnabled && { opacity: 0.5 }
                              ]}
                            >
                              <Text style={{ color: isEnabled ? theme.providerAccent : theme.textMuted, fontWeight: '800', fontSize: 13 }}>
                                £{s.price}/{s.unit || 'visit'}
                              </Text>
                            </View>
                          </View>

                          {/* Footer Action Row (Provider Settings) */}
                          <View
                            style={[
                              styles.serviceFooterRow,
                              { borderTopColor: theme.border },
                              !isEnabled && { opacity: 0.4 }
                            ]}
                          >
                            <Text style={[styles.addonsCountText, { color: theme.textMuted }]}>
                              {isEnabled ? 'Service Active' : 'Service Off'}
                            </Text>

                            <Pressable
                              disabled={!isEnabled}
                              onPress={() => handleOpenEditModal(s, catId, cat.name)}
                              style={[
                                styles.editDetailsBtn,
                                { backgroundColor: isEnabled ? theme.providerAccentSoft : '#E2E8F0' }
                              ]}
                            >
                              <Ionicons
                                name="options-outline"
                                size={14}
                                color={isEnabled ? theme.providerAccent : theme.textMuted}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.editBtnText,
                                  { color: isEnabled ? theme.providerAccent : theme.textMuted }
                                ]}
                              >
                                Provider Service Settings
                              </Text>
                            </Pressable>
                          </View>
                        </Card>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderColor: theme.border }]}>
        <AppButton label="Save Changes" onPress={handleSave} loading={saving} />
      </View>

      {/* Edit Details & Pricing Modal */}
      {!!activeEditService && (
        <EditServiceDetailModal
          visible={Boolean(activeEditService)}
          onClose={() => setActiveEditService(null)}
          providerId={user?.providerId}
          service={activeEditService}
          existingConfig={providerProfile?.services?.find((ps) =>
            typeof ps === 'string' ? ps === activeEditService.id : ps.serviceId === activeEditService.id
          )}
          theme={theme}
          fontScale={fontScale}
          onSuccess={(updatedProvider) => {
            setProviderProfile(updatedProvider);
            reloadProfile();
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  title: {
    fontWeight: '800',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  collapsibleCategoryContainer: {
    marginBottom: spacing.sm,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
    borderWidth: 1,
  },
  categoryTitleText: {
    fontWeight: '800',
    fontSize: 16,
    flex: 1,
  },
  badgeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 12,
  },
  categoryBody: {
    padding: spacing.sm,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
    borderWidth: 1,
    borderTopWidth: 0,
  },
  serviceCard: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  disabledServiceCard: {
    backgroundColor: '#F8FAFC',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  serviceMetaWrapper: {
    flex: 1,
    marginRight: spacing.xs,
  },
  serviceName: {
    fontWeight: '800',
    fontSize: 15,
  },
  disabledText: {
    textDecorationLine: 'line-through',
  },
  serviceBaseText: {
    fontSize: 12,
    marginTop: 2,
  },
  readOnlyPriceBadge: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justify: 'center',
  },
  serviceFooterRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addonsCountText: {
    fontSize: 12,
  },
  editDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  editBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  footer: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    marginBottom: spacing.xs,
  },
});
