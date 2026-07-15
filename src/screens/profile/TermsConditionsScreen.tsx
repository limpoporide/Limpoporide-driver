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
  card: '#161616',
  border: '#343434',
  textPrimary: '#FFFFFF',
  textSecondary: '#B5B5B5',
};

const TermsConditionsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{ description?: string } | null>(null);
    useEffect(() => {
      getTerms();
    }, []);
  
    const getTerms = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await CMSInformation.getTerms();
        console.log('getTerms response::::::', response);
  
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

        <Text style={styles.headerTitle}>Term & Condition</Text>

        <View style={{ width: 36 }} />
      </View>

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

      {/* <Text style={styles.topText}>
         {data?.description}
        </Text> */}
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsConditionsScreen;

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
    paddingVertical: 18,
  },

  topText: {
    color: C.textPrimary,
    fontSize: rs(12, 13, 14),
    lineHeight: rs(22, 24, 25),
    marginBottom: 20,
    textAlign: 'justify',
  },

  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 14,
  },

  cardTitle: {
    color: C.textPrimary,
    fontSize: rs(13, 14, 15),
    fontWeight: '700',
    marginBottom: 10,
  },

  cardText: {
    color: C.textSecondary,
    fontSize: rs(11, 12, 13),
    lineHeight: rs(20, 22, 24),
  },
});