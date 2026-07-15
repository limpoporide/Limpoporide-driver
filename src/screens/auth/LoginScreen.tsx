import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {AuthStackScreenProps} from '../../types/navigation';
import {driverAuthAPI} from '../../services/api';
import {LoginResponse, ApiError} from '../../types/api';
import toastService from "../../Utility/toast";
import CheckBox from '@react-native-community/checkbox';
import { updateUserData } from '../../../features/authReducer';


import { registerAppWithFCM, getFCMToken } from "../../firebase/FCMService";
import { useDispatch } from 'react-redux';

type LoginScreenProps = AuthStackScreenProps<'Login'>;

const {width, height} = Dimensions.get('window');

export default function LoginScreen({navigation}: LoginScreenProps): React.ReactElement {
  const [driverId, setDriverId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [firebaseToken, setFirebaseToken] = useState("");
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  
    const dispatch = useDispatch();
  // const { connectSocket } = useSocket(); 
  useEffect(() => {
    initFCM();
  }, []);

  const initFCM = async () => {
    try {
      await registerAppWithFCM();
      const token = await getFCMToken();
      console.log('firebaseToken:::::',token);
      
      setFirebaseToken(token);
    } catch (err) {
      console.log("initFCM error:", err);
    }
  };

  const handleLogin = async (): Promise<void> => {
    if (!driverId.trim() || !password.trim()) {
      // Alert.alert('Error', 'Please fill all fields');
          toastService.success('Please fill all fields');

      return;
    }
     if (!isTermsAccepted) {
    // Alert.alert(
    //   'Terms & Conditions',
    //   'Please accept the Terms and Conditions to continue.'
    // );
    toastService.success('Please accept the Terms and Conditions to continue');
    return;
  }
    try {
      setLoading(true);
      const payload = {
        email_mobile: driverId.trim(),
        password: password.trim(),
        device_token: firebaseToken,
        devicee_type:Platform.OS
      };
      const response: LoginResponse = await driverAuthAPI.login(payload);
      console.log('response:::::',response);
      if (response?.status==1) {
        const token = response?.data?.api_token;
        console.log("Token =====>",token);
        
        await AsyncStorage.multiSet([
          ['userToken', token],
          ['driverId', driverId],
        ]);
         dispatch(updateUserData(response?.data));
        (global as any).authDispatch({ type: 'SIGN_IN', payload: token });
      }
      toastService.success(response?.message)
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.data?.message ||
        apiError?.message ||
        'Login failed';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ✅ Dismiss keyboard on tap outside */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Hero Image */}
            <View style={styles.imageContainer}>
              <Image
                source={require('../../theme/assets/loginImage.png')}
                style={styles.heroImage}
                resizeMode="contain"
              />
              <View style={styles.imageOverlay} />
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <Text style={styles.title}>Sign In</Text>
              <View style={styles.titleUnderline} />

              <Text style={styles.inputLabel}>Email/Phone Number</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  value={driverId}
                  onChangeText={setDriverId}
                  editable={!loading}
                  autoCapitalize="none"
                  placeholderTextColor="#666"
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  placeholderTextColor="#666"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={()=> navigation?.navigate('ForgetScreen')}>
                    <Text style={styles.forgotText}>
                      Change Password 
                    </Text>
                  </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>


              <View style={styles.termsContainer}>
  <CheckBox
    value={isTermsAccepted}
    onValueChange={setIsTermsAccepted}
    tintColors={{ true: '#FF8C00', false: '#888' }}
  />

  <Text style={styles.termsText}>
      By continuing, you agree to our{' '}
    <Text
      style={styles.termsLink}
      onPress={() => navigation.navigate('TermsConditionsScreen')}>
      Terms & Conditions
    </Text>
  </Text>
</View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#101010',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.38,   // ✅ responsive height
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101010',
  },
  heroImage: {
    width: width * 0.75,     // ✅ responsive width
    height: '85%',
    borderRadius: 14,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  card: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: width * 0.06,  // ✅ responsive padding
    paddingTop: 30,
    paddingBottom: 30,
    minHeight: height * 0.55,         // ✅ ensures card always fills screen
  },
  title: {
    fontSize: width * 0.07,           // ✅ responsive font
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#FF8C00',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 18,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#fff',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 52,
    backgroundColor: '#FF8C00',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  termsLink: {
    color: '#FF8C00',
    fontWeight: '600',
  },
  termsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 5,
  marginBottom: 15,
},
  forgotText: {
    color: '#FF9A2E',
    fontSize: 12,
    alignSelf:'flex-end',
    marginBottom:'5%'
  },

});