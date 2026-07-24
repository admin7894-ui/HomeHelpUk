export function getServiceName(categoryId, categories) {
  if (!categories || categories.length === 0) return 'Unknown Service';
  
  let serviceName = 'Unknown Service';
  
  for (const cat of categories) {
    if (cat.id === categoryId) {
      serviceName = cat.name;
      break;
    }
    const subs = cat.subCategories || cat.subcategories;
    if (subs) {
      for (const sub of subs) {
        if (sub.id === categoryId) {
          serviceName = sub.name;
          break;
        }
        const srv = sub.services?.find(s => s.id === categoryId);
        if (srv) {
          serviceName = srv.name;
          break;
        }
      }
    }
    if (serviceName !== 'Unknown Service') break;
  }
  
  return serviceName;
}
