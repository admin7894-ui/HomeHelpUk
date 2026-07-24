import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/Card';
import AppButton from '../../components/AppButton';
import AccessibleTextInput from '../../components/AccessibleTextInput';
import SectionTitle from '../../components/SectionTitle';
import { useAppStore } from '../../store/appStore';
import api from '../../services/api';
import { getTheme, scaledFont, spacing, radii } from '../../utils/theme';

export default function WalletScreen() {
  const { highContrast, fontScale } = useAppStore();
  const theme = getTheme(highContrast);

  const [wallet, setWallet] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Withdrawal modal states
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/provider/wallet');
      setWallet(data.wallet);
    } catch (err) {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleWithdraw = async () => {
    const numVal = Number(amount);
    if (!amount || isNaN(numVal) || numVal <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }
    if (wallet && numVal > wallet.balance) {
      Alert.alert('Insufficient balance', 'You cannot withdraw more than your current balance.');
      return;
    }

    setWithdrawing(true);
    try {
      const { data } = await api.post('/provider/wallet/withdraw', { amount: numVal });
      setWallet(data.wallet);
      Alert.alert('Success', `Withdrawal of £${numVal.toFixed(2)} requested successfully.`);
      setWithdrawVisible(false);
      setAmount('');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const renderTx = ({ item }) => {
    const isCredit = item.type === 'credit';
    return (
      <Card style={styles.txCard}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.txIconContainer, { backgroundColor: isCredit ? theme.providerAccentSoft : theme.danger + '20' }]}>
              <Ionicons
                name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={22}
                color={isCredit ? theme.providerAccent : theme.danger}
              />
            </View>
            <View style={{ marginLeft: spacing.sm }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: scaledFont(14, fontScale) }}>
                {item.description}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Text style={{ color: isCredit ? theme.success : theme.danger, fontWeight: '800', fontSize: scaledFont(15, fontScale) }}>
            {isCredit ? '+' : '-'}£{item.amount.toFixed(2)}
          </Text>
        </View>
      </Card>
    );
  };

  return (
    <ScreenContainer scroll={false}>
      <Text style={[styles.title, { color: theme.text, fontSize: scaledFont(24, fontScale) }]}>Wallet</Text>

      {/* Balance Card */}
      <Card style={[styles.balanceCard, { backgroundColor: theme.providerAccent }]}>
        <Text style={{ color: theme.primaryButtonText, opacity: 0.8, fontSize: scaledFont(13, fontScale) }}>
          Available Balance
        </Text>
        <Text style={{ color: theme.primaryButtonText, fontWeight: '900', fontSize: scaledFont(32, fontScale), marginVertical: 4 }}>
          £{wallet ? wallet.balance.toFixed(2) : '0.00'}
        </Text>
        <Text style={{ color: theme.primaryButtonText, opacity: 0.8, fontSize: 12 }}>
          Pending payouts: £{wallet ? wallet.pendingPayouts.toFixed(2) : '0.00'}
        </Text>
        <AppButton
          label="Withdraw Money"
          variant="secondary"
          accent="provider"
          onPress={() => setWithdrawVisible(true)}
          style={{ marginTop: spacing.md, backgroundColor: theme.surface }}
          labelStyle={{ color: theme.providerAccent }}
        />
      </Card>

      <SectionTitle>Transaction History</SectionTitle>

      <FlatList
        data={wallet?.transactions || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTx}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.providerAccent} />}
        ListEmptyComponent={<Text style={{ color: theme.textMuted, marginTop: spacing.lg }}>No transactions logged yet.</Text>}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />

      {/* Withdrawal Modal */}
      <Modal visible={withdrawVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SectionTitle>Request Payout</SectionTitle>
            <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
              Enter the amount to withdraw to your linked bank account.
            </Text>
            
            <AccessibleTextInput
              label="Amount (£)"
              placeholder="e.g. 50"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <AppButton
                label="Cancel"
                variant="outline"
                accent="provider"
                onPress={() => setWithdrawVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Confirm Payout"
                accent="provider"
                onPress={handleWithdraw}
                loading={withdrawing}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '800', marginBottom: spacing.sm },
  balanceCard: { padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.md },
  txCard: { padding: spacing.sm, marginBottom: spacing.xs },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txIconContainer: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.md },
  modalContent: { width: '100%', borderRadius: radii.md, padding: spacing.md, borderWidth: 1 },
});
