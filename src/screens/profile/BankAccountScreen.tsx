import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankAPI } from '../../services/api';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';

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
};

const BankAccountScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused()
    const user = useSelector((state: any) => state.auth.userData);

const [loading, setLoading] = useState<boolean>(true);
const [bankData, setBankData] = useState<any>(user);
  console.log("User Bank Details --->",user);
  




const bankDetails = [
  {
    label: 'Account Holder Name',
    value: bankData?.bank_ac_holder_name || '-',
  },
  {
    label: 'Bank Name',
    value: bankData?.bank_name || '-',
  },
  {
    label: 'Account Number',
    value: bankData?.bank_account || '-',
  },
  {
    label: 'Branch Name',
    value: bankData?.branch || '-',
  },
  {
    label: 'Bank Code',
    value: bankData?.code || '-',
  },
  // {
  //   label: 'Date of Birth',
  //   value: bankData?.date_of_birth
  //     ? new Date(bankData.date_of_birth).toLocaleDateString('en-GB')
  //     : '-',
  // },
];
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.orange} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Bank Account</Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Top Card */}
        <View style={styles.topCard}>
          <Text style={styles.topTitle}>
            Bank Account Details
          </Text>

          <Text style={styles.topSubTitle}>
            Manage your bank account information
          </Text>
        </View>

        {/* Account Information Card */}
        <View style={styles.infoCard}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              Account Information
            </Text>

            {/* <TouchableOpacity
              activeOpacity={0.8}
              style={styles.editBtn}
              onPress={()=> navigation.navigate('BankAccountEditScreen', { bankData })}
            >
              <Text style={styles.editBtnText}>
                Edit
              </Text>
            </TouchableOpacity> */}
          </View>

          {/* Details */}
          {bankDetails?.map((item, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.label}>
                {item.label}
              </Text>

              <Text style={styles.value}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default BankAccountScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // HEADER SAME
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
    paddingBottom: 40,
  },

  // TOP CARD
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
    marginBottom: 3,
  },

  topSubTitle: {
    color: C.textSecondary,
    fontSize: rs(10, 11, 12),
  },

  // ACCOUNT INFO CARD
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  cardTitle: {
    color: C.textPrimary,
    fontSize: rs(13, 14, 15),
    fontWeight: '700',
  },

  editBtn: {
    backgroundColor: C.button,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 6,
  },

  editBtnText: {
    color: '#fff',
    fontSize: rs(11, 12, 13),
    fontWeight: '700',
  },

  // ROW
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  label: {
    color: C.textPrimary,
    fontSize: rs(11, 12, 13),
    fontWeight: '500',
    flex: 1,
  },

  value: {
    color: '#E0E0E0',
    fontSize: rs(11, 12, 13),
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
});