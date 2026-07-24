import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import VoiceAssistanceButton from '../../components/VoiceAssistanceButton';
import { useAppStore } from '../../store/appStore';
import { useBookingStore } from '../../store/bookingStore';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';
import { getServiceImage, getServiceGallery, getServicePreviewGif, resolveImageSource } from '../../utils/serviceImages';
import { calculateServicePrice } from '../../utils/pricingEngine';

const { width } = Dimensions.get('window');

export default function ServiceDetailScreen({ route, navigation }) {
  const { serviceId } = route.params;
  const insets = useSafeAreaInsets();
  const { highContrast, fontScale } = useAppStore();
  const { categories, draft, setDraft, providers, fetchProvidersByService } = useBookingStore();
  const theme = getTheme(highContrast);

  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'gallery' | 'reviews'
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);

  useEffect(() => {
    if (serviceId) {
      fetchProvidersByService(serviceId);
    }
  }, [serviceId]);

  const findServiceData = () => {
    if (!serviceId) return { service: null, mainCategory: null };
    for (const cat of categories) {
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const match = (sub.services || []).find((s) => s.id === serviceId);
          if (match) return { service: match, mainCategory: cat };
        }
      }
    }
    return { service: null, mainCategory: null };
  };

  const { service, mainCategory } = findServiceData();

  const eligibleProviders = (providers || []).filter((p) => {
    if (!p.services) return false;
    return p.services.some((s) => (typeof s === 'string' ? s === serviceId : s.serviceId === serviceId && s.enabled !== false));
  });

  const topProvider = eligibleProviders.length > 0 ? eligibleProviders[0] : null;

  const renderStarRating = (rating, size = 14) => {
    const numRating = Number(rating) || 0;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (numRating >= i) {
        stars.push(<Ionicons key={i} name="star" size={size} color="#EAB308" style={{ marginRight: 2 }} />);
      } else if (numRating >= i - 0.5) {
        stars.push(<Ionicons key={i} name="star-half" size={size} color="#EAB308" style={{ marginRight: 2 }} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={size} color="#CBD5E1" style={{ marginRight: 2 }} />);
      }
    }
    return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
  };

  const pricingRules = service?.pricingRules || {
    pricingModel: service?.unit === 'hr' ? 'per_hour' : 'fixed',
    basePrice: service?.price || 0,
    includedQuantity: 1,
    additionalUnitPrice: service?.additionalCharge || 0,
    includedUnit: service?.unit || 'visit',
    additionalUnit: service?.unit || 'visit',
    minimumQuantity: 1,
    maximumQuantity: service?.maxQuantity || 10
  };

  const getQuantityUnitLabel = (baseIncludesStr, pRules) => {
    const str = ((baseIncludesStr || '') + ' ' + (pRules?.includedUnit || '') + ' ' + (pRules?.additionalUnit || '')).toLowerCase();
    if (str.match(/person|people|guest|diner|member/)) return 'Persons';
    if (str.match(/room|bedroom|bathroom/)) return 'Rooms';
    if (str.match(/pet|dog|cat/)) return 'Pets';
    if (str.match(/vehicle|car|van/)) return 'Vehicles';
    if (str.match(/appliance|socket|light|outlet|fixture|window|radiator|portion|meal/)) return 'Units';
    if (pRules?.pricingModel === 'per_person') return 'Persons';
    if (pRules?.pricingModel === 'per_unit') return 'Units';
    return 'Units';
  };

  const quantityUnitLabel = getQuantityUnitLabel(service?.baseIncludes || '', pricingRules);

  const isQuantityBasedService = Boolean(
    service && (
      pricingRules.pricingModel === 'per_person' ||
      pricingRules.pricingModel === 'per_unit' ||
      pricingRules.enabledModels?.includes('per_person') ||
      pricingRules.enabledModels?.includes('per_unit') ||
      (service.additionalCharge > 0) ||
      (pricingRules.additionalUnitPrice > 0) ||
      (service.baseIncludes && service.baseIncludes.match(/person|people|room|pet|vehicle|unit|socket|light|portion|meal/i))
    )
  );

  const includedQty = pricingRules.includedQuantity || 1;
  const minQty = pricingRules.minimumQuantity || 1;
  const maxQty = service?.maxQuantity || pricingRules.maximumQuantity || 10;
  const addPrice = pricingRules.additionalUnitPrice ?? service?.additionalCharge ?? 0;

  const [quantity, setQuantity] = useState(() => (includedQty > 0 ? includedQty : minQty));

  useEffect(() => {
    if (service && mainCategory) {
      setDraft({
        categoryId: mainCategory.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        serviceUnit: service.unit,
        baseIncludes: service.baseIncludes || '',
        additionalCharge: service.additionalCharge || 0,
        maxQuantity: service.maxQuantity || 0,
        dynamicPricing: service.dynamicPricing || {},
      });
    }
  }, [serviceId]);

  if (!service) {
    return (
      <View style={[styles.errorLayout, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text, fontSize: 16 }}>Service details not found.</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: '#0A3925', fontWeight: '800' }}>Go Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  const handleAddonToggle = (addon) => {
    if (selectedAddons.some((a) => a.id === addon.id)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const customAddOns = service.customAddOns || service.addOns || service.addons || [];
  const whatsIncludedList = Array.isArray(service.whatsIncluded) && service.whatsIncluded.length > 0
    ? service.whatsIncluded
    : (service.baseIncludes ? [service.baseIncludes] : ['Professional execution of requested service']);
  const whatsNotIncludedList = Array.isArray(service.whatsNotIncluded) ? service.whatsNotIncluded : [];
  const faqsList = Array.isArray(service.faqs) ? service.faqs : [];

  const pricingBreakdown = calculateServicePrice({
    basePrice: service.effectivePrice || service.price || 0,
    selectedAddons: selectedAddons,
    quantity: quantity,
    pricingRules
  });

  const { subtotal } = pricingBreakdown;

  const handleBookNow = () => {
    setDraft({
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceUnit: service.unit || 'hr',
      baseIncludes: service.baseIncludes || '',
      additionalCharge: service.additionalCharge || 0,
      pricingRules,
      addOns: selectedAddons,
      serviceQuantity: quantity,
      totalPrice: subtotal,
      estimatedPricing: pricingBreakdown
    });
    navigation.navigate('BookDateTime');
  };

  const exactServiceImage = getServiceImage(service.id);
  const galleryThumbnails = getServiceGallery(service.id);
  const previewGif = getServicePreviewGif(service.id);
  const [showGif, setShowGif] = useState(false);

  return (
    <View style={styles.mainLayout}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. Hero Image Header with Layered Overlay Buttons */}
        <View style={styles.heroContainer}>
          <Image
            source={resolveImageSource(showGif && previewGif ? previewGif : exactServiceImage)}
            style={styles.heroImg}
          />
          
          {/* Optional Animated GIF Preview Badge (Replaces non-functional Play button) */}
          {previewGif && (
            <Pressable onPress={() => setShowGif(!showGif)} style={styles.gifPreviewBadge}>
              <Ionicons name={showGif ? 'image-outline' : 'play-circle-outline'} size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.gifPreviewBadgeText}>{showGif ? 'Show Static Photo' : 'Animated Preview'}</Text>
            </Pressable>
          )}

          {/* Floating Back Button */}
          <Pressable onPress={() => navigation.goBack()} style={styles.heroTopLeftBtn}>
            <Ionicons name="chevron-back" size={22} color="#0A3925" />
          </Pressable>

          {/* Floating Heart & Share Buttons */}
          <View style={styles.heroTopRightRow}>
            <Pressable onPress={() => setIsFavorite(!isFavorite)} style={styles.heroCircleBtn}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#EF4444' : '#0A3925'} />
            </Pressable>
            <Pressable onPress={() => Alert.alert('Share', 'Share link copied!')} style={styles.heroCircleBtn}>
              <Ionicons name="share-social-outline" size={20} color="#0A3925" />
            </Pressable>
          </View>
        </View>

        {/* Thumbnail Gallery Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailStripScroll}>
          {galleryThumbnails.map((imgSrc, idx) => (
            <Pressable key={idx} onPress={() => setActiveTab('gallery')} style={styles.thumbnailBox}>
              <Image source={resolveImageSource(imgSrc)} style={styles.thumbnailImg} />
              {idx === galleryThumbnails.length - 1 && (
                <View style={styles.thumbnailOverlayMore}>
                  <Text style={styles.moreThumbText}>+{galleryThumbnails.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.contentPadding}>
          {/* 2. Top Badges & Title Block */}
          <View style={styles.topBadgesRow}>
            <View style={styles.greenDiscountBadge}>
              <Ionicons name="pricetag" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.greenDiscountBadgeText}>20% OFF</Text>
            </View>

            <View style={styles.starRatingBadge}>
              {topProvider?.rating ? (
                <>
                  <Ionicons name="star" size={14} color="#EAB308" />
                  <Text style={styles.starRatingText}>{Number(topProvider.rating).toFixed(1)}</Text>
                  <Text style={styles.starRatingCountText}>({topProvider.reviewCount || 0})</Text>
                </>
              ) : (
                <Text style={styles.starRatingCountText}>New (No reviews yet)</Text>
              )}
            </View>
          </View>

          <Text style={styles.displayTitleText}>{service.name}</Text>
          
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.addressText}>128 West 34th Street, London, UK</Text>
          </View>

          {/* 3. Sub-Navigation Tabs ("About", "Gallery", "Reviews") */}
          <View style={styles.subNavTabsRow}>
            {[
              { id: 'about', label: 'About' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'reviews', label: 'Reviews' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabBtnItem}>
                  <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                    {tab.label}
                  </Text>
                  {active && <View style={styles.activeTabIndicatorBar} />}
                </Pressable>
              );
            })}
          </View>

          {/* TAB 1: ABOUT CONTENT */}
          {activeTab === 'about' && (
            <View>
              {/* Informational Read-Only Trusted Professional Card */}
              <Card style={styles.trustedProCard}>
                <View style={styles.trustedProHeaderRow}>
                  <Text style={styles.trustedProHeaderTitle}>Trusted Professional</Text>
                  {eligibleProviders.length > 0 && (
                    <Text style={styles.proCountBadge}>
                      {eligibleProviders.length} Available
                    </Text>
                  )}
                </View>

                {topProvider ? (
                  <View style={styles.trustedProContentRow}>
                    <Image
                      source={{ uri: topProvider.avatar || 'https://i.pravatar.cc/150?u=default' }}
                      style={styles.proAvatarImg}
                    />
                    <View style={styles.proMetaInfo}>
                      <Text style={styles.proNameText}>{topProvider.name}</Text>
                      <Text style={styles.proSpecialtyText}>
                        {mainCategory?.name ? `${mainCategory.name} Specialist` : 'Verified Professional'}
                      </Text>
                    </View>

                    {/* Visual Star Rating display replacing former button */}
                    <View style={styles.proStarRatingColumn}>
                      {renderStarRating(topProvider.rating, 14)}
                      <Text style={styles.proRatingNumberText}>
                        {topProvider.rating ? `${Number(topProvider.rating).toFixed(1)} (${topProvider.reviewCount || 0})` : 'New'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyProviderBox}>
                    <Ionicons name="people-outline" size={26} color="#64748B" style={{ marginBottom: 4 }} />
                    <Text style={styles.emptyProviderTitle}>No professionals currently available for this service.</Text>
                  </View>
                )}
              </Card>

              {/* Quantity Stepper Selection Card */}
              {isQuantityBasedService && (
                <Card style={styles.quantityStepperCard}>
                  <View style={styles.quantityHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quantityTitleText}>Select {quantityUnitLabel}</Text>
                      <Text style={styles.quantitySubText}>
                        {includedQty} {includedQty === 1 ? quantityUnitLabel.slice(0, -1) : quantityUnitLabel} included in base price
                        {addPrice > 0 ? ` • +£${Number(addPrice).toFixed(2)}/extra` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stepperControlsRow}>
                    <Pressable
                      disabled={quantity <= minQty}
                      onPress={() => setQuantity(Math.max(minQty, quantity - 1))}
                      style={[styles.stepperCircleBtn, quantity <= minQty && styles.stepperBtnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${quantityUnitLabel}`}
                    >
                      <Ionicons name="remove" size={20} color={quantity <= minQty ? '#94A3B8' : '#0A3925'} />
                    </Pressable>

                    <View style={styles.quantityValueBox}>
                      <Text style={styles.quantityValueText}>{quantity}</Text>
                      <Text style={styles.quantityUnitSmallLabel}>{quantityUnitLabel}</Text>
                    </View>

                    <Pressable
                      disabled={quantity >= maxQty}
                      onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      style={[styles.stepperCircleBtn, quantity >= maxQty && styles.stepperBtnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${quantityUnitLabel}`}
                    >
                      <Ionicons name="add" size={20} color={quantity >= maxQty ? '#94A3B8' : '#0A3925'} />
                    </Pressable>
                  </View>

                  {quantity > includedQty && addPrice > 0 && (
                    <View style={styles.extraChargeBanner}>
                      <Ionicons name="information-circle" size={16} color="#0A3925" style={{ marginRight: 6 }} />
                      <Text style={styles.extraChargeBannerText}>
                        Includes {quantity - includedQty} extra {quantity - includedQty === 1 ? quantityUnitLabel.slice(0, -1).toLowerCase() : quantityUnitLabel.toLowerCase()} (+£{((quantity - includedQty) * addPrice).toFixed(2)})
                      </Text>
                    </View>
                  )}
                </Card>
              )}

              {/* Service Description */}
              <View style={styles.infoSectionBox}>
                <Text style={styles.infoSectionHeading}>About Service</Text>
                <Text style={styles.serviceDescText}>
                  {service.description ||
                    'Our professional home service removes dirt, grime, and germs from every room, leaving your home spotless, fresh, and comfortable.'}
                </Text>
              </View>

              {/* What's Included */}
              <View style={styles.infoSectionBox}>
                <Text style={styles.infoSectionHeading}>What's Included</Text>
                {whatsIncludedList.map((item, idx) => (
                  <View key={idx} style={styles.listItemRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                    <Text style={styles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* What's Not Included */}
              {whatsNotIncludedList.length > 0 && (
                <View style={styles.infoSectionBox}>
                  <Text style={styles.infoSectionHeading}>What's Not Included</Text>
                  {whatsNotIncludedList.map((item, idx) => (
                    <View key={idx} style={styles.listItemRow}>
                      <Ionicons name="close-circle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                      <Text style={styles.listItemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Custom Add-ons */}
              {customAddOns.length > 0 && (
                <View style={styles.infoSectionBox}>
                  <Text style={styles.infoSectionHeading}>Custom Add-ons</Text>
                  {customAddOns.map((addon) => {
                    const selected = selectedAddons.some((a) => a.id === addon.id);
                    return (
                      <Pressable
                        key={addon.id}
                        onPress={() => handleAddonToggle(addon)}
                        style={[styles.addonCardRow, selected && styles.addonCardRowSelected]}
                      >
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={selected ? '#0A3925' : '#64748B'}
                          style={{ marginRight: 10 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addonTitleText}>{addon.name}</Text>
                          {addon.description ? <Text style={styles.addonSubText}>{addon.description}</Text> : null}
                        </View>
                        <Text style={styles.addonPriceText}>+£{addon.price}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Frequently Asked Questions (FAQs) */}
              {faqsList.length > 0 && (
                <View style={styles.infoSectionBox}>
                  <Text style={styles.infoSectionHeading}>Frequently Asked Questions</Text>
                  {faqsList.map((f, idx) => {
                    const expanded = expandedFaqIndex === idx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setExpandedFaqIndex(expanded ? null : idx)}
                        style={styles.faqItemBox}
                      >
                        <View style={styles.faqHeaderRow}>
                          <Text style={styles.faqQuestionText}>Q: {f.q}</Text>
                          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#0A3925" />
                        </View>
                        {expanded && <Text style={styles.faqAnswerText}>A: {f.a}</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: GALLERY CONTENT */}
          {activeTab === 'gallery' && (
            <View style={styles.galleryTabGrid}>
              {galleryThumbnails.map((imgSrc, idx) => (
                <Image key={idx} source={resolveImageSource(imgSrc)} style={styles.galleryFullGridImg} />
              ))}
            </View>
          )}

          {/* TAB 3: REVIEWS CONTENT */}
          {activeTab === 'reviews' && (
            <View style={styles.reviewsTabBox}>
              {topProvider?.rating ? (
                <Card style={styles.reviewTabCard}>
                  <View style={styles.revHeaderRow}>
                    <Text style={styles.revNameText}>Customer Review for {topProvider.name}</Text>
                    <Text style={styles.revDateText}>Recent</Text>
                  </View>
                  <View style={styles.revStarsRow}>
                    {renderStarRating(topProvider.rating, 14)}
                  </View>
                  <Text style={styles.revCommentText}>"Professional service, highly recommended!"</Text>
                </Card>
              ) : (
                <Text style={{ color: '#64748B', fontStyle: 'italic', paddingVertical: 12 }}>No reviews yet for this service.</Text>
              )}
            </View>
          )}
        </View>

        <VoiceAssistanceButton textToRead={`Service details for ${service.name}. Base price from £${service.price}. Tap Book Now to schedule.`} />
      </ScrollView>

      {/* Sticky Bottom Bar Pinned with Price & Dark Green Pill CTA */}
      <View style={[styles.stickyFooterBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabelText}>Total Price</Text>
          <Text style={styles.priceAmountText}>£{subtotal.toFixed(2)}</Text>
        </View>

        <Pressable onPress={handleBookNow} style={styles.bookNowPillBtn}>
          <Text style={styles.bookNowPillBtnText}>Book Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainLayout: { flex: 1, backgroundColor: '#F4F7F5' },
  scrollContent: { paddingBottom: 110 },
  errorLayout: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  heroContainer: { height: 260, width: '100%', position: 'relative' },
  heroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  gifPreviewBadge: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 57, 37, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  gifPreviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTopLeftBtn: {
    position: 'absolute',
    top: 48,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTopRightRow: {
    position: 'absolute',
    top: 48,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  heroCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailStripScroll: { paddingHorizontal: 20, marginTop: 12, marginBottom: 16 },
  thumbnailBox: { width: 70, height: 50, borderRadius: 10, overflow: 'hidden', marginRight: 10, position: 'relative' },
  thumbnailImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbnailOverlayMore: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 57, 37, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreThumbText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  contentPadding: { paddingHorizontal: 20 },
  topBadgesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  greenDiscountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  greenDiscountBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11 },
  starRatingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starRatingText: { fontWeight: '800', fontSize: 14, color: '#111827' },
  starRatingCountText: { fontSize: 12, color: '#64748B' },
  displayTitleText: { fontWeight: '900', fontSize: 22, color: '#0A3925', marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  addressText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  subNavTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2E8F0',
    marginBottom: 20,
  },
  tabBtnItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabBtnText: { fontWeight: '700', fontSize: 14, color: '#64748B' },
  tabBtnTextActive: { color: '#0A3925', fontWeight: '900' },
  activeTabIndicatorBar: {
    position: 'absolute',
    bottom: -1.5,
    height: 3,
    width: '60%',
    backgroundColor: '#0A3925',
    borderRadius: 2,
  },
  trustedProCard: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  trustedProHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  trustedProHeaderTitle: { fontWeight: '800', fontSize: 14, color: '#0A3925' },
  proCountBadge: { fontSize: 11, fontWeight: '700', color: '#16A34A', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  trustedProContentRow: { flexDirection: 'row', alignItems: 'center' },
  proAvatarImg: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  proMetaInfo: { flex: 1 },
  proNameText: { fontWeight: '800', fontSize: 15, color: '#111827' },
  proSpecialtyText: { fontSize: 12, color: '#64748B', marginTop: 1 },
  proStarRatingColumn: { alignItems: 'flex-end', justifyContent: 'center' },
  proRatingNumberText: { fontSize: 11, fontWeight: '800', color: '#64748B', marginTop: 3 },
  emptyProviderBox: { alignItems: 'center', paddingVertical: 12 },
  emptyProviderTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'center' },
  quantityStepperCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  quantityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityTitleText: {
    fontWeight: '800',
    fontSize: 15,
    color: '#0A3925',
  },
  quantitySubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepperControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 6,
  },
  stepperCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#0A3925',
    backgroundColor: '#E6ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  quantityValueBox: {
    alignItems: 'center',
    minWidth: 80,
  },
  quantityValueText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0A3925',
  },
  quantityUnitSmallLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  extraChargeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    marginTop: 12,
  },
  extraChargeBannerText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  infoSectionBox: { marginBottom: 20 },
  infoSectionHeading: { fontWeight: '800', fontSize: 16, color: '#0A3925', marginBottom: 10 },
  serviceDescText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  listItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  listItemText: { fontSize: 14, color: '#111827', fontWeight: '600' },
  addonCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  addonCardRowSelected: { borderColor: '#0A3925', backgroundColor: '#E6ECE8' },
  addonTitleText: { fontWeight: '800', fontSize: 14, color: '#111827' },
  addonSubText: { fontSize: 12, color: '#64748B', marginTop: 2 },
  addonPriceText: { fontWeight: '900', fontSize: 14, color: '#0A3925' },
  faqItemBox: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  faqHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestionText: { fontWeight: '800', fontSize: 14, color: '#111827', flex: 1, paddingRight: 8 },
  faqAnswerText: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', fontSize: 13, color: '#4B5563', lineHeight: 19 },
  galleryTabGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  galleryFullGridImg: { width: (width - 50) / 2, height: 120, borderRadius: 14 },
  reviewsTabBox: { gap: 12 },
  reviewTabCard: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  revHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  revNameText: { fontWeight: '800', color: '#111827' },
  revDateText: { fontSize: 12, color: '#64748B' },
  revStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  revCommentText: { fontSize: 13, color: '#4B5563', fontStyle: 'italic' },
  stickyFooterBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  priceContainer: { flex: 1 },
  priceLabelText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  priceAmountText: { fontSize: 20, fontWeight: '900', color: '#0A3925', marginTop: 2 },
  bookNowPillBtn: {
    backgroundColor: '#0A3925',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: radii.pill,
    shadowColor: '#0A3925',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bookNowPillBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
});
