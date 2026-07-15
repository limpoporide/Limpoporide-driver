import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankAPI } from '../../services/api';
import toastService from '../../Utility/toast';
import { ApiError } from '../../types/api';

const { width } = Dimensions.get('window');
const isSmall = width < 375;
const isMedium = width >= 375 && width < 414;
const rs = (s: number, m: number, l: number) =>
  isSmall ? s : isMedium ? m : l;

const C = {
  bg: '#0B0B0B',
  orange: '#E59332',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2D2D2D',
  card: '#1B1B1B',
  button: '#1292FF',
  inputBg: '#141414',
  cancelRed: '#E53935',
  saveGreen: '#2E7D32',
};

const BankAccountEditScreen = ({ navigation, route }: any) => {
  // Pre-fill from route params if navigated from BankAccountScreen with existing data
  const existing = route?.params?.bankData;

  const [form, setForm] = useState({
    accountHolderName: existing?.account_holder_name ?? '',
    bankName:          existing?.bank_name          ?? '',
    accountNumber:     existing?.bank_account_number ?? '',
    branchName:        existing?.branch_name         ?? '',
    bankCode:          existing?.branch_code         ?? '',
    dateOfBirth:       existing?.date_of_birth       ?? '',   // keep as-is (YYYY-MM-DD)
  });

  const [saving, setSaving] = useState<boolean>(false);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ─── Validation ──────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!form.accountHolderName.trim()) return 'Account holder name is required';
    if (!form.bankName.trim())          return 'Bank name is required';
    if (!form.accountNumber.trim())     return 'Account number is required';
    if (!form.branchName.trim())        return 'Branch name is required';
    if (!form.bankCode.trim())          return 'Bank code is required';
    if (!form.dateOfBirth.trim())       return 'Date of birth is required';
    return null;
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSaveBank = async (): Promise<void> => {
    const validationError = validate();
    if (validationError) {
      toastService.error(validationError);
      return;
    }

    setSaving(true);
    try {
      // Match exactly the field names expected by the API (multipart/form-data)
      const updateData = {
        account_holder_name: form.accountHolderName.trim(),
        bank_name:           form.bankName.trim(),
        bank_account_number: form.accountNumber.trim(),
        branch_name:         form.branchName.trim(),
        branch_code:         form.bankCode.trim(),
        date_of_birth:       form.dateOfBirth.trim(),   // YYYY-MM-DD
      };

      console.log('updateBank payload:::::', updateData);
      const response = await bankAPI.updateBank(updateData);
      console.log('updateBank response:::::', response);

      if (response?.status) {
        toastService.success(response?.message || 'Bank details updated successfully');
        navigation.goBack();
      } else {
        toastService.error(response?.message || 'Failed to update bank details');
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.log('updateBank error:::::', error);
      toastService.error(apiError?.message || 'Failed to update bank details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.orange} barStyle="dark-content" />

      {/* Header — unchanged */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Account</Text>
        <View style={{ width: 36 }} />
      </View>

  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={20}
  >
      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Top Card */}
        <View style={styles.topCard}>
          <Text style={styles.topTitle}>Bank Account Details</Text>
          <Text style={styles.topSubTitle}>
            Manage your bank account information
          </Text>
        </View>

        {/* Account Information Section */}
        <View style={styles.sectionCard}>
          {/* Section Header Row */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            {/* Cancel — go back without saving */}
            {/* <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              disabled={saving}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity> */}
          </View>

          {/* Fields — labels and keys match API response fields */}
          <FormField
            label="Account Holder Name"
            value={form.accountHolderName}
            onChangeText={v => handleChange('accountHolderName', v)}
          />
          <FormField
            label="Bank Name"
            value={form.bankName}
            onChangeText={v => handleChange('bankName', v)}
          />
          <FormField
            label="Account Number"
            value={form.accountNumber}
            onChangeText={v => handleChange('accountNumber', v)}
            keyboardType="numeric"
          />
          <FormField
            label="Branch Name"
            value={form.branchName}
            onChangeText={v => handleChange('branchName', v)}
          />
          <FormField
            label="Bank Code"
            value={form.bankCode}
            onChangeText={v => handleChange('bankCode', v)}
          />
          <FormField
            label="Date of Birth (YYYY-MM-DD)"
            value={form.dateOfBirth}
            onChangeText={v => handleChange('dateOfBirth', v)}
            isLast
          />
        </View>

        {/* Save Changes Button — wired to handleSaveBank */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleSaveBank}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ─── Reusable Field ───────────────────────────────────────────────────────── */
const FormField = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  isLast = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  isLast?: boolean;
}) => (
  <View style={[fieldStyles.wrapper, !isLast && fieldStyles.wrapperBorder]}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TextInput
      style={fieldStyles.input}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#555"
      keyboardType={keyboardType}
      selectionColor={C.orange}
    />
  </View>
);

export default BankAccountEditScreen;

/* ─── Field Styles ─────────────────────────────────────────────────────────── */
const fieldStyles = StyleSheet.create({
  wrapper: {
    paddingVertical: 10,
  },
  wrapperBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  label: {
    color: C.textSecondary,
    fontSize: rs(10, 11, 12),
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#111111',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.textPrimary,
    fontSize: rs(13, 14, 14),
    fontWeight: '400',
  },
});

/* ─── Screen Styles ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  // HEADER — unchanged
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0E0E0E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  headerTitle: {
    color: C.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontSize: rs(15, 16, 17),
  },
 contentContainer: {
  paddingHorizontal: 14,
  paddingVertical: 14,
  paddingBottom: 120,
  flexGrow: 1,
},
  // TOP CARD — unchanged
  topCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  topTitle: {
    color: C.textPrimary,
    fontSize: rs(13, 14, 15),
    fontWeight: '700',
  },
  topSubTitle: {
    color: C.textSecondary,
    fontSize: rs(10, 11, 12),
  },
  // SECTION CARD
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 6,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
    marginBottom: 4,
  },
  sectionTitle: {
    color: C.textPrimary,
    fontSize: rs(13, 14, 15),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    backgroundColor: C.cancelRed,
    borderRadius: 7,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: rs(11, 12, 13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // SAVE BUTTON
  saveBtn: {
    backgroundColor: C.saveGreen,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: rs(14, 15, 16),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});