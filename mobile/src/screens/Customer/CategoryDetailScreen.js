import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii, layout } from '../../utils/theme';
import { getServiceImage, resolveImageSource } from '../../utils/serviceImages';

export default function CategoryDetailScreen({ route, navigation }) {
  const { categoryId } = route.params;
  const { highContrast, fontScale } = useAppStore();
  const { categories, setDraft } = useBookingStore();
  const theme = getTheme(highContrast);

  const mainCategory = categories.find((c) => c.id === categoryId);

  if (!mainCategory) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.text }}>Category not found.</Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: theme.customerAccent }}>Go Back</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const [selectedSubTab, setSelectedSubTab] = useState('all');
  const subcategories = mainCategory.subcategories || [];

  const handleServiceSelect = (service) => {
    setDraft({
      categoryId: mainCategory.id,
      subCategoryId: selectedSubTab === 'all' ? null : selectedSubTab,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceUnit: service.unit,
      addOns: [],
      providerId: null,
      date: null,
      time: null,
    });
    navigation.navigate('ServiceDetail', { serviceId: service.id });
  };

  const renderServiceCard = (srv) => {
    const srvImage = getServiceImage(srv.id, categoryId, srv.name);
    return (
      <Pressable
        key={srv.id}
        onPress={() => handleServiceSelect(srv)}
        accessibilityRole="button"
        accessibilityLabel={`${srv.name}, starting from £${srv.price} per ${srv.unit}`}
      >
        <Card style={styles.serviceCard}>
          <View style={styles.serviceRow}>
            {/* Visual anchor image */}
            {srvImage ? (
              <Image source={resolveImageSource(srvImage)} style={styles.serviceThumbnail} />
            ) : (
              <View style={[styles.serviceThumbnail, { backgroundColor: theme.customerAccentSoft, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="construct-outline" size={32} color={theme.customerAccent} />
              </View>
            )}
            
            <View style={styles.serviceContent}>
              <Text style={[styles.serviceName, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
                {srv.name}
              </Text>
              
              <Text
                numberOfLines={2}
                style={[styles.serviceDesc, { color: theme.textMuted, fontSize: scaledFont(13, fontScale) }]}
              >
                {srv.description}
              </Text>
              
              <View style={styles.detailsMeta}>
                <View style={[styles.pricePill, { backgroundColor: theme.customerAccentSoft }]}>
                  <Text style={[styles.priceText, { color: theme.customerAccent }]}>
                    From £{srv.price}{srv.unit === 'hr' ? '/hr' : srv.unit === 'visit' ? '/visit' : srv.unit === 'event' ? '/event' : srv.unit === 'order' ? '/order' : ' fixed'}
                  </Text>
                </View>
                <Text style={[styles.durationText, { color: theme.textMuted }]}>
                  • Est: {srv.duration || '1-2 hrs'}
                </Text>
              </View>
            </View>
            <View style={[styles.arrowCircle, { backgroundColor: theme.surface }]}>
              <Ionicons name="arrow-forward" size={18} color={theme.textMuted} />
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Header Row - Fix overlapping */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backBtn, { borderColor: theme.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text, fontSize: scaledFont(20, fontScale) }]}>
          {mainCategory.name}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Intro Banner */}
        <View style={[styles.introCard, { backgroundColor: theme.customerAccentSoft }]}>
          <Text style={[styles.introTitle, { color: theme.text, fontSize: scaledFont(22, fontScale) }]}>
            Find the perfect {mainCategory.name.toLowerCase()} service
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: scaledFont(14, fontScale), marginTop: 4 }}>
            Choose a service below to view details and check available local professionals.
          </Text>
        </View>

        {/* Subcategory Tabs */}
        {subcategories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            <Pressable
              onPress={() => setSelectedSubTab('all')}
              style={[
                styles.tab,
                { borderColor: theme.border },
                selectedSubTab === 'all' && { backgroundColor: theme.customerAccent, borderColor: theme.customerAccent },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.text },
                  selectedSubTab === 'all' && { color: theme.primaryButtonText, fontWeight: '700' },
                ]}
              >
                All Services
              </Text>
            </Pressable>

            {subcategories.map((sub) => (
              <Pressable
                key={sub.id}
                onPress={() => setSelectedSubTab(sub.id)}
                style={[
                  styles.tab,
                  { borderColor: theme.border },
                  selectedSubTab === sub.id && { backgroundColor: theme.customerAccent, borderColor: theme.customerAccent },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: theme.text },
                    selectedSubTab === sub.id && { color: theme.primaryButtonText, fontWeight: '700' },
                  ]}
                >
                  {sub.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Services List Grouping */}
        <View style={styles.listSection}>
          {selectedSubTab === 'all' ? (
            subcategories.map((sub) => {
              const services = sub.services || [];
              if (services.length === 0) return null;
              return (
                <View key={sub.id} style={styles.subcategoryGroup}>
                  <Text style={[styles.subcategoryGroupHeader, { color: theme.text, fontSize: scaledFont(16, fontScale) }]}>
                    {sub.name}
                  </Text>
                  {services.map((srv) => renderServiceCard(srv))}
                </View>
              );
            })
          ) : (
            (() => {
              const match = subcategories.find((sub) => sub.id === selectedSubTab);
              const services = match ? match.services || [] : [];
              if (services.length === 0) {
                return (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="construct-outline" size={48} color={theme.textMuted} />
                    <Text style={{ color: theme.textMuted, marginTop: 8 }}>No services found under this tab.</Text>
                  </View>
                );
              }
              return services.map((srv) => renderServiceCard(srv));
            })()
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: spacing.sm,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 48,
    flex: 1,
  },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scrollContent: { paddingBottom: spacing.xl },
  introCard: { borderRadius: layout.borderRadius, padding: layout.cardPadding, marginBottom: layout.cardGap },
  introTitle: { fontWeight: '800', lineHeight: 28 },
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xl,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  tabText: { fontWeight: '600', fontSize: 13 },
  listSection: { gap: layout.cardGap },
  subcategoryGroup: { marginBottom: 8 },
  subcategoryGroupHeader: { fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', fontSize: 13, letterSpacing: 0.5 },
  emptyContainer: { alignItems: 'center', padding: spacing.xl },
  serviceCard: { padding: layout.cardPadding, borderWidth: 1, borderRadius: layout.borderRadius, marginBottom: layout.cardGap, borderColor: 'rgba(0,0,0,0.05)', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  serviceRow: { flexDirection: 'row', alignItems: 'center' },
  serviceThumbnail: { width: 80, height: 80, borderRadius: radii.md, marginRight: spacing.md },
  serviceContent: { flex: 1, marginRight: spacing.sm },
  serviceName: { fontWeight: '800' },
  serviceDesc: { lineHeight: 20, marginVertical: 8 }, // 20px line-height, 8px vertical gap
  detailsMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  pricePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  priceText: { fontWeight: '800', fontSize: 13 },
  durationText: { fontSize: 12, marginLeft: spacing.xs },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
