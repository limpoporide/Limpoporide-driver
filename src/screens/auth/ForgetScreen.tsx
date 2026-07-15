import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { AuthStackScreenProps } from '../../types/navigation';
import { driverAuthAPI } from '../../services/api';

import { SignupResponse } from '../../types/api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import toastService from '../../Utility/toast';

type SignupScreenProps = AuthStackScreenProps<'Signup'>;

export default function ForgetScreen({ navigation }: SignupScreenProps): React.ReactElement {
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingOtp, setSendingOtp] = useState<boolean>(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpView,setOtpView]=useState<boolean>(false)
    const [otpNewpass,setNewPass]=useState<boolean>(false)
    const[otpData,setOtpData]=useState(null)
    const [otpVerifieData,setOtpVerifieData]=useState(null)


  // Focus tracking references for the 4-digit OTP inputs
  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

const handleOtpChange = (text: string, index: number) => {
  setOtpVerified(false);

  const newOtp = [...otp];
  newOtp[index] = text;
  setOtp(newOtp);

  if (text.length === 1 && index < 3) {
    otpRefs[index + 1].current?.focus();
  }

  const completeOtp = newOtp.join('');

  if (completeOtp.length === 4 && !newOtp.includes('')) {
    verifyOTP(completeOtp);
  }
};

  const handleSend = async (): Promise<void> => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number first.');
      return;
    }
    setSendingOtp(true);
    try {
      const response: SignupResponse = await driverAuthAPI.reSend({
    email_mobile: phone,
        type: 2,
      });
        if (response?.status==1) {
          console.log("Otp Send  ==>",response);
          setOtpData(response?.data)
          
          // Alert.alert('Your OTP', `${response?.data?.otp}`, [{ text: 'OK' }]);
                toastService.success(`${response?.message} OTP is ${response?.data?.otp}`);
                setOtpView(true)

        }
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to send verification code.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!phone || !password || !confirmPassword) {
      Alert.alert('Error', 'All marked fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response: SignupResponse = await driverAuthAPI.changePassword({
        id: otpVerifieData?.id,
        password: password,
        confirm_password: confirmPassword, 
      });
      console.log('response:::::::', response);
      if (response?.status==1) {
        navigation.goBack();
              toastService.success(response?.message);

      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'Failed to save new password.');
    } finally {
      setLoading(false);
    }
  };
const verifyOTP = async (enteredOtp: string) => {
  try {
    setVerifyingOtp(true);

    const response = await driverAuthAPI.verifyOtp({
    type: 2,
        id: otpData?.id,
        otp: enteredOtp,
    });
    
    console.log('OTP Response:', response);

    if (response?.status==1) {
      setNewPass(true)
      setOtpVerifieData(response?.data)
      setOtpVerified(true);

    } else {
      setOtpVerified(false);
    }
    toastService.success(response.message);
  } catch (error) {
    console.log('OTP Error:', error);
    setOtpVerified(false);
  } finally {
    setVerifyingOtp(false);
  }
};
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          {/* ── Top Section ── */}
          <View style={styles.topSection}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>

            <Image
              source={require('../../theme/assets/lock.png')}
              style={styles.registerImage}
              resizeMode="contain"
            />
          </View>

          {/* ── Form Card ── */}
          <View style={styles.card}>
            <Text style={styles.title}>Change Your Password</Text>
            <View style={styles.titleUnderline} />

            {/* Phone Entry Row with side button from image_8c74bc.png */}
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.phoneInputRow}>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter your phone number"
                placeholderTextColor="#666"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
              <TouchableOpacity 
                style={styles.sendBtn} 
                onPress={handleSend}
                disabled={sendingOtp}
                activeOpacity={0.8}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.sendBtnText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* OTP Input Block */}
            {otpView&&
            <Text style={styles.label}>Enter OTP</Text>
}
{otpView && 
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={otpRefs[index]}
                  style={styles.otpBox}
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                />
              ))}
                  {verifyingOtp ? (
                    <ActivityIndicator
                      size="small"
                      color="#E59A3A"
                      style={styles.checkIcon}
                    />
                  ) : otpVerified ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color="#E59A3A"
                      style={styles.checkIcon}
                    />
                  ) : null}            
                </View>
}

            {/* New Password */}
            {otpNewpass &&
            <View>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter New Password"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your Password"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
       

            {/* Save Button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.registerButtonText}>Save</Text>
              )}
            </TouchableOpacity>
                 </View>
}
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 20,
    position: 'relative',
    minHeight: 190,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0E0E0E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  registerImage: {
    width: 170,
    height: 170,
  },
  card: {
    backgroundColor: '#111',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 40,
    marginTop: -10,
    flexGrow: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  titleUnderline: {
    width: 45,
    height: 3,
    backgroundColor: '#E59A3A',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 25,
  },
  label: {
    color: '#DDD',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    color: '#000',
  },
  sendBtn: {
    backgroundColor: '#E59A3A',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  otpBox: {
    width: 50,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  checkIcon: {
    marginLeft: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    color: '#000',
    height: '100%',
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  registerButton: {
    height: 50,
    backgroundColor: '#E59A3A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});