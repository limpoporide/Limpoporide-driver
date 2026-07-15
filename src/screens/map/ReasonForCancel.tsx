import { ridesAPI } from '../../services/api';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── adjust this import to match your navigation types file ───────────────────
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import toastService from '../../Utility/toast';

type Props = NativeStackScreenProps<any, 'ReasonForCancel'>;

const C = {
  bg: '#0B0B0B',
  orange: '#E59332',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2C2C2C',
  red: '#EA2A2A',
};

interface Reason {
  id: number;
  reason: string;
  actor: string;
  status: number;
}

export default function ReasonForCancel({ navigation, route }: Props) {
  // All data passed from SearchRide via navigation.navigate()
  const { rideId } = route.params;

  const [reasons, setReasons] = useState<Reason[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReasons();
  }, []);
console.log('rideId:::::',rideId);


   const loadReasons = async () => {
     try {
       const response = await ridesAPI.getCancelRiderReason();
       console.log('response::::::',response);
       
       if (response?.data) {
         setReasons(response.data);
       }
     } catch (error) {
       console.log('loadReasons error:', error);
     } finally {
       setLoadingReasons(false);
     }
   };
  const selectedReason = selected !== null ? reasons[selected] : null;
  const isOther = selectedReason?.reason?.toLowerCase() === 'other';

  const isDisabled =
    selected === null ||
    submitting ||
    (isOther && description.trim().length === 0);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      const response = await ridesAPI.cancelRide({
        booking_id: rideId,
        reason_text: selectedReason.reason,
        ...(isOther && description.trim() ? { description: description.trim() } : {}),
      });
      if (response?.status) {
        toastService?.success(response?.message);
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
}
    } catch (error) {
      console.log('cancelRider error:', error);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reason For Cancel</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Reasons list */}
        {loadingReasons ? (
          <ActivityIndicator size="small" color={C.orange} style={{ marginTop: 24 }} />
        ) : (
          reasons.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.reasonRow, selected === index && styles.reasonRowActive]}
              onPress={() => {
                setSelected(index);
                setDescription('');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, selected === index && styles.checkboxActive]}>
                {selected === index && (
                  <MaterialCommunityIcons name="check" size={12} color="#000" />
                )}
              </View>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Description box — only when "Other" is selected */}
        {isOther && (
          <View style={styles.descriptionWrap}>
            <Text style={styles.descriptionLabel}>Please describe your reason *</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Enter description here..."
              placeholderTextColor={C.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          disabled={isDisabled}
          style={[styles.cancelBtn, isDisabled && styles.cancelBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="close" size={16} color="#fff" />
              <Text style={styles.cancelBtnText}>Cancel Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 24 },
  subtitle: { color: C.textSecondary, fontSize: 13, marginBottom: 16 },
  bookingIdPill: {
    backgroundColor: C.orange, padding: 12,
    borderRadius: 10, marginBottom: 12,
  },
  bookingIdText: { color: '#000', fontWeight: '700', fontSize: 12 },
  routeCard: {
    backgroundColor: '#161616', borderRadius: 10,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#222',
  },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDivider: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 10 },
  routeText: { color: C.textSecondary, fontSize: 12, flex: 1 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', padding: 14,
    borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#222',
  },
  reasonRowActive: { borderColor: C.orange, backgroundColor: 'rgba(229,147,50,0.06)' },
  checkbox: {
    width: 20, height: 20, borderWidth: 1.5,
    borderColor: '#444', borderRadius: 4,
    marginRight: 12, justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { backgroundColor: C.orange, borderColor: C.orange },
  reasonText: { color: '#fff', flex: 1, fontSize: 13 },
  descriptionWrap: { marginTop: 4, marginBottom: 4 },
  descriptionLabel: { color: C.textSecondary, fontSize: 12, marginBottom: 8 },
  descriptionInput: {
    backgroundColor: '#161616', borderWidth: 1,
    borderColor: C.orange, borderRadius: 10,
    padding: 12, color: C.textPrimary,
    fontSize: 13, minHeight: 100,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1, borderTopColor: '#1E1E1E',
  },
  cancelBtn: {
    height: 52, borderRadius: 30, backgroundColor: C.red,
    justifyContent: 'center', alignItems: 'center',
    flexDirection: 'row', gap: 8,
  },
  cancelBtnDisabled: { backgroundColor: '#2A2A2A' },
  cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});