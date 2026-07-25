const db = require('../db');
const { generateId } = require('../utils/helpers');

async function getProviderWalletData(providerId) {
  let wRes = await db.query('SELECT * FROM wallets WHERE provider_id = $1', [providerId]);
  let wallet = wRes.rows[0];

  if (!wallet) {
    const wId = generateId('wallet');
    await db.query(
      'INSERT INTO wallets (id, provider_id, balance, pending_payouts) VALUES ($1, $2, 0.00, 0.00)',
      [wId, providerId]
    );
    wRes = await db.query('SELECT * FROM wallets WHERE provider_id = $1', [providerId]);
    wallet = wRes.rows[0];
  }

  const txRes = await db.query(
    `SELECT id, booking_id as "bookingId", type, amount, status, description, timestamp
     FROM wallet_transactions
     WHERE wallet_id = $1
     ORDER BY timestamp DESC`,
    [wallet.id]
  );

  return {
    id: wallet.id,
    providerId: wallet.provider_id,
    balance: Number(wallet.balance),
    pendingPayouts: Number(wallet.pending_payouts),
    transactions: txRes.rows.map(t => ({
      ...t,
      amount: Number(t.amount)
    }))
  };
}

exports.getWallet = async (req, res) => {
  try {
    if (req.user.role !== 'provider') {
      return res.status(403).json({ success: false, message: 'Access denied: providers only' });
    }

    const pRes = await db.query('SELECT id FROM providers WHERE user_id = $1', [req.user.id]);
    const providerId = pRes.rows[0] ? pRes.rows[0].id : null;

    if (!providerId) {
      return res.status(400).json({ success: false, message: 'Provider ID not associated' });
    }

    const wallet = await getProviderWalletData(providerId);
    res.json({ success: true, wallet });
  } catch (err) {
    console.error('[Wallets getWallet Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
};

exports.withdraw = async (req, res) => {
  if (req.user.role !== 'provider') {
    return res.status(403).json({ success: false, message: 'Access denied: providers only' });
  }

  const { amount } = req.body;
  const withdrawAmount = Number(amount);
  if (!amount || withdrawAmount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const pRes = await client.query('SELECT id, bank_details FROM providers WHERE user_id = $1', [req.user.id]);
    const provider = pRes.rows[0];
    if (!provider || !provider.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Provider ID not associated' });
    }

    const bank = provider.bank_details || {};
    if (!bank.accountNumber) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Bank details not configured' });
    }

    const wRes = await client.query('SELECT * FROM wallets WHERE provider_id = $1 FOR UPDATE', [provider.id]);
    if (wRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const wallet = wRes.rows[0];
    const currentBalance = Number(wallet.balance);

    if (currentBalance < withdrawAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const newBalance = Math.round((currentBalance - withdrawAmount) * 100) / 100;
    const newPending = Math.round((Number(wallet.pending_payouts) + withdrawAmount) * 100) / 100;

    await client.query(
      `UPDATE wallets SET balance = $1, pending_payouts = $2, updated_at = NOW() WHERE id = $3`,
      [newBalance, newPending, wallet.id]
    );

    const txId = generateId('tx');
    const acctLast4 = String(bank.accountNumber).slice(-4) || 'XXXX';
    await client.query(
      `INSERT INTO wallet_transactions (id, wallet_id, type, amount, status, description, timestamp)
       VALUES ($1, $2, 'payout', $3, 'pending', $4, NOW())`,
      [txId, wallet.id, withdrawAmount, `Bank transfer withdrawal to ending in ${acctLast4}`]
    );

    await client.query('COMMIT');

    const updatedWalletData = await getProviderWalletData(provider.id);
    res.json({ success: true, wallet: updatedWalletData });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Wallets withdraw Error]', err);
    res.status(500).json({ success: false, message: 'Withdrawal failed' });
  } finally {
    client.release();
  }
};
