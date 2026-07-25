const fs = require('fs');
const path = require('path');
const { generateId } = require('../utils/helpers');

const walletsPath = path.join(__dirname, '../data/wallets.json');
const usersPath = path.join(__dirname, '../data/users.json');
const providersPath = path.join(__dirname, '../data/providers.json');

const readJson = (p) => {
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
};
const writeJson = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2));

exports.getWallet = (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Access denied: providers only' });
  }

  const wallets = readJson(walletsPath);
  const users = readJson(usersPath);
  const user = users.find((u) => u.id === req.user.id);
  const providerId = user ? user.providerId : null;

  if (!providerId) {
    return res.status(400).json({ success: false, message: 'Provider ID not associated' });
  }

  let wallet = wallets.find((w) => w.providerId === providerId);
  if (!wallet) {
    wallet = {
      id: generateId('wallet'),
      providerId: providerId,
      balance: 0.00,
      pendingPayouts: 0.00,
      transactions: []
    };
    wallets.push(wallet);
    writeJson(walletsPath, wallets);
  }

  res.json({ success: true, wallet });
};

exports.withdraw = (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Access denied: providers only' });
  }

  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
  }

  const wallets = readJson(walletsPath);
  const users = readJson(usersPath);
  const providers = readJson(providersPath);
  
  const user = users.find((u) => u.id === req.user.id);
  const providerId = user ? user.providerId : null;

  if (!providerId) {
    return res.status(400).json({ success: false, message: 'Provider ID not associated' });
  }

  const provider = providers.find((p) => p.id === providerId);
  if (!provider || !provider.bankDetails || !provider.bankDetails.accountNumber) {
    return res.status(400).json({ success: false, message: 'Bank details not configured' });
  }

  const index = wallets.findIndex((w) => w.providerId === providerId);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Wallet not found' });
  }

  const wallet = wallets[index];
  const withdrawAmount = Number(amount);
  
  // To avoid duplicate withdrawal requests, we might check if there's already a pending request,
  // but for now we just verify balance.
  if (wallet.balance < withdrawAmount) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }

  wallet.balance = Math.round((wallet.balance - withdrawAmount) * 100) / 100;
  wallet.pendingPayouts = Math.round((wallet.pendingPayouts + withdrawAmount) * 100) / 100;
  
  wallet.transactions.push({
    id: generateId('tx'),
    type: 'payout',
    amount: withdrawAmount,
    status: 'pending',
    description: `Bank transfer withdrawal to ending in ${provider.bankDetails.accountNumber.slice(-4) || 'XXXX'}`,
    timestamp: new Date().toISOString()
  });

  writeJson(walletsPath, wallets);
  res.json({ success: true, wallet });
};
