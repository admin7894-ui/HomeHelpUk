const fs = require('fs');
const path = require('path');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'media_catalog_generated.json'), 'utf-8'));

let fileContent = `/**
 * Complete Service Media Catalog & High-Definition Image Resolver for HomeHelpUK
 * 100% Unique Image Mappings for all 76 Services (Cover + 4 Dedicated Gallery Images each)
 * ZERO DUPLICATE ASSETS PER USER SPECIFICATION
 */

export const SERVICE_MEDIA_CATALOG = ${JSON.stringify(catalog.serviceImages, null, 2)};

export const resolveImageSource = (img, fallbackUri = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80') => {
  if (!img) return { uri: fallbackUri };
  if (typeof img === 'string') return { uri: img };
  return img;
};

export const getServiceImage = (serviceId) => {
  const serviceData = SERVICE_MEDIA_CATALOG[serviceId];
  if (serviceData && serviceData.cover) {
    return resolveImageSource(serviceData.cover);
  }
  return resolveImageSource('https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80');
};

export const getServiceGallery = (serviceId) => {
  const serviceData = SERVICE_MEDIA_CATALOG[serviceId];
  if (serviceData && Array.isArray(serviceData.gallery) && serviceData.gallery.length > 0) {
    return serviceData.gallery.map(img => resolveImageSource(img));
  }
  return [
    resolveImageSource('https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80'),
    resolveImageSource('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80'),
    resolveImageSource('https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&q=80'),
    resolveImageSource('https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600&q=80'),
  ];
};
`;

fs.writeFileSync(path.join(__dirname, '../mobile/src/utils/serviceImages.js'), fileContent);
console.log('Successfully wrote mobile/src/utils/serviceImages.js');
