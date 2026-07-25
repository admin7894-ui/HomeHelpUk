const fs = require('fs');
const path = require('path');
const { findCategoryOrService } = require('../utils/helpers');
const { findCanonicalService, mergeServiceDetails } = require('../utils/serviceMerger');

const categoriesPath = path.join(__dirname, '../data/categories.json');
const providersPath = path.join(__dirname, '../data/providers.json');

exports.getAll = (req, res) => {
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  res.json({ success: true, categories });
};

exports.getById = (req, res) => {
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  const category = findCategoryOrService(categories, req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category or service not found' });
  res.json({ success: true, category });
};

exports.getServiceDetail = (req, res) => {
  const { serviceId } = req.params;
  const { providerId } = req.query;
  const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));

  const { service, mainCategory } = findCanonicalService(categories, serviceId);
  if (!service) {
    return res.status(404).json({ success: false, message: 'Service not found' });
  }

  let providerServiceRecord = null;
  if (providerId) {
    try {
      const providers = JSON.parse(fs.readFileSync(providersPath, 'utf-8'));
      const provider = providers.find(p => p.id === providerId);
      if (provider && Array.isArray(provider.services)) {
        providerServiceRecord = provider.services.find(s => s.serviceId === serviceId);
      }
    } catch (err) {
      // Ignore provider read error
    }
  }

  const mergedService = mergeServiceDetails(service, providerServiceRecord);
  res.json({ success: true, service: mergedService, mainCategory });
};

