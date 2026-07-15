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
import RenderHtml from 'react-native-render-html';
import { CMSInformation } from "../../services/api";

const { width } = Dimensions.get('window');

const isSmall = width < 375;
const isMedium = width >= 375 && width < 414;

const rs = (s: number, m: number, l: number) =>
  isSmall ? s : isMedium ? m : l;

const C = {
  bg: '#0B0B0B',
  orange: '#E59332',
  textPrimary: '#FFFFFF',
};

const PrivacyPolicyScreen = ({ navigation }: any) => {

  const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<{ description?: string } | null>(null);
      useEffect(() => {
        getPrivacy();
      }, []);
    
      const getPrivacy = async (): Promise<void> => {
        setLoading(true);
        try {
          const response = await CMSInformation.getPrivacy();
          console.log('getPrivacy response::::::', response);
    
          if (response?.status) {
            setData(response?.data)
          }
        } catch (error) {
          console.error('Vehicle load error:', error);
        } finally {
          setLoading(false);
        }
      };
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

        <Text style={styles.headerTitle}>Privacy Policy</Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {loading ? (
  <Text style={styles.topText}>Loading...</Text>
) : (
  <RenderHtml
    contentWidth={width}
    source={{
      html: data?.description || '',
    }}
    tagsStyles={{
      body: {
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 24,
      },
    }}
  />
)}
        {/* <Text style={styles.paragraph}>
          {data?.description}
        </Text> */}

        {/* <Text style={styles.paragraph}>
          We respect your privacy and ensure that your personal information is
          stored securely and used only for service-related activities.
        </Text>

        <Text style={styles.paragraph}>
          Information such as name, email, phone number, and location may be
          collected to improve the overall application experience.
        </Text>

        <Text style={styles.paragraph}>
          We do not share your data with unauthorized third parties. All user
          information remains confidential and protected.
        </Text>

        <Text style={styles.paragraph}>
          Cookies and analytics may be used to monitor app performance and user
          interaction for future improvements.
        </Text>

        <Text style={styles.paragraph}>
          By using this application, you agree to our privacy practices and
          consent to the collection of information as described above.
        </Text> */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PrivacyPolicyScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },


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
    borderColor: "#2C2C2C",
  },
  headerTitle: {
    color: C.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingVertical: 20,
  },

  paragraph: {
    color: C.textPrimary,
    fontSize: rs(12, 13, 14),
    lineHeight: rs(22, 24, 26),
    marginBottom: 18,
    textAlign: 'justify',
  },
});