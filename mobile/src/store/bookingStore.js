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

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/categories');
      const sorted = (data.categories || []).sort((a, b) => {
        const idxA = LAUNCH_CATEGORY_ORDER.indexOf(a.id);
        const idxB = LAUNCH_CATEGORY_ORDER.indexOf(b.id);
        const orderA = idxA !== -1 ? idxA : 99;
        const orderB = idxB !== -1 ? idxB : 99;
        if (orderA !== orderB) return orderA - orderB;
        return 0;
      });
      set({ categories: sorted, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
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

  fetchBookings: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.get('/bookings', { params });
      set({ bookings: data.bookings, loading: false });
      return data.bookings;
    } catch (err) {
      set({ error: err.message, loading: false });
      return [];
    }
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
