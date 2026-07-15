
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
  textSecondary: '#B0B0B0',
};

const AboutUsScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<{ description?: string } | null>(null);
        useEffect(() => {
          getAbout();
        }, []);
      
        const getAbout = async (): Promise<void> => {
          setLoading(true);
          try {
            const response = await CMSInformation.getAboutUs();
            console.log('getAbout response::::::', response);
      
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

        <Text style={styles.headerTitle}>About Us</Text>

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
      html: data?.details || '',
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
{/* 
        <Text style={styles.paragraph}>
          Quisque venenatis est posuere nibh hac natoque pellentesque blandit.
          Integer non sapien et felis commodo fermentum quis.
        </Text>

        <Text style={styles.paragraph}>
          Sed et ullamcorper velit. Fusce facilisis feugiat eros, sed interdum
          lorem placerat nec. Mauris posuere risus ut erat posuere faucibus.
        </Text>

        <Text style={styles.paragraph}>
          Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
          posuere cubilia curae; Nullam volutpat augue at eros varius, quis
          dignissim mauris feugiat.
        </Text>

        <Text style={styles.paragraph}>
          Pellentesque at nisi ac augue feugiat consectetur. Nulla facilisi.
          Cras eget eros suscipit, gravida purus sit amet, consequat metus.
        </Text>

        <Text style={styles.paragraph}>
          Etiam tincidunt, sem et accumsan luctus, arcu mauris feugiat augue,
          nec volutpat magna turpis sed ipsum.
        </Text> */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutUsScreen;

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