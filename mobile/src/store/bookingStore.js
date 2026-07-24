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
      set({ categories: data.categories, loading: false });
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
