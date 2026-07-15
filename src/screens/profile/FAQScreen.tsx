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
  border: '#2D2D2D',
};

const FAQScreen = ({ navigation }: any) => {
  const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState([])
      useEffect(() => {
        getFaq();
      }, []);
    
      const getFaq = async (): Promise<void> => {
        setLoading(true);
        try {
          const response = await CMSInformation.getFaqs({type:1});
          console.log('getFaqs ::::::', response);
    
          // if (response?.status) {
            setData(response?.data || [])
                      console.log('getFaqs response::::::', response?.data);

          // }
        } catch (error) {
          console.error('Vehicle load error:', error);
        } finally {
          setLoading(false);
        }
      };

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? -1 : index);
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

        <Text style={styles.headerTitle}>FAQ</Text>

        <View style={{ width: 36 }} />
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bigTitle}>Frequently Ask</Text>
            <Text style={styles.bigTitle}>Questions</Text>
          </View>

          <View style={styles.iconBox}>
            <Text style={styles.questionMark}>?</Text>
          </View>
        </View>

        {/* FAQ List */}
        <View style={{ marginTop: 26 }}>
          {data.map((item, index) => {
            const isActive = activeIndex === index;

            return (
              <View key={index} style={styles.faqContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => toggleFAQ(index)}
                  style={styles.questionRow}
                >
                  <Text style={styles.questionText}>
                    {item.questions}
                  </Text>

                  <MaterialCommunityIcons
                    name={isActive ? 'close' : 'plus'}
                    size={18}
                    color={C.orange}
                  />
                </TouchableOpacity>

                {isActive && (
                  <Text style={styles.answerText}>
                    {item.answers}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default FAQScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // KEEP SAME HEADER UI
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
  },

  contentContainer: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingBottom: 40,
  },

  // Top Section
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  bigTitle: {
    color: C.textPrimary,
    fontSize: rs(24, 26, 28),
    fontWeight: '700',
    lineHeight: rs(32, 34, 36),
  },

  iconBox: {
    width: rs(72, 76, 80),
    height: rs(72, 76, 80),
    borderWidth: 2,
    borderColor: C.orange,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B1C0A',
    transform: [{ rotate: '12deg' }],
  },

  questionMark: {
    color: '#fff',
    fontSize: rs(34, 38, 42),
    fontWeight: '700',
  },

  // FAQ
  faqContainer: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingVertical: 14,
  },

  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  questionText: {
    flex: 1,
    color: C.textPrimary,
    fontSize: rs(13, 14, 15),
    fontWeight: '600',
    paddingRight: 12,
  },

  answerText: {
    color: C.textSecondary,
    fontSize: rs(12, 13, 14),
    lineHeight: rs(22, 24, 25),
    marginTop: 12,
    paddingRight: 20,
  },
});