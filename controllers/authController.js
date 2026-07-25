const fs = require('fs');
const path = require('path');
const { generateId, generateFakeToken } = require('../utils/helpers');

const usersPath = path.join(__dirname, '../data/users.json');
const providersPath = path.join(__dirname, '../data/providers.json');
const walletsPath = path.join(__dirname, '../data/wallets.json');

function readUsers() {
  return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function readProviders() {
  if (!fs.existsSync(providersPath)) fs.writeFileSync(providersPath, '[]');
  return JSON.parse(fs.readFileSync(providersPath, 'utf-8'));
}

function writeProviders(providers) {
  fs.writeFileSync(providersPath, JSON.stringify(providers, null, 2));
}

function readWallets() {
  if (!fs.existsSync(walletsPath)) fs.writeFileSync(walletsPath, '[]');
  return JSON.parse(fs.readFileSync(walletsPath, 'utf-8'));
}

function writeWallets(wallets) {
  fs.writeFileSync(walletsPath, JSON.stringify(wallets, null, 2));
}

function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}

function ensureProviderId(user) {
  if (user.role === 'provider' && !user.providerId) {
    const users = readUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index !== -1) {
      const providerId = generateId('prov');
      users[index].providerId = providerId;
      writeUsers(users);
      user.providerId = providerId;

      // Create provider profile
      const providers = readProviders();
      if (!providers.some((p) => p.id === providerId)) {
        const newProvider = {
          id: providerId,
          userId: user.id,
          name: user.name,
          avatar: user.avatar,
          bio: '',
          categories: [],
          services: [],
          postcode: '',
          serviceRadiusMiles: 10,
          availability: {
            weekly: {
              Mon: ["08:00-12:00", "13:00-17:00"],
              Tue: ["08:00-12:00", "13:00-17:00"],
              Wed: ["08:00-12:00", "13:00-17:00"],
              Thu: ["08:00-12:00", "13:00-17:00"],
              Fri: ["08:00-12:00", "13:00-17:00"],
              Sat: [],
              Sun: []
            },
            holidays: [],
            vacationMode: false,
            emergencyUnavailable: false
          },
          documents: {
            idType: '',
            idUrl: '',
            dbsCertificateUrl: '',
            dbsStatus: 'pending'
          },
          bankDetails: {
            accountHolder: '',
            sortCode: '',
            accountNumber: ''
          },
          rating: 5.0,
          reviewCount: 0,
          verified: false,
          completedJobs: 0
        };
        providers.push(newProvider);
        writeProviders(providers);
      }

      // Create wallet
      const wallets = readWallets();
      if (!wallets.some((w) => w.providerId === providerId)) {
        const newWallet = {
          id: generateId('wallet'),
          providerId: providerId,
          balance: 0.00,
          pendingPayouts: 0.00,
          transactions: []
        };
        wallets.push(newWallet);
        writeWallets(wallets);
      }
    }
  }
  return user;
}

exports.login = (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const authenticatedUser = ensureProviderId(user);
  const token = generateFakeToken(authenticatedUser);
  res.json({ success: true, token, user: sanitize(authenticatedUser) });
};



exports.register = (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'name, email, password, and role are required' });
  }

  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  let providerId;
  if (role === 'provider') {
    providerId = generateId('prov');
  }

  const newUser = {
    id: generateId('user'),
    name,
    email,
    password,
    phone: phone || '',
    role, // 'customer' or 'provider'
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
    addresses: [],
    favouriteProviderIds: [],
    ...(providerId ? { providerId } : {})
  };

  users.push(newUser);
  writeUsers(users);

  if (role === 'provider') {
    const providers = readProviders();
    const newProvider = {
      id: providerId,
      userId: newUser.id,
      name: newUser.name,
      avatar: newUser.avatar,
      bio: '',
      categories: [],
      services: [],
      postcode: '',
      serviceRadiusMiles: 10,
      availability: {
        weekly: {
          Mon: ["08:00-12:00", "13:00-17:00"],
          Tue: ["08:00-12:00", "13:00-17:00"],
          Wed: ["08:00-12:00", "13:00-17:00"],
          Thu: ["08:00-12:00", "13:00-17:00"],
          Fri: ["08:00-12:00", "13:00-17:00"],
          Sat: [],
          Sun: []
        },
        holidays: [],
        vacationMode: false,
        emergencyUnavailable: false
      },
      documents: {
        idType: '',
        idUrl: '',
        dbsCertificateUrl: '',
        dbsStatus: 'pending'
      },
      bankDetails: {
        accountHolder: '',
        sortCode: '',
        accountNumber: ''
      },
      rating: 5.0,
      reviewCount: 0,
      verified: false,
      completedJobs: 0
    };
    providers.push(newProvider);
    writeProviders(providers);

    const wallets = readWallets();
    const newWallet = {
      id: generateId('wallet'),
      providerId: providerId,
      balance: 0.00,
      pendingPayouts: 0.00,
      transactions: []
    };
    wallets.push(newWallet);
    writeWallets(wallets);
  }

  const token = generateFakeToken(newUser);
  res.status(201).json({ success: true, token, user: sanitize(newUser) });
};

exports.me = (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const authenticatedUser = ensureProviderId(user);
  res.json({ success: true, user: sanitize(authenticatedUser) });
};
