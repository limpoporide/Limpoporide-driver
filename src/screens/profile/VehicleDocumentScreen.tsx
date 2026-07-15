import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  Linking,
  Modal,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { vehicleInformation } from '../../services/api';

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

const VehicleDocumentScreen = ({ navigation }: any) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState<boolean>(true);
  const [vehicleData, setVehicleData] = useState<any[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    loadVehicle();
  }, [isFocused]);

  const loadVehicle = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await vehicleInformation.getDocDetails();
      console.log('vehicleInformation response::::::', response);

      if (response?.status) {
        setVehicleData(response.data || []);
      }
    } catch (error) {
      console.error('Vehicle load error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open the document URL in the device browser / viewer
const handleView = async (url: string) => {
  if (!url) return;

  const isImage =
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.png') ||
    url.endsWith('.webp');

  if (isImage) {
    setSelectedImage(url);
    setPreviewVisible(true);
  } else {
    Linking.openURL(url);
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

        <Text style={styles.headerTitle}>Vehicle Documents</Text>

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
            Document Read
          </Text>
        </View>

        {vehicleData.map((item, index) => (
          <View key={index} style={styles.docCard}>
            <View style={styles.leftSection}>
              <Image
                source={
                  item.doc_url && item.doc_url.startsWith('http')
                    ? { uri: item.doc_url }
                    : require('../../theme/assets/placeHolder.png')
                }
                style={styles.docImage}
              />

              <Text style={styles.docTitle}>
               {item?.vehicle_type}
              </Text>
            </View>

            {/* Right */}
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.viewBtn}
                onPress={() => handleView(item.doc_url)}
              >
                <Text style={styles.viewBtnText}>
                  View
                </Text>
              </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <Modal
  visible={previewVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setPreviewVisible(false)}
>
  <View style={styles.modalContainer}>
    <TouchableOpacity
      style={styles.closeBtn}
      onPress={() => setPreviewVisible(false)}
    >
      <MaterialCommunityIcons
        name="close"
        size={28}
        color="#fff"
      />
    </TouchableOpacity>

    <Image
      source={{ uri: selectedImage }}
      style={styles.previewImage}
      resizeMode="contain"
    />
  </View>
</Modal>
    </SafeAreaView>
  );
};

export default VehicleDocumentScreen;

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
  },

  // DOCUMENT CARD
  docCard: {
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  docImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
    marginRight: 12,
  },

  docTitle: {
    color: C.textPrimary,
    fontSize: rs(11, 12, 13),
    fontWeight: '600',
    flex: 1,
  },

  // VIEW BUTTON
  viewBtn: {
    backgroundColor: C.button,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },

  viewBtnText: {
    color: '#FFFFFF',
    fontSize: rs(11, 12, 13),
    fontWeight: '700',
  },
  modalContainer: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.95)',
  justifyContent: 'center',
  alignItems: 'center',
},

previewImage: {
  width: '90%',
  height: '75%',
},

closeBtn: {
  position: 'absolute',
  top: 60,
  right: 20,
  zIndex: 100,
  padding: 8,
},
});