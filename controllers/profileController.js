const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

exports.update = (req, res) => {
  const users = readJson(usersPath);
  const index = users.findIndex((u) => u.id === req.params.id);
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your profile' });
  }

  const { name, phone, avatar, addresses, onboardingComplete, verifiedPhone } = req.body;
  if (name !== undefined) users[index].name = name;
  if (phone !== undefined) users[index].phone = phone;
  if (avatar !== undefined) users[index].avatar = avatar;
  if (addresses !== undefined) users[index].addresses = addresses;
  if (onboardingComplete !== undefined) users[index].onboardingComplete = onboardingComplete;
  if (verifiedPhone !== undefined) users[index].verifiedPhone = verifiedPhone;

  writeJson(usersPath, users);
  res.json({ success: true, user: sanitize(users[index]) });
};

exports.toggleFavourite = (req, res) => {
  const { providerId } = req.body;
  
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ success: false, message: 'Access denied: not your profile' });
  }

  const users = readJson(usersPath);
  const index = users.findIndex((u) => u.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: 'User not found' });

  const favs = users[index].favouriteProviderIds || [];
  const exists = favs.includes(providerId);
  users[index].favouriteProviderIds = exists
    ? favs.filter((id) => id !== providerId)
    : [...favs, providerId];

  writeJson(usersPath, users);
  res.json({ success: true, favouriteProviderIds: users[index].favouriteProviderIds });
};
