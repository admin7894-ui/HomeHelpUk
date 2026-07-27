import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView, Dimensions, Alert, TextInput } from 'react-native';
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
import {
  MOVE_SIZE_OPTIONS,
  PROPERTY_SIZE_OPTIONS,
  MOVING_ITEMS_LIST,
  MOVING_ASSISTANCE_OPTIONS,
  VEHICLE_OPTIONS,
  getServiceType,
  resolveUnitConfig,
  getServiceConfig
} from '../../utils/serviceConfig';

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

  // Fetch Service object
  const findService = () => {
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

  const { service, mainCategory } = findService();

  useEffect(() => {
    if (service) {
      fetchProvidersByService(service.id);
    }
  }, [serviceId]);

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

  const serviceConfig = getServiceConfig(serviceId, service, mainCategory);

  if (serviceConfig.isActive === false) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" style={{ marginBottom: 16 }} />
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
          Service Unavailable
        </Text>
        <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
          This service is no longer available on HomeHelpUK.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: '#0A3925', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 }}
          onPress={() => navigation.navigate('CategoriesScreen')}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Browse Available Services</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unitConfig = serviceConfig.quantityConfig;
  const isQuantityBasedService = unitConfig.enabled;

  const includedQty = unitConfig.includedQty || 1;
  const minQty = unitConfig.minQty || 1;
  const maxQty = unitConfig.maxQty || 20;
  const addPrice = unitConfig.extraUnitPrice || 0;

  const serviceType = getServiceType(service, mainCategory);
  const isMovingService = serviceType === 'MOVING';
  const isCookingService = serviceType === 'COOKING';

  // Moving Help State
  const [selectedMoveSizeId, setSelectedMoveSizeId] = useState('small_move');
  const [pickupAddress, setPickupAddress] = useState(draft?.address || '128 West 34th Street, London, UK');
  const [destinationAddress, setDestinationAddress] = useState('45 Oxford Street, London, UK');
  const [selectedPropertySizeId, setSelectedPropertySizeId] = useState('2bed');
  const [itemQuantities, setItemQuantities] = useState({ sofa: 1, boxes: 5, bed: 1 });
  const [selectedAssistance, setSelectedAssistance] = useState(['load_unload']);
  const [selectedVehicleId, setSelectedVehicleId] = useState('large_van');

  const updateItemQty = (itemId, delta) => {
    setItemQuantities(prev => {
      const current = prev[itemId] || 0;
      const updated = Math.max(0, current + delta);
      if (updated === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: updated };
    });
  };

  const toggleAssistance = (assistId) => {
    setSelectedAssistance(prev =>
      prev.includes(assistId) ? prev.filter(id => id !== assistId) : [...prev, assistId]
    );
  };

  // Compute Moving Costs
  const currentMoveSize = MOVE_SIZE_OPTIONS.find(m => m.id === selectedMoveSizeId) || MOVE_SIZE_OPTIONS[0];
  const currentPropertySize = PROPERTY_SIZE_OPTIONS.find(p => p.id === selectedPropertySizeId) || PROPERTY_SIZE_OPTIONS[0];
  const currentVehicle = VEHICLE_OPTIONS.find(v => v.id === selectedVehicleId) || VEHICLE_OPTIONS[0];

  const moveSizeCost = currentMoveSize.priceAdjustment || 0;
  const propertySizeCost = (isMovingService && currentMoveSize.requiresPropertySize) ? (currentPropertySize.priceAdjustment || 0) : 0;
  const vehicleCost = isMovingService ? (currentVehicle.price || 0) : 0;

  const itemsCost = isMovingService ? Object.entries(itemQuantities).reduce((sum, [itemId, qty]) => {
    const itemDef = MOVING_ITEMS_LIST.find(i => i.id === itemId);
    return sum + (itemDef ? itemDef.unitPrice * qty : 0);
  }, 0) : 0;

  const assistanceCost = isMovingService ? selectedAssistance.reduce((sum, assistId) => {
    const assistDef = MOVING_ASSISTANCE_OPTIONS.find(a => a.id === assistId);
    return sum + (assistDef ? assistDef.price : 0);
  }, 0) : 0;

  const movingAdditionsTotal = moveSizeCost + propertySizeCost + vehicleCost + itemsCost + assistanceCost;

  const FAMILY_SIZE_OPTIONS = [
    { id: 'small', title: 'Small Family', peopleRange: '1–3 people', description: 'Basic meal prep', quantity: 3 },
    { id: 'medium', title: 'Medium Family', peopleRange: '4–6 people', description: 'Standard meal prep', quantity: 5 },
    { id: 'large', title: 'Large Family', peopleRange: '7+ people', description: 'Generous meal prep', quantity: 8 },
  ];

  const [selectedFamilySizeId, setSelectedFamilySizeId] = useState('small');
  const [quantity, setQuantity] = useState(() => (includedQty > 0 ? includedQty : minQty));

  const familyOptionsWithPricing = FAMILY_SIZE_OPTIONS.map((option) => {
    const calc = calculateServicePrice({
      basePrice: service?.effectivePrice || service?.price || 0,
      selectedAddons: selectedAddons,
      quantity: option.quantity,
      pricingRules
    });
    return { ...option, subtotal: calc.subtotal, extraUnitsCost: calc.extraUnitsCost, extraUnits: calc.extraUnits };
  });

  const selectedFamilyOption = familyOptionsWithPricing.find((o) => o.id === selectedFamilySizeId) || familyOptionsWithPricing[0];
  const activeQuantity = isCookingService ? selectedFamilyOption.quantity : quantity;

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

  const whatsIncludedList = Array.isArray(service.includedItems) && service.includedItems.length > 0
    ? service.includedItems
    : (Array.isArray(service.whatsIncluded) && service.whatsIncluded.length > 0 ? service.whatsIncluded : (service.baseIncludes ? [service.baseIncludes] : ['Professional execution of requested service']));

  const whatsNotIncludedList = Array.isArray(service.notIncludedItems) && service.notIncludedItems.length > 0
    ? service.notIncludedItems
    : (Array.isArray(service.whatsNotIncluded) ? service.whatsNotIncluded : []);

  const faqsList = Array.isArray(service.faqs) ? service.faqs : [];

  const getReferencedService = (targetId) => {
    if (!targetId) return null;
    for (const cat of categories) {
      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const match = (sub.services || []).find((s) => s.id === targetId);
          if (match) return { ...match, categoryName: cat.name };
        }
      }
    }
    return null;
  };

  const rawAddons = service.availableAddOns || service.addons || service.customAddOns || [];
  const resolvedAddonsList = rawAddons.map((item, index) => {
    const targetServiceId = item.serviceId || item.id;
    const refSrv = getReferencedService(targetServiceId);
    const name = item.name || refSrv?.name || `Add-on ${index + 1}`;
    const description = item.description || refSrv?.description || (refSrv?.categoryName ? `Service from ${refSrv.categoryName}` : 'Optional service add-on');
    const price = Number(item.price ?? refSrv?.price ?? 10);
    const requiresSeparateProvider = item.requiresSeparateProvider ?? (refSrv && refSrv.categoryId !== service.categoryId);
    return { id: targetServiceId || `addon_${index}`, serviceId: targetServiceId, name, description, price, requiresSeparateProvider: Boolean(requiresSeparateProvider), providerId: null };
  });

  const handleAddonToggle = (addon) => {
    if (selectedAddons.some((a) => a.id === addon.id || a.serviceId === addon.serviceId)) {
      setSelectedAddons(selectedAddons.filter((a) => a.id !== addon.id && a.serviceId !== addon.serviceId));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Generic Stepper Extra Calculation:
  // totalPrice = basePrice + Math.max(0, quantity - unitConfig.includedQty) * unitConfig.extraUnitPrice
  const extraUnitsCount = Math.max(0, activeQuantity - includedQty);
  const extraUnitsPriceCost = extraUnitsCount * addPrice;
  const pricingBreakdown = calculateServicePrice({
    basePrice: (service?.effectivePrice || service?.price || 0) + (isMovingService ? movingAdditionsTotal : 0),
    selectedAddons: selectedAddons,
    quantity: isMovingService ? 1 : activeQuantity,
    pricingRules,
    serviceConfig,
    serviceId: service.id
  });

  const { subtotal } = pricingBreakdown;

  const handleBookNow = () => {
    const formattedAddons = selectedAddons.map((a) => ({
      serviceId: a.serviceId || a.id,
      name: a.name,
      price: Number(a.price) || 0,
      requiresSeparateProvider: Boolean(a.requiresSeparateProvider),
      providerId: null
    }));

    const familySizeData = isCookingService
      ? { id: selectedFamilyOption.id, title: selectedFamilyOption.title, peopleRange: selectedFamilyOption.peopleRange, label: `${selectedFamilyOption.title} (${selectedFamilyOption.peopleRange})` }
      : null;

    const movingDetailsData = isMovingService
      ? { moveSize: currentMoveSize, pickupAddress, destinationAddress, propertySize: currentMoveSize.requiresPropertySize ? currentPropertySize : null, itemsToMove: itemQuantities, assistance: selectedAssistance.map(id => MOVING_ASSISTANCE_OPTIONS.find(a => a.id === id)), vehicle: currentVehicle }
      : null;

    setDraft({
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceUnit: service.unit || 'hr',
      baseIncludes: service.baseIncludes || '',
      additionalCharge: service.additionalCharge || 0,
      unitConfig,
      pricingRules,
      addOns: formattedAddons,
      serviceQuantity: isMovingService ? 1 : activeQuantity,
      familySize: familySizeData,
      familySizeLabel: familySizeData ? familySizeData.label : '',
      movingDetails: movingDetailsData,
      totalPrice: subtotal,
      estimatedPricing: pricingBreakdown
    });
    navigation.navigate('BookDateTime');
  };

  const exactServiceImage = getServiceImage(service);
  const galleryThumbnails = getServiceGallery(service);
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

              {/* Moving Help Custom Service Detail Section */}
              {isMovingService ? (
                <View style={{ marginBottom: 16 }}>
                  {/* 1. What are you moving? (Move Size Selection) */}
                  <Card style={styles.familySizeContainerCard}>
                    <View style={styles.familySizeHeaderRow}>
                      <Ionicons name="cube" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.familySizeHeaderTitle}>What are you moving?</Text>
                        <Text style={styles.familySizeHeaderSub}>Select the option that best describes your move.</Text>
                      </View>
                    </View>

                    <View style={{ gap: 10 }}>
                      {MOVE_SIZE_OPTIONS.map((opt) => {
                        const isSelected = selectedMoveSizeId === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => setSelectedMoveSizeId(opt.id)}
                            style={[
                              styles.familyOptionCard,
                              isSelected ? styles.familyOptionCardSelected : styles.familyOptionCardUnselected
                            ]}
                          >
                            <View style={styles.familyOptionLeftRow}>
                              <View style={[styles.familyOptionRadioCircle, isSelected && styles.familyOptionRadioCircleSelected]}>
                                {isSelected ? (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                ) : (
                                  <View style={styles.familyOptionRadioInnerDot} />
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.familyOptionTitle, isSelected && styles.familyOptionTitleSelected]}>
                                  {opt.title}
                                </Text>
                                <Text style={styles.familyOptionDesc}>{opt.subtitle}</Text>
                              </View>
                            </View>
                            {opt.priceAdjustment > 0 && (
                              <Text style={[styles.familyOptionPriceText, isSelected && { color: '#0A3925', fontWeight: '800' }]}>
                                +£{opt.priceAdjustment}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </Card>

                  {/* 2. Moving From & Moving To Addresses */}
                  <Card style={styles.familySizeContainerCard}>
                    <View style={styles.familySizeHeaderRow}>
                      <Ionicons name="map" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                      <Text style={styles.familySizeHeaderTitle}>Locations</Text>
                    </View>

                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>Moving From (Pickup Address)</Text>
                      <View style={styles.movingAddressBox}>
                        <Ionicons name="location" size={18} color="#16A34A" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.movingAddressInput}
                          value={pickupAddress}
                          onChangeText={setPickupAddress}
                          placeholder="Enter pickup address..."
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>

                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 }}>Moving To (Destination Address)</Text>
                      <View style={styles.movingAddressBox}>
                        <Ionicons name="pin" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                        <TextInput
                          style={styles.movingAddressInput}
                          value={destinationAddress}
                          onChangeText={setDestinationAddress}
                          placeholder="Enter destination address..."
                          placeholderTextColor="#94A3B8"
                        />
                      </View>
                    </View>
                  </Card>

                  {/* 3. Property Size (shown if Move Size requires property size) */}
                  {currentMoveSize.requiresPropertySize && (
                    <Card style={styles.familySizeContainerCard}>
                      <View style={styles.familySizeHeaderRow}>
                        <Ionicons name="home" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                        <Text style={styles.familySizeHeaderTitle}>What size is the property?</Text>
                      </View>

                      <View style={styles.propertyGrid}>
                        {PROPERTY_SIZE_OPTIONS.map((prop) => {
                          const isSelected = selectedPropertySizeId === prop.id;
                          return (
                            <Pressable
                              key={prop.id}
                              onPress={() => setSelectedPropertySizeId(prop.id)}
                              style={[
                                styles.propertyGridPill,
                                isSelected ? styles.propertyGridPillSelected : styles.propertyGridPillUnselected
                              ]}
                            >
                              <Text style={[styles.propertyPillText, isSelected && styles.propertyPillTextSelected]}>
                                {prop.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </Card>
                  )}

                  {/* 4. What items need moving? (Optional Item Counters) */}
                  <Card style={styles.familySizeContainerCard}>
                    <View style={styles.familySizeHeaderRow}>
                      <Ionicons name="list" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.familySizeHeaderTitle}>What items need moving?</Text>
                        <Text style={styles.familySizeHeaderSub}>Optional: select items for accurate helper matching.</Text>
                      </View>
                    </View>

                    <View style={{ gap: 8 }}>
                      {MOVING_ITEMS_LIST.map((item) => {
                        const qty = itemQuantities[item.id] || 0;
                        return (
                          <View key={item.id} style={styles.itemRowBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Ionicons name={item.icon} size={18} color="#0A3925" style={{ marginRight: 10 }} />
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B' }}>{item.name}</Text>
                            </View>

                            <View style={styles.itemCounterRow}>
                              <Pressable
                                disabled={qty <= 0}
                                onPress={() => updateItemQty(item.id, -1)}
                                style={[styles.itemCounterCircleBtn, qty <= 0 && { opacity: 0.4 }]}
                              >
                                <Ionicons name="remove" size={14} color="#0A3925" />
                              </Pressable>
                              <Text style={styles.itemQtyValText}>{qty}</Text>
                              <Pressable
                                onPress={() => updateItemQty(item.id, 1)}
                                style={styles.itemCounterCircleBtn}
                              >
                                <Ionicons name="add" size={14} color="#0A3925" />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </Card>

                  {/* 5. What help do you need? (Moving Assistance) */}
                  <Card style={styles.familySizeContainerCard}>
                    <View style={styles.familySizeHeaderRow}>
                      <Ionicons name="hand-left" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.familySizeHeaderTitle}>What help do you need?</Text>
                        <Text style={styles.familySizeHeaderSub}>Select optional assistance required.</Text>
                      </View>
                    </View>

                    <View style={{ gap: 8 }}>
                      {MOVING_ASSISTANCE_OPTIONS.map((assist) => {
                        const isChecked = selectedAssistance.includes(assist.id);
                        return (
                          <Pressable
                            key={assist.id}
                            onPress={() => toggleAssistance(assist.id)}
                            style={[
                              styles.assistanceChipRow,
                              isChecked ? styles.assistanceChipRowChecked : styles.assistanceChipRowUnchecked
                            ]}
                          >
                            <Ionicons
                              name={isChecked ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={isChecked ? '#0A3925' : '#94A3B8'}
                              style={{ marginRight: 10 }}
                            />
                            <Text style={[styles.assistanceChipLabel, isChecked && { fontWeight: '800', color: '#0A3925' }]}>
                              {assist.label}
                            </Text>
                            <Text style={styles.assistancePriceTag}>+£{assist.price}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </Card>

                  {/* 6. Vehicle Requirement */}
                  <Card style={styles.familySizeContainerCard}>
                    <View style={styles.familySizeHeaderRow}>
                      <Ionicons name="car" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.familySizeHeaderTitle}>Do you need a vehicle?</Text>
                      </View>
                    </View>

                    <View style={{ gap: 10 }}>
                      {VEHICLE_OPTIONS.map((v) => {
                        const isSelected = selectedVehicleId === v.id;
                        return (
                          <Pressable
                            key={v.id}
                            onPress={() => setSelectedVehicleId(v.id)}
                            style={[
                              styles.familyOptionCard,
                              isSelected ? styles.familyOptionCardSelected : styles.familyOptionCardUnselected
                            ]}
                          >
                            <View style={styles.familyOptionLeftRow}>
                              <View style={[styles.familyOptionRadioCircle, isSelected && styles.familyOptionRadioCircleSelected]}>
                                {isSelected ? (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                ) : (
                                  <View style={styles.familyOptionRadioInnerDot} />
                                )}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.familyOptionTitle, isSelected && styles.familyOptionTitleSelected]}>
                                  {v.title}
                                </Text>
                                <Text style={styles.familyOptionDesc}>{v.subtitle}</Text>
                              </View>
                            </View>
                            {v.price > 0 && (
                              <Text style={[styles.familyOptionPriceText, isSelected && { color: '#0A3925', fontWeight: '800' }]}>
                                +£{v.price}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </Card>
                </View>
              ) : isCookingService ? (
                <Card style={styles.familySizeContainerCard}>
                  <View style={styles.familySizeHeaderRow}>
                    <Ionicons name="restaurant" size={20} color="#0A3925" style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.familySizeHeaderTitle}>Select Family Size</Text>
                      <Text style={styles.familySizeHeaderSub}>
                        Choose the option that best matches the number of people you need the service for.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.familySizeCardsList}>
                    {familyOptionsWithPricing.map((opt) => {
                      const isSelected = selectedFamilySizeId === opt.id;
                      const addCost = opt.extraUnitsCost;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => {
                            setSelectedFamilySizeId(opt.id);
                            setQuantity(opt.quantity);
                          }}
                          style={[
                            styles.familyOptionCard,
                            isSelected ? styles.familyOptionCardSelected : styles.familyOptionCardUnselected
                          ]}
                        >
                          <View style={styles.familyOptionLeftRow}>
                            <View style={[styles.familyOptionRadioCircle, isSelected && styles.familyOptionRadioCircleSelected]}>
                              {isSelected ? (
                                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                              ) : (
                                <View style={styles.familyOptionRadioInnerDot} />
                              )}
                            </View>

                            <View style={styles.familyOptionTextCol}>
                              <View style={styles.familyOptionTitleRow}>
                                <Text style={[styles.familyOptionTitle, isSelected && styles.familyOptionTitleSelected]}>
                                  {opt.title}
                                </Text>
                                <View style={[styles.peopleBadgePill, isSelected && styles.peopleBadgePillSelected]}>
                                  <Text style={[styles.peopleBadgeText, isSelected && styles.peopleBadgeTextSelected]}>
                                    {opt.peopleRange}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.familyOptionDesc}>{opt.description}</Text>
                            </View>
                          </View>

                          <View style={styles.familyOptionPriceCol}>
                            <Text style={[styles.familyOptionPriceText, isSelected && styles.familyOptionPriceTextSelected]}>
                              £{opt.subtotal.toFixed(2)}
                            </Text>
                            {addCost > 0 ? (
                              <Text style={styles.familyOptionExtraChargeText}>
                                (+£{addCost.toFixed(2)})
                              </Text>
                            ) : (
                              <Text style={styles.familyOptionBaseIncludedText}>
                                Base price
                              </Text>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </Card>
              ) : isQuantityBasedService ? (
                /* Fully Data-Driven Quantity Stepper Card (Using unitConfig) */
                <Card style={styles.quantityStepperCard}>
                  <View style={styles.quantityHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quantityTitleText}>{unitConfig.sectionTitle}</Text>
                      <Text style={styles.quantitySubText}>
                        {unitConfig.includedQty} {unitConfig.unitLabelPlural} included in base price
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
                      accessibilityLabel={`Decrease ${unitConfig.unitLabelPlural}`}
                    >
                      <Ionicons name="remove" size={20} color={quantity <= minQty ? '#94A3B8' : '#0A3925'} />
                    </Pressable>

                    <View style={styles.quantityValueBox}>
                      <Text style={styles.quantityValueText}>{quantity}</Text>
                      <Text style={styles.quantityUnitSmallLabel}>
                        {quantity === 1 ? unitConfig.unitLabel : unitConfig.unitLabelPlural}
                      </Text>
                    </View>

                    <Pressable
                      disabled={quantity >= maxQty}
                      onPress={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      style={[styles.stepperCircleBtn, quantity >= maxQty && styles.stepperBtnDisabled]}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${unitConfig.unitLabelPlural}`}
                    >
                      <Ionicons name="add" size={20} color={quantity >= maxQty ? '#94A3B8' : '#0A3925'} />
                    </Pressable>
                  </View>

                  {quantity > includedQty && addPrice > 0 && (
                    <View style={styles.extraChargeBanner}>
                      <Ionicons name="information-circle" size={16} color="#0A3925" style={{ marginRight: 6 }} />
                      <Text style={styles.extraChargeBannerText}>
                        Includes {quantity - includedQty} extra {quantity - includedQty === 1 ? unitConfig.unitLabel.toLowerCase() : unitConfig.unitLabelPlural.toLowerCase()} (+£{((quantity - includedQty) * addPrice).toFixed(2)})
                      </Text>
                    </View>
                  )}
                </Card>
              ) : null}

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

              {/* Add-on Services (Positioned between What's Not Included and FAQs) */}
              {resolvedAddonsList.length > 0 && (
                <View style={styles.infoSectionBox}>
                  <Text style={styles.infoSectionHeading}>Add-on Services</Text>
                  {resolvedAddonsList.map((addon) => {
                    const selected = selectedAddons.some((a) => a.id === addon.id || a.serviceId === addon.serviceId);
                    return (
                      <Pressable
                        key={addon.id}
                        onPress={() => handleAddonToggle(addon)}
                        style={[styles.addonCardRow, selected && styles.addonCardRowSelected]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`Add-on ${addon.name}, plus £${Number(addon.price).toFixed(2)}`}
                      >
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selected ? '#0A3925' : '#94A3B8'}
                          style={{ marginRight: 12 }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addonTitleText}>{addon.name}</Text>
                          {addon.description ? <Text style={styles.addonSubText}>{addon.description}</Text> : null}
                          {addon.requiresSeparateProvider && (
                            <Text style={{ fontSize: 11, color: '#059669', marginTop: 2, fontWeight: '600' }}>
                              ✓ Independent Specialist Provider
                            </Text>
                          )}
                        </View>
                        <Text style={styles.addonPriceText}>+£{Number(addon.price).toFixed(2)}</Text>
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
  familySizeContainerCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  familySizeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  familySizeHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A3925',
  },
  familySizeHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  familySizeCardsList: {
    gap: 10,
  },
  familyOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  familyOptionCardSelected: {
    borderColor: '#0A3925',
    backgroundColor: '#F0FDF4',
  },
  familyOptionCardUnselected: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  familyOptionLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  familyOptionRadioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  familyOptionRadioCircleSelected: {
    borderColor: '#0A3925',
    backgroundColor: '#0A3925',
  },
  familyOptionRadioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  familyOptionTextCol: {
    flex: 1,
  },
  familyOptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  familyOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  familyOptionTitleSelected: {
    color: '#0A3925',
    fontWeight: '800',
  },
  peopleBadgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  peopleBadgePillSelected: {
    backgroundColor: '#DCFCE7',
  },
  peopleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  peopleBadgeTextSelected: {
    color: '#166534',
    fontWeight: '700',
  },
  familyOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  familyOptionPriceCol: {
    alignItems: 'flex-end',
  },
  familyOptionPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  familyOptionPriceTextSelected: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0A3925',
  },
  familyOptionExtraChargeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 1,
  },
  familyOptionBaseIncludedText: {
    fontSize: 10,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 1,
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
  movingAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  movingAddressInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  propertyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  propertyGridPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  propertyGridPillSelected: {
    borderColor: '#0A3925',
    backgroundColor: '#F0FDF4',
  },
  propertyGridPillUnselected: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  propertyPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  propertyPillTextSelected: {
    color: '#0A3925',
    fontWeight: '800',
  },
  itemRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemCounterCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0A3925',
    backgroundColor: '#E6ECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemQtyValText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0A3925',
    minWidth: 20,
    textAlign: 'center',
  },
  assistanceChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  assistanceChipRowChecked: {
    borderColor: '#0A3925',
    backgroundColor: '#F0FDF4',
  },
  assistanceChipRowUnchecked: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  assistanceChipLabel: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
  },
  assistancePriceTag: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A3925',
  },
});
