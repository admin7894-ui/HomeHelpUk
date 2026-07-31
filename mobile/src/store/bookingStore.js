import { create } from 'zustand';
import api from '../services/api';

// In-progress booking draft (service -> provider -> schedule -> payment) plus
// cached lists used across Customer and Provider screens.
export const INITIAL_DRAFT = {
  categoryId: null,
  subCategoryId: null,
  serviceId: null,
  serviceName: '',
  servicePrice: 0,
  serviceUnit: 'hr',
  serviceQuantity: 1, // Single source of truth for numPeople / numRooms / numUnits
  durationHours: 2,
  date: null,
  time: null,
  address: '',
  notes: '',
  addOns: [],
  providerId: null,
  selectedProvider: null,
  pricingRules: null,
  pricingSnapshot: null,
  familySize: null,
  familySizeLabel: '',
  movingDetails: null,
  couponCode: '',
  couponDiscount: 0,
};

const LAUNCH_CATEGORY_ORDER = [
  'cat_cooking',
  'cat_cleaning',
  'cat_laundry',
  'cat_gardening',
  'cat_handyman',
  'cat_moving',
  'cat_home_services',
  'cat_pet_care',
  'cat_vehicle_care',
  'cat_beauty'
];

export const useBookingStore = create((set, get) => ({
  draft: { ...INITIAL_DRAFT },
  categories: [],
  providers: [],
  bookings: [],
  loading: false,
  error: null,

  setDraft: (updates) => set({ draft: { ...get().draft, ...updates } }),
  resetDraft: () => set({ draft: { ...INITIAL_DRAFT } }),

  updateBookingInStore: (updatedBooking) => {
    if (!updatedBooking || !updatedBooking.id) return;
    const { bookings } = get();
    const exists = bookings.some(b => b.id === updatedBooking.id);
    if (exists) {
      set({
        bookings: bookings.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)
      });
    } else {
      set({ bookings: [updatedBooking, ...bookings] });
    }
  },

  removeBookingFromStore: (bookingId) => {
    if (!bookingId) return;
    set({
      bookings: get().bookings.filter(b => b.id !== bookingId)
    });
  },

  invalidateCategories: () => {
    set({ categoriesLastFetched: 0 });
  },

  categoriesLastFetched: 0,
  categoriesInFlight: null,

  fetchCategories: async (forceRefresh = false) => {
    const { categories, categoriesLastFetched, categoriesInFlight } = get();
    const now = Date.now();
    const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

    // 1. Stale-while-revalidate check: use cached if fresh and not forced
    if (!forceRefresh && categories.length > 0 && (now - categoriesLastFetched < STALE_TIME_MS)) {
      return categories;
    }

    // 2. Reuse in-flight request if identical request is already running
    if (categoriesInFlight) {
      return categoriesInFlight;
    }

    const requestPromise = (async () => {
      set({ loading: categories.length === 0, error: null });
      try {
        const url = forceRefresh ? `/categories?summary=true&nocache=true&_t=${Date.now()}` : '/categories?summary=true';
        const { data } = await api.get(url);
        const sorted = (data.categories || []).sort((a, b) => {
          const idxA = LAUNCH_CATEGORY_ORDER.indexOf(a.id);
          const idxB = LAUNCH_CATEGORY_ORDER.indexOf(b.id);
          const orderA = idxA !== -1 ? idxA : 99;
          const orderB = idxB !== -1 ? idxB : 99;
          if (orderA !== orderB) return orderA - orderB;
          return 0;
        });
        set({ categories: sorted, categoriesLastFetched: Date.now(), loading: false, categoriesInFlight: null });
        return sorted;
      } catch (err) {
        set({ error: err.message, loading: false, categoriesInFlight: null });
        return categories;
      }
    })();

    set({ categoriesInFlight: requestPromise });
    return requestPromise;
  },

  fetchProviders: async (categoryId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/providers', { params: categoryId ? { categoryId } : {} });
      set({ providers: data.providers, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchProvidersByService: async (serviceId, date, time, durationHours) => {
    set({ loading: true, error: null });
    try {
      const params = { serviceId };

      // Filter add-ons: only include add-ons where requiresSeparateProvider == false
      const draftAddons = get().draft.addOns || [];
      const sameProviderAddons = draftAddons
        .filter(a => !a.requiresSeparateProvider)
        .map(a => a.serviceId || a.id)
        .filter(Boolean);

      if (sameProviderAddons.length > 0) {
        params.addonServiceIds = sameProviderAddons.join(',');
      }

      if (date && time) {
        params.date = date;
        params.time = time;
        if (durationHours) params.durationHours = durationHours;
      }
      const { data } = await api.get('/providers', { params });
      set({ providers: data.providers, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  bookingsLastFetched: 0,
  bookingsInFlight: null,

  fetchBookings: async (params = {}, forceRefresh = false) => {
    const { bookings, bookingsLastFetched, bookingsInFlight } = get();
    const now = Date.now();
    const STALE_TIME_MS = 60 * 1000; // 1 minute stale time for active bookings

    if (!forceRefresh && bookings.length > 0 && (now - bookingsLastFetched < STALE_TIME_MS)) {
      return bookings;
    }

    if (bookingsInFlight) {
      return bookingsInFlight;
    }

    const requestPromise = (async () => {
      set({ loading: bookings.length === 0, error: null });
      try {
        const { data } = await api.get('/bookings', { params });
        const fetchedBookings = data.bookings || [];
        set({ bookings: fetchedBookings, bookingsLastFetched: Date.now(), loading: false, bookingsInFlight: null });
        return fetchedBookings;
      } catch (err) {
        set({ error: err.message, loading: false, bookingsInFlight: null });
        return bookings;
      }
    })();

    set({ bookingsInFlight: requestPromise });
    return requestPromise;
  },

  providerProfileCache: {},
  providerProfileLastFetched: {},
  providerProfileInFlight: {},

  fetchProviderDetails: async (providerId, forceRefresh = false) => {
    if (!providerId) return null;
    const { providerProfileCache, providerProfileLastFetched, providerProfileInFlight } = get();
    const now = Date.now();
    const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes stale time

    if (!forceRefresh && providerProfileCache[providerId] && (now - (providerProfileLastFetched[providerId] || 0) < STALE_TIME_MS)) {
      return providerProfileCache[providerId];
    }

    if (providerProfileInFlight[providerId]) {
      return providerProfileInFlight[providerId];
    }

    const requestPromise = (async () => {
      try {
        const { data } = await api.get(`/providers/${providerId}`);
        const providerData = data.provider || null;
        set((state) => ({
          providerProfileCache: { ...state.providerProfileCache, [providerId]: providerData },
          providerProfileLastFetched: { ...state.providerProfileLastFetched, [providerId]: Date.now() },
          providerProfileInFlight: { ...state.providerProfileInFlight, [providerId]: null }
        }));
        return providerData;
      } catch (err) {
        set((state) => ({
          providerProfileInFlight: { ...state.providerProfileInFlight, [providerId]: null }
        }));
        return providerProfileCache[providerId] || null;
      }
    })();

    set((state) => ({
      providerProfileInFlight: { ...state.providerProfileInFlight, [providerId]: requestPromise }
    }));
    return requestPromise;
  },

  createBooking: async (payload) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/bookings', payload);
      set({ loading: false });
      return data.booking;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updateBookingStatus: async (id, status) => {
    const { data } = await api.patch(`/bookings/${id}/status`, { status });
    return data.booking;
  },
}));
