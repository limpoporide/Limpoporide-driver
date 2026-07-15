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
import { useIsFocused } from '@react-navigation/native';
import { vehicleInformation } from '../../services/api';
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
  input: '#5B5B5B',
  button: '#1292FF',
};

const staticVehicleFields = [
  {
    label: 'Vehicle Number*',
    key: 'vehicle_number',
  },
  {
    label: 'Owner Name*',
    key: 'name',
  },
  {
    label: 'Vehicle Registered*',
    key: 'vehicle_register',
  },
  {
    label: 'Vehicle Type*',
    key: 'vehicle_type_id',
  },
];

const VehicleProfileScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState<boolean>(true);
  // const [vehicleData, setVehicleData] = useState<any>(null);
      const user = useSelector(state => state.auth.userData);
      const vehicleData = useSelector((state: any) => state.auth.userData);
      console.log("Auth user ===>",user);
      


  // useEffect(() => {
  //   loadVehicle();
  // }, [isFocused]);

  // const loadVehicle = async (): Promise<void> => {
  //   setLoading(true);
  //   try {
  //     const response = await vehicleInformation.getVehicle();
  //     console.log('response::::::', response);

  //     if (response?.status) {
  //       // Fix 2: API returns an array — take the first element
  //       const vehicle = Array.isArray(response.data)
  //         ? response.data[0]
  //         : response.data;
  //       setVehicleData(vehicle ?? null);
  //     }
  //   } catch (error) {
  //     console.error('Vehicle load error:', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

        <Text style={styles.headerTitle}>Vehicle Information</Text>

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
            Vehicle Registration
          </Text>

          <Text style={styles.topSubTitle}>
            Update your vehicle information
          </Text>
        </View>

        {/* Vehicle Form */}
     <View style={styles.formCard}>
  {staticVehicleFields.map((item, index) => (
    <View key={index} style={styles.fieldContainer}>
      <Text style={styles.label}>{item.label}</Text>

      <View style={styles.inputBox}>
        <Text style={styles.inputText}>
          {vehicleData?.[item.key] !== null &&
          vehicleData?.[item.key] !== undefined &&
          vehicleData?.[item.key] !== ''
            ? String(vehicleData[item.key])
            : '-'}
        </Text>
      </View>
    </View>
  ))}
</View>
        {/* Button */}
    
      </ScrollView>
    </SafeAreaView>
  );
};

export default VehicleProfileScreen;

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
    marginBottom: 14,
  },

  topTitle: {
    color: C.textPrimary,
    fontSize: rs(13, 14, 15),
    fontWeight: '700',
    marginBottom: 4,
  },

  topSubTitle: {
    color: C.textSecondary,
    fontSize: rs(10, 11, 12),
  },

  // FORM CARD
  formCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 14,
  },

  fieldContainer: {
    marginBottom: 14,
  },

  label: {
    color: C.textPrimary,
    fontSize: rs(11, 12, 13),
    marginBottom: 8,
    fontWeight: '500',
  },

  // READ ONLY INPUT
  inputBox: {
    height: 42,
    backgroundColor: '#5A5A5A',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  inputText: {
    color: '#EDEDED',
    fontSize: rs(12, 13, 14),
    fontWeight: '500',
  },

  // BUTTON
  button: {
    height: 48,
    backgroundColor: C.button,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: rs(13, 14, 15),
    fontWeight: '700',
  },
});