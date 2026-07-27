const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// Public Admin Auth Route
router.post('/auth/login', adminController.login);

// All subsequent admin routes are protected by adminAuth middleware
router.use(adminAuth);

// Dashboard
router.get('/dashboard-stats', adminController.getDashboardStats);

// Categories Management
router.get('/categories', adminController.getCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.patch('/categories/:id/status', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Services Management
router.get('/services', adminController.getServices);
router.post('/services', adminController.createService);
router.get('/services/:id', adminController.getServiceById);
router.put('/services/:id', adminController.updateService);
router.patch('/services/:id/status', adminController.toggleServiceStatus);
router.patch('/services/:id/archive', adminController.archiveService);

// Platform Settings Management
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);

// Provider Management
router.get('/providers', adminController.getProviders);
router.get('/providers/:id', adminController.getProviderById);
router.patch('/providers/:id/status', adminController.updateProviderStatus);
router.patch('/providers/:id/services/:serviceId/status', adminController.toggleProviderServiceAccess);

module.exports = router;
