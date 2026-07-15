// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   TextInput,
//   Alert,
//   ActivityIndicator,
//   Image,
//   Modal,
//   Platform,
// } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import { launchCamera, launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
// import { MainTabScreenProps } from '../../types/navigation';
// import { driverAPI, driverAuthAPI } from '../../services/api';
// import { Driver, UpdateProfileRequest, ApiError } from '../../types/api';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import toastService from "../../Utility/toast";

// type ProfileScreenProps = MainTabScreenProps<'Profile'>;

// type GenderOption = 'Male' | 'Female' | 'Other';
// const GENDER_OPTIONS: GenderOption[] = ['Male', 'Female', 'Other'];

// const normalizeGender = (raw?: string): GenderOption | undefined => {
//   if (!raw) return undefined;
//   const match = GENDER_OPTIONS.find(
//     (opt) => opt.toLowerCase() === raw.toLowerCase()
//   );
//   return match;
// };

// export default function ProfileScreen({ navigation }: ProfileScreenProps): React.ReactElement {
//   const [profile, setProfile] = useState<Driver | null>(null);
//   const [loading, setLoading] = useState<boolean>(true);
//   const [editing, setEditing] = useState<boolean>(false);
//   const [saving, setSaving] = useState<boolean>(false);
//   const [editedProfile, setEditedProfile] = useState<Driver | null>(null);

//   const [imageActionSheetVisible, setImageActionSheetVisible] = useState<boolean>(false);
//   const [imageUploading, setImageUploading] = useState<boolean>(false);

//   useEffect(() => {
//     loadProfile();
//   }, []);

//   const loadProfile = async (): Promise<void> => {
//     setLoading(true);
//     try {
//       const response = await driverAPI.getProfile();
//       console.log('getProfile:::::', response);
      
//       if (response?.status) {
//         // Normalize gender from API so UI selection works correctly
//         const user: Driver = {
//           ...response.data,
//           gender: normalizeGender(response.data?.gender),
//         };
//         setProfile(user);
//         setEditedProfile(user);
//       }
//     } catch (error) {
//       const apiError = error as ApiError;
//       const errorMessage = apiError.message || 'Failed to load profile';
//       Alert.alert('Error', errorMessage);
//       console.error('Profile load error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ─── Profile Image ────────────────────────────────────────────────────────

//   const handleImageSelected = async (pickerResponse: ImagePickerResponse): Promise<void> => {
//     if (pickerResponse.didCancel) return;

//     if (pickerResponse.errorCode) {
//       const msg =
//         pickerResponse.errorCode === 'permission'
//           ? 'Permission denied. Please allow camera/gallery access in settings.'
//           : pickerResponse.errorMessage || 'Failed to pick image';
//       toastService.error(msg);
//       return;
//     }

//     if (!pickerResponse.assets?.length) return;

//     const asset = pickerResponse.assets[0];
//     if (!asset.uri) return;

//     const newPhotoUri = asset.uri;
//     setProfile((prev) => prev ? { ...prev, profile_photo: newPhotoUri } : prev);

//     setImageUploading(true);
//     try {
//       const formData = new FormData();
//       formData.append('profile_photo', {
//         uri: asset.uri,
//         type: asset.type || 'image/jpeg',
//         name: asset.fileName || 'profile_photo.jpg',
//       } as any);

//       const response = await driverAPI.updateProfileImage(formData);
//       console.log('updateProfileImage response:::::', response);

//       if (response?.status) {
//         const serverUri: string | undefined =
//           response.data?.profile_photo ?? response.data?.user?.profile_photo;
//         if (serverUri) {
//           setProfile((prev) => prev ? { ...prev, profile_photo: serverUri } : prev);
//         }
//         toastService.success(response?.message || 'Profile photo updated');
//       } else {
//         setProfile((prev) =>
//           prev ? { ...prev, profile_photo: profile?.profile_photo } : prev
//         );
//         toastService.error(response?.message || 'Failed to update profile photo');
//       }
//     } catch (error) {
//       const apiError = error as ApiError;
//       console.log('updateProfileImage error:::::', error);
//       setProfile((prev) =>
//         prev ? { ...prev, profile_photo: profile?.profile_photo } : prev
//       );
//       toastService.error(apiError?.message || 'Failed to update profile photo');
//     } finally {
//       setImageUploading(false);
//     }
//   };

//   const handleTakePhoto = (): void => {
//     setImageActionSheetVisible(false);
//     launchCamera(
//       { mediaType: 'photo' as MediaType, quality: 0.8, saveToPhotos: false },
//       handleImageSelected,
//     );
//   };

//   const handleChooseFromGallery = (): void => {
//     setImageActionSheetVisible(false);
//     launchImageLibrary(
//       { mediaType: 'photo' as MediaType, quality: 0.8 },
//       handleImageSelected,
//     );
//   };

//   const handleSaveProfile = async (): Promise<void> => {
//   if (!editedProfile?.full_name?.trim()) {
//     toastService.error('Full name is required');
//     return;
//   }

//   const updateData: UpdateProfileRequest = {
//     full_name: editedProfile.full_name.trim(),
//     gender: editedProfile?.gender?.toLowerCase(),
//   };

//   setSaving(true);
//   try {
//     const response = await driverAPI.updateProfile(updateData);

//     if (response?.status) {
//       setProfile((prev) =>
//         prev
//           ? { ...prev, full_name: editedProfile.full_name, gender: editedProfile.gender }
//           : prev
//       );
//       setEditing(false);
//       toastService.success(response?.message || 'Profile updated successfully');
//     } else {
//       toastService.error(response?.message || 'Failed to update profile');
//     }
//   } catch (error) {
//     try {
//       const response = await driverAPI.updateProfile(updateData);
//       if (response?.status) {
//         setProfile((prev) =>
//           prev
//             ? { ...prev, full_name: editedProfile.full_name, gender: editedProfile.gender }
//             : prev
//         );
//         setEditing(false);
//         toastService.success(response?.message || 'Profile updated successfully');
//       } else {
//         toastService.error(response?.message || 'Failed to update profile');
//       }
//     } catch (retryError) {
//       const apiError = retryError as ApiError;
//       console.log('updateProfile error:::::', apiError);
//       toastService.error('Failed to update profile. Please try again.');
//     }
//   } finally {
//     setSaving(false);
//   }
// };

//   // const handleSaveProfile = async (): Promise<void> => {
//   //   if (!editedProfile?.full_name?.trim()) {
//   //     toastService.error('Full name is required');
//   //     return;
//   //   }

//   //   setSaving(true);
//   //   try {
//   //     const updateData: UpdateProfileRequest = {
//   //       full_name: editedProfile.full_name.trim(),
//   //       gender: editedProfile?.gender?.toLowerCase(),
//   //     };

//   //     const response = await driverAPI.updateProfile(updateData);

//   //     if (response?.status) {
//   //       setProfile((prev) =>
//   //         prev
//   //           ? {
//   //               ...prev,
//   //               full_name: editedProfile.full_name,
//   //               gender: editedProfile.gender,
//   //             }
//   //           : prev
//   //       );
//   //       setEditing(false);
//   //       toastService.success(response?.message || 'Profile updated successfully');
//   //     } else {
//   //       toastService.error(response?.message || 'Failed to update profile');
//   //     }
//   //   } catch (error) {
//   //     const apiError = error as ApiError;
//   //     console.log('updateProfile error:::::', error);
//   //   } finally {
//   //     setSaving(false);
//   //   }
//   // };




//   // ─── Logout ───────────────────────────────────────────────────────────────

//   const handleLogout = async (): Promise<void> => {
//     Alert.alert(
//       'Confirm Logout',
//       'Are you sure you want to logout?',
//       [
//         { text: 'Cancel', style: 'cancel' },
//         {
//           text: 'Logout',
//           style: 'destructive',
//           onPress: async () => {
//             try {
//               await driverAuthAPI.logout();
//             } catch (error) {
//               console.error('Logout error:', error);
//             } finally {
//               await AsyncStorage.removeItem('userToken');
//               await AsyncStorage.removeItem('driverId');
//               (global as any).authDispatch({ type: 'SIGN_OUT' });
//             }
//           },
//         },
//       ]
//     );
//   };

//   // ─── Render ───────────────────────────────────────────────────────────────

//   if (loading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#FF8C00" />
//       </View>
//     );
//   }

//   if (!profile) {
//     return (
//       <View style={styles.errorContainer}>
//         <MaterialCommunityIcons name="alert-circle" size={48} color="#f44336" />
//         <Text style={styles.errorText}>Failed to load profile</Text>
//         <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
//           <Text style={styles.retryButtonText}>Retry</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container} edges={['top']}>
//       <ScrollView style={styles.container}>
//         {/* Profile Header */}
//         <View style={styles.headerSection}>
//           <View style={styles.avatarContainer}>
//             <TouchableOpacity
//               onPress={() => setImageActionSheetVisible(true)}
//               activeOpacity={0.8}
//               style={styles.avatarTouchable}
//             >
//               {profile?.profile_photo ? (
//                 <Image
//                   source={{ uri: profile.profile_photo }}
//                   style={styles.avatar}
//                   resizeMode="cover"
//                 />
//               ) : (
//                 <MaterialCommunityIcons
//                   name="account-circle"
//                   size={80}
//                   color="#FF8C00"
//                 />
//               )}

//               <View style={styles.cameraIconOverlay}>
//                 {imageUploading ? (
//                   <ActivityIndicator size="small" color="#fff" />
//                 ) : (
//                   <MaterialCommunityIcons name="camera" size={14} color="#fff" />
//                 )}
//               </View>
//             </TouchableOpacity>
//           </View>

//           <Text style={styles.profileName}>{profile.full_name}</Text>
//           <Text style={styles.profileEmail}>{profile.email}</Text>
//         </View>

//         {/* Stats Section */}
//         <View style={styles.statsSection}>
//           <View style={styles.statItem}>
//             <MaterialCommunityIcons name="car-multiple" size={28} color="#FF8C00" />
//             <Text style={styles.statLabel}>Trips</Text>
//             <Text style={styles.statValue}>{profile.total_trips || 0}</Text>
//           </View>

//           <View style={styles.statItem}>
//             <MaterialCommunityIcons name="star" size={28} color="#FF8C00" />
//             <Text style={styles.statLabel}>Rating</Text>
//             <Text style={styles.statValue}>{(profile.rating || 0).toFixed(1)}</Text>
//           </View>

//           <View style={styles.statItem}>
//             <MaterialCommunityIcons name="cash-multiple" size={28} color="#FF8C00" />
//             <Text style={styles.statLabel}>Earnings</Text>
//             <Text style={styles.statValue}>R{profile?.total_earnings?.toFixed(2) || 0}</Text>
//           </View>
//         </View>

//         {/* Personal Information Section */}
//         <View style={styles.section}>
//           <View style={styles.sectionHeader}>
//             <Text style={styles.sectionTitle}>Personal Information</Text>
//             {/* {!editing && (
//               <TouchableOpacity onPress={() => setEditing(true)}>
//                 <MaterialCommunityIcons name="pencil" size={20} color="#FF8C00" />
//               </TouchableOpacity>
//             )} */}
//           </View>

//           {editing ? (
//             <View style={styles.formContainer}>
//               <View style={styles.formGroup}>
//                 <Text style={styles.label}>Full Name</Text>
//                 <TextInput
//                   style={styles.input}
//                   placeholder="Full Name"
//                   value={editedProfile?.full_name}
//                   onChangeText={(text) =>
//                     setEditedProfile({ ...editedProfile!, full_name: text })
//                   }
//                   editable={!saving}
//                 />
//               </View>

//               <View style={styles.formGroup}>
//                 <Text style={styles.label}>Email</Text>
//                 <TextInput
//                   style={[styles.input, styles.inputDisabled]}
//                   placeholder="Email"
//                   value={editedProfile?.email}
//                   keyboardType="email-address"
//                   editable={false}
//                 />
//               </View>

//               <View style={styles.formGroup}>
//                 <Text style={styles.label}>Phone</Text>
//                 <TextInput
//                   style={[styles.input, styles.inputDisabled]}
//                   placeholder="Phone"
//                   value={editedProfile?.mobile_number}
//                   keyboardType="phone-pad"
//                   editable={false}
//                 />
//               </View>

//               {/* Gender selector */}
//               <View style={styles.formGroup}>
//                 <Text style={styles.label}>Gender</Text>
//                 <View style={styles.genderContainer}>
//                   {GENDER_OPTIONS.map((option) => {
//                     const isSelected = editedProfile?.gender === option;
//                     return (
//                       <TouchableOpacity
//                         key={option}
//                         style={[
//                           styles.genderOption,
//                           isSelected && styles.genderOptionSelected,
//                         ]}
//                         onPress={() =>
//                           !saving && setEditedProfile({ ...editedProfile!, gender: option })
//                         }
//                         activeOpacity={0.7}
//                         disabled={saving}
//                       >
//                         <View style={[styles.genderRadio, isSelected && styles.genderRadioSelected]}>
//                           {isSelected && <View style={styles.genderRadioInner} />}
//                         </View>
//                         <Text
//                           style={[
//                             styles.genderOptionText,
//                             isSelected && styles.genderOptionTextSelected,
//                           ]}
//                         >
//                           {option}
//                         </Text>
//                       </TouchableOpacity>
//                     );
//                   })}
//                 </View>
//               </View>

//               <View style={styles.buttonContainer}>
//                 <TouchableOpacity
//                   style={styles.cancelButton}
//                   onPress={() => {
//                     setEditing(false);
//                     setEditedProfile(profile);
//                   }}
//                   disabled={saving}
//                 >
//                   <Text style={styles.cancelButtonText}>Cancel</Text>
//                 </TouchableOpacity>

//                 <TouchableOpacity
//                   style={[styles.saveButton, saving && styles.buttonDisabled]}
//                   onPress={handleSaveProfile}
//                   disabled={saving}
//                 >
//                   {saving ? (
//                     <ActivityIndicator color="#fff" size="small" />
//                   ) : (
//                     <Text style={styles.saveButtonText}>Save Changes</Text>
//                   )}
//                 </TouchableOpacity>
//               </View>
//             </View>
//           ) : (
//             <View style={styles.displayContainer}>
//               <View style={styles.displayItem}>
//                 <Text style={styles.displayLabel}>Name</Text>
//                 <Text style={styles.displayValue}>{profile.full_name}</Text>
//               </View>

//               <View style={styles.displayItem}>
//                 <Text style={styles.displayLabel}>Email</Text>
//                 <Text style={styles.displayValue}>{profile.email}</Text>
//               </View>

//               <View style={styles.displayItem}>
//                 <Text style={styles.displayLabel}>Phone</Text>
//                 <Text style={styles.displayValue}>{profile.mobile_number}</Text>
//               </View>

//               {profile.gender && (
//                 <View style={styles.displayItem}>
//                   <Text style={styles.displayLabel}>Gender</Text>
//                   <Text style={styles.displayValue}>{profile.gender}</Text>
//                 </View>
//               )}

//               {profile.vehicle_number && (
//                 <View style={styles.displayItem}>
//                   <Text style={styles.displayLabel}>Vehicle Number</Text>
//                   <Text style={styles.displayValue}>{profile.vehicle_number}</Text>
//                 </View>
//               )}
//             </View>
//           )}
//         </View>

//         {/* Account Settings Section */}
//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Account Settings</Text>

//           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('VehicleProfileScreen')}>
//             <View style={styles.settingContent}>
//               <MaterialCommunityIcons name="car" size={24} color="#FF8C00" />
//               <Text style={styles.settingLabel}>Vehicle Profile</Text>
//             </View>
//             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('BankAccountScreen')}>
//             <View style={styles.settingContent}>
//               <MaterialCommunityIcons name="bank" size={24} color="#FF8C00" />
//               <Text style={styles.settingLabel}>Bank Account Details</Text>
//             </View>
//             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
//           </TouchableOpacity>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Support & Legal</Text>

//           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('PrivacyPolicyScreen')}>
//             <View style={styles.settingContent}>
//               <MaterialCommunityIcons name="shield-lock" size={24} color="#FF8C00" />
//               <Text style={styles.settingLabel}>Privacy Policy</Text>
//             </View>
//             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('AboutUsScreen')}>
//             <View style={styles.settingContent}>
//               <MaterialCommunityIcons name="information" size={24} color="#FF8C00" />
//               <Text style={styles.settingLabel}>About Us</Text>
//             </View>
//             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('TermsConditionsScreen')}>
//             <View style={styles.settingContent}>
//               <MaterialCommunityIcons name="file-document" size={24} color="#FF8C00" />
//               <Text style={styles.settingLabel}>Terms & Conditions</Text>
//             </View>
//             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FAQScreen')}>
//             <View style={styles.settingContent}>
//               <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#FF8C00" />
//               <Text style={styles.settingLabel}>FAQ</Text>
//             </View>
//             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
//           </TouchableOpacity>
//         </View>

//         {/* Danger Zone */}
//         <View style={styles.section}>
//           <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
//             <MaterialCommunityIcons name="logout" size={20} color="#fff" />
//             <Text style={styles.logoutButtonText}>Logout</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={{ height: 30 }} />
//       </ScrollView>

//       {/* Image action sheet modal */}
//       <Modal
//         visible={imageActionSheetVisible}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setImageActionSheetVisible(false)}
//       >
//         <TouchableOpacity
//           style={styles.modalOverlay}
//           activeOpacity={1}
//           onPress={() => setImageActionSheetVisible(false)}
//         >
//           <View style={styles.actionSheet}>
//             <View style={styles.actionSheetHandle} />
//             <Text style={styles.actionSheetTitle}>Update Profile Photo</Text>

//             <TouchableOpacity style={styles.actionSheetItem} onPress={handleTakePhoto}>
//               <MaterialCommunityIcons name="camera" size={22} color="#FF8C00" />
//               <Text style={styles.actionSheetItemText}>Take Photo</Text>
//             </TouchableOpacity>

//             <TouchableOpacity style={styles.actionSheetItem} onPress={handleChooseFromGallery}>
//               <MaterialCommunityIcons name="image-multiple" size={22} color="#FF8C00" />
//               <Text style={styles.actionSheetItemText}>Choose from Gallery</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={[styles.actionSheetItem, styles.actionSheetCancel]}
//               onPress={() => setImageActionSheetVisible(false)}
//             >
//               <Text style={styles.actionSheetCancelText}>Cancel</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#101010',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   errorContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   errorText: {
//     fontSize: 16,
//     color: '#666',
//     marginTop: 12,
//   },
//   retryButton: {
//     marginTop: 20,
//     backgroundColor: '#FF8C00',
//     paddingHorizontal: 30,
//     paddingVertical: 12,
//     borderRadius: 8,
//   },
//   retryButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//   },
//   headerSection: {
//     alignItems: 'center',
//     paddingVertical: 30,
//     backgroundColor: '#101010',
//     borderBottomWidth: 1,
//     borderBottomColor: '#fff',
//   },
//   avatarContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     marginBottom: 15,
//   },
//   avatarTouchable: {
//     position: 'relative',
//     width: 84,
//     height: 84,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   avatar: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//   },
//   cameraIconOverlay: {
//     position: 'absolute',
//     bottom: 0,
//     right: 0,
//     backgroundColor: '#FF8C00',
//     borderRadius: 12,
//     width: 24,
//     height: 24,
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 2,
//     borderColor: '#101010',
//   },
//   profileName: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: '#FF8C00',
//     marginBottom: 5,
//   },
//   profileEmail: {
//     fontSize: 14,
//     color: '#fff',
//   },
//   statsSection: {
//     flexDirection: 'row',
//     paddingHorizontal: 10,
//     paddingVertical: 15,
//     justifyContent: 'space-between',
//   },
//   statItem: {
//     flex: 1,
//     backgroundColor: '#282828',
//     borderRadius: 12,
//     padding: 12,
//     marginHorizontal: 5,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#fff',
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#fff',
//     marginTop: 8,
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#FF8C00',
//     marginTop: 4,
//   },
//   section: {
//     marginHorizontal: 15,
//     marginVertical: 15,
//     backgroundColor: '#282828',
//     borderRadius: 12,
//     padding: 15,
//     borderWidth: 1,
//     borderColor: '#fff',
//   },
//   sectionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 15,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   displayContainer: {
//     gap: 12,
//   },
//   displayItem: {
//     paddingBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#fff',
//   },
//   displayLabel: {
//     fontSize: 12,
//     color: '#fff',
//     marginBottom: 5,
//   },
//   displayValue: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '500',
//   },
//   formContainer: {
//     gap: 15,
//   },
//   formGroup: {
//     marginBottom: 5,
//   },
//   label: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#fff',
//     marginBottom: 8,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#FFD580',
//     borderRadius: 8,
//     paddingHorizontal: 15,
//     paddingVertical: 12,
//     fontSize: 14,
//     color: '#333',
//     backgroundColor: '#fff',
//   },
//   // Subtle visual cue for non-editable fields
//   inputDisabled: {
//     backgroundColor: '#e0e0e0',
//     borderColor: '#bbb',
//     color: '#888',
//   },
//   genderContainer: {
//     flexDirection: 'row',
//     gap: 10,
//   },
//   genderOption: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#FFD580',
//     borderRadius: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 10,
//     backgroundColor: '#1e1e1e',
//     gap: 6,
//   },
//   genderOptionSelected: {
//     borderColor: '#FF8C00',
//     backgroundColor: '#2e1f00',
//   },
//   genderRadio: {
//     width: 16,
//     height: 16,
//     borderRadius: 8,
//     borderWidth: 2,
//     borderColor: '#FFD580',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   genderRadioSelected: {
//     borderColor: '#FF8C00',
//   },
//   genderRadioInner: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#FF8C00',
//   },
//   genderOptionText: {
//     fontSize: 13,
//     color: '#aaa',
//     fontWeight: '500',
//   },
//   genderOptionTextSelected: {
//     color: '#FF8C00',
//     fontWeight: '600',
//   },
//   buttonContainer: {
//     flexDirection: 'row',
//     gap: 10,
//     marginTop: 10,
//   },
//   cancelButton: {
//     flex: 1,
//     borderWidth: 2,
//     borderColor: '#FF8C00',
//     borderRadius: 8,
//     paddingVertical: 12,
//     alignItems: 'center',
//   },
//   cancelButtonText: {
//     color: '#FF8C00',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   saveButton: {
//     flex: 1,
//     backgroundColor: '#FF8C00',
//     borderRadius: 8,
//     paddingVertical: 12,
//     alignItems: 'center',
//   },
//   saveButtonText: {
//     color: '#fff',
//     fontWeight: '600',
//     fontSize: 14,
//   },
//   buttonDisabled: {
//     opacity: 0.6,
//   },
//   settingItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#fff',
//   },
//   settingContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   settingLabel: {
//     fontSize: 16,
//     color: '#fff',
//     marginLeft: 12,
//     fontWeight: '500',
//   },
//   logoutButton: {
//     flexDirection: 'row',
//     backgroundColor: '#f44336',
//     borderRadius: 12,
//     paddingVertical: 15,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowColor: '#f44336',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.2,
//     shadowRadius: 6,
//     elevation: 4,
//   },
//   logoutButtonText: {
//     color: '#fff',
//     fontWeight: 'bold',
//     fontSize: 16,
//     marginLeft: 8,
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.55)',
//     justifyContent: 'flex-end',
//   },
//   actionSheet: {
//     backgroundColor: '#282828',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     paddingHorizontal: 20,
//     paddingBottom: Platform.OS === 'ios' ? 36 : 24,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderColor: '#444',
//   },
//   actionSheetHandle: {
//     width: 40,
//     height: 4,
//     backgroundColor: '#555',
//     borderRadius: 2,
//     alignSelf: 'center',
//     marginBottom: 16,
//   },
//   actionSheetTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: '#fff',
//     textAlign: 'center',
//     marginBottom: 18,
//   },
//   actionSheetItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 14,
//     paddingVertical: 15,
//     borderBottomWidth: 1,
//     borderBottomColor: '#3a3a3a',
//   },
//   actionSheetItemText: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: '500',
//   },
//   actionSheetCancel: {
//     borderBottomWidth: 0,
//     justifyContent: 'center',
//     marginTop: 4,
//   },
//   actionSheetCancelText: {
//     fontSize: 16,
//     color: '#f44336',
//     fontWeight: '600',
//     textAlign: 'center',
//     width: '100%',
//   },
// });









import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  MediaType,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { MainTabScreenProps } from '../../types/navigation';
import { Driver, UpdateProfileRequest, ApiError } from '../../types/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import toastService from '../../Utility/toast';
import { useDispatch } from 'react-redux';
import { updateUserData } from '../../../features/authReducer';
import { driverAPI, driverAuthAPI, ridesAPI } from '../../services/api';


type ProfileScreenProps = MainTabScreenProps<'Profile'>;

type GenderOption = 'Male' | 'Female' | 'Other';
const GENDER_OPTIONS: GenderOption[] = ['Male', 'Female', 'Other'];

const MAX_RETRIES = 3;

export default function ProfileScreen({ navigation }: ProfileScreenProps): React.ReactElement {
  const [profile, setProfile] = useState<Driver | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState<Driver | null>(null);

  const [imageActionSheetVisible, setImageActionSheetVisible] = useState<boolean>(false);
  const [imageUploading, setImageUploading] = useState<boolean>(false);

  // ── Upload retry state ──────────────────────────────────────────────────
  const [uploadErrorVisible, setUploadErrorVisible] = useState(false);
  const [uploadErrorMsg, setUploadErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  
const dispatch = useDispatch();

  // Store last picked asset so we can retry without re-opening picker
  const pendingAssetRef = useRef<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);

  // Store previous photo so we can revert on permanent failure
  const previousPhotoRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await driverAPI.getProfile();
      console.log("Profile reposne ===>",response);
      
      if (response?.status) {
        setProfile(response?.data);
        setEditedProfile(response?.data);
        dispatch(updateUserData(response?.data));

      }
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'App needs access to your camera to take a profile photo.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
          buttonNeutral: 'Ask Me Later',
        },
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert(
          'Camera Permission Denied',
          'Please enable camera access in your device settings.',
          [{ text: 'OK' }],
        );
        return false;
      }
      return true;
    } catch (error) {
      console.log('Camera permission error:', error);
      return false;
    }
  };


const uploadImage = async (uri: string, type: string, name: string, attempt: number = 1) => {
  setImageUploading(true);
  try {
    const formData = new FormData();
    formData.append('profile', {                          // ✅ must be 'profile'
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      type,
      name,
    } as any);

    const response = await driverAPI.updateProfileImage(formData);
    console.log(`uploadImage attempt ${attempt}:`, response);

    if (response?.status) {
      const serverUri: string | undefined =
        response?.data?.profile           // ✅ check what key API returns
        ?? response?.data?.profile_photo
        ?? response?.data?.user?.profile;

      setProfile(prev =>
        prev ? { ...prev, profile_photo: serverUri || uri } : prev,
      );
      pendingAssetRef.current = null;
      setRetryCount(0);
      setUploadErrorVisible(false);
      loadProfile()
      toastService.success(response?.message || 'Profile photo updated');
    } else {
      throw new Error(response?.message || 'Upload failed');
    }
  } catch (error: any) {
    console.log(`uploadImage attempt ${attempt} error:`, error);
    setProfile(prev =>
      prev ? { ...prev, profile_photo: previousPhotoRef.current } : prev,
    );
    setUploadErrorMsg(error?.message || 'Failed to upload photo. Please try again.');
    setUploadErrorVisible(true);
  } finally {
    setImageUploading(false);
    setRetrying(false);
  }
};


  const handleRetryUpload = async () => {
    if (!pendingAssetRef.current) return;

    const nextCount = retryCount + 1;
    setRetryCount(nextCount);

    if (nextCount > MAX_RETRIES) {

      setUploadErrorVisible(false);
      pendingAssetRef.current = null;
      setRetryCount(0);
      toastService.error('Upload failed after multiple attempts. Please try again later.');
      return;
    }

    setRetrying(true);
    setUploadErrorVisible(false);


    setProfile(prev =>
      prev ? { ...prev, profile_photo: pendingAssetRef.current!.uri } : prev,
    );

    const { uri, type, name } = pendingAssetRef.current;
    await uploadImage(uri, type, name, nextCount + 1);
  };


  const handleDismissUploadError = () => {
    setUploadErrorVisible(false);
    pendingAssetRef.current = null;
    setRetryCount(0);
    // Keep photo reverted to previous
    setProfile(prev =>
      prev ? { ...prev, profile_photo: previousPhotoRef.current } : prev,
    );
  };

 
  const handleImageSelected = async (pickerResponse: ImagePickerResponse): Promise<void> => {
    if (pickerResponse.didCancel) return;

    if (pickerResponse.errorCode) {
      const msg =
        pickerResponse.errorCode === 'permission'
          ? 'Permission denied. Please allow camera/gallery access in settings.'
          : pickerResponse.errorCode === 'camera_unavailable'
          ? 'Camera is not available on this device.'
          : pickerResponse.errorMessage || 'Failed to pick image';
      toastService.error(msg);
      return;
    }

    if (!pickerResponse.assets?.length) return;

    const asset = pickerResponse.assets[0];
    if (!asset.uri) {
      toastService.error('Could not read image. Please try again.');
      return;
    }

    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      toastService.error('Image is too large. Please choose an image under 5 MB.');
      return;
    }

    previousPhotoRef.current = profile?.profile_photo;

    pendingAssetRef.current = {
      uri: asset.uri,
      type: asset.type || 'image/jpeg',
      name: asset.fileName || `profile_${Date.now()}.jpg`,
    };

    setRetryCount(0);
    setUploadErrorVisible(false);

    setProfile(prev => (prev ? { ...prev, profile_photo: asset.uri! } : prev));

    const { uri, type, name } = pendingAssetRef.current;
    await uploadImage(uri, type, name, 1);
  };

  const handleTakePhoto = async (): Promise<void> => {
    setImageActionSheetVisible(false);


    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      saveToPhotos: false,
      includeBase64: false,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    setTimeout(() => {
      launchCamera(options, handleImageSelected);
    }, 300);
  };


  const handleChooseFromGallery = (): void => {
    setImageActionSheetVisible(false);

    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: false,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 1,
    };

    setTimeout(() => {
      launchImageLibrary(options, handleImageSelected);
    }, 300);
  };


  const handleSaveProfile = async (): Promise<void> => {
    if (!editedProfile?.name?.trim()) {
      toastService.error('Full name is required');
      return;
    }
    setSaving(true);
    try {
      const updateData: UpdateProfileRequest = {
        name: editedProfile.name.trim(),
        gender: editedProfile?.gender?.toLowerCase(),
      };
      const response = await driverAPI.updateProfile(updateData);
      if (response?.status) {
        setProfile(prev =>
          prev
            ? { ...prev, name: editedProfile.name, gender: editedProfile.gender }
            : prev,
        );
        setEditing(false);
        toastService.success(response?.message || 'Profile updated successfully');
      } else {
        toastService.error(response?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.log('updateProfile error:', error);
    } finally {
      setSaving(false);
    }
  };


  const handleLogout = async (): Promise<void> => {
    Alert.alert('Confirm Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await userAuthAPI.logout().catch(() => null);
            await AsyncStorage.multiRemove(['userToken']);
            useDispatch(updateUserData(null));
            (global as any).authDispatch({ type: 'SIGN_OUT' });
          } catch (error) {
            await AsyncStorage.multiRemove(['userToken']);
            (global as any).authDispatch({ type: 'SIGN_OUT' });
          }
        },
      },
    ]);
  };




  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#f44336" />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const retriesLeft = MAX_RETRIES - retryCount;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.container}>

        {/* Profile Header */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity
              onPress={() => !imageUploading && setImageActionSheetVisible(true)}
              activeOpacity={0.8}
              style={styles.avatarTouchable}
            >
              {profile?.profile ? (
                <Image
                  source={{ uri: profile.profile }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={80} color="#FF8C00" />
              )}
              <View style={styles.cameraIconOverlay}>
                {imageUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <MaterialCommunityIcons name="pencil" size={20} color="#FF8C00" />
              </TouchableOpacity>
            )}
          </View>

                  {/* Account Settings Section */}
     

          {editing ? (
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={editedProfile?.name}
                  onChangeText={text =>
                    setEditedProfile({ ...editedProfile!, name: text })
                  }
                  editable={!saving}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={editedProfile?.email}
                  keyboardType="email-address"
                  editable={false}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={editedProfile?.mobile_no}
                  keyboardType="phone-pad"
                  editable={false}
                />
              </View>

          

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => { setEditing(false); setEditedProfile(profile); }}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.buttonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.displayContainer}>
              <View style={styles.displayItem}>
                <Text style={styles.displayLabel}>Name</Text>
                <Text style={styles.displayValue}>{profile.name}</Text>
              </View>
              <View style={styles.displayItem}>
                <Text style={styles.displayLabel}>Email</Text>
                <Text style={styles.displayValue}>{profile.email}</Text>
              </View>
              <View style={styles.displayItem}>
                <Text style={styles.displayLabel}>Phone</Text>
                <Text style={styles.displayValue}>{profile.mobile_no}</Text>
              </View>
         
              {profile.vehicle_number && (
                <View style={styles.displayItem}>
                  <Text style={styles.displayLabel}>Vehicle Number</Text>
                  <Text style={styles.displayValue}>{profile.vehicle_number}</Text>
                </View>
              )}
            </View>
          )}
        </View>

           <View style={styles.section}>
         <Text style={styles.sectionTitle}>Account Settings</Text>

           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('VehicleProfileScreen')}>
             <View style={styles.settingContent}>
               <MaterialCommunityIcons name="car" size={24} color="#FF8C00" />
              <Text style={styles.settingLabel}>Vehicle Profile</Text>
            </View>
             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

           <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Driverearningsscreen')}>
             <View style={styles.settingContent}>
               <MaterialCommunityIcons name="cash" size={24} color="#FF8C00" />
              <Text style={styles.settingLabel}>Total Earning</Text>
            </View>
             <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('BankAccountScreen')}>
             <View style={styles.settingContent}>
               <MaterialCommunityIcons name="bank" size={24} color="#FF8C00" />
               <Text style={styles.settingLabel}>Bank Account Details</Text>
             </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('PrivacyPolicyScreen')}>
            <View style={styles.settingContent}>
              <MaterialCommunityIcons name="shield-lock" size={24} color="#FF8C00" />
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('AboutUsScreen')}>
            <View style={styles.settingContent}>
              <MaterialCommunityIcons name="information" size={24} color="#FF8C00" />
              <Text style={styles.settingLabel}>About Us</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('TermsConditionsScreen')}>
            <View style={styles.settingContent}>
              <MaterialCommunityIcons name="file-document" size={24} color="#FF8C00" />
              <Text style={styles.settingLabel}>Terms & Conditions</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FAQScreen')}>
            <View style={styles.settingContent}>
              <MaterialCommunityIcons name="frequently-asked-questions" size={24} color="#FF8C00" />
              <Text style={styles.settingLabel}>FAQ</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Image action sheet ── */}
      <Modal
        visible={imageActionSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImageActionSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageActionSheetVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>Update Profile Photo</Text>
            <TouchableOpacity style={styles.actionSheetItem} onPress={handleTakePhoto}>
              <MaterialCommunityIcons name="camera" size={22} color="#FF8C00" />
              <Text style={styles.actionSheetItemText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionSheetItem} onPress={handleChooseFromGallery}>
              <MaterialCommunityIcons name="image-multiple" size={22} color="#FF8C00" />
              <Text style={styles.actionSheetItemText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetItem, styles.actionSheetCancel]}
              onPress={() => setImageActionSheetVisible(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Upload error + retry modal ── */}
      <Modal
        visible={uploadErrorVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDismissUploadError}
      >
        <View style={styles.errorModalOverlay}>
          <View style={styles.errorModalBox}>
            <MaterialCommunityIcons name="cloud-upload-outline" size={44} color="#f44336" />

            <Text style={styles.errorModalTitle}>Upload Failed</Text>
            <Text style={styles.errorModalMsg}>{uploadErrorMsg}</Text>

            {/* Retry attempts indicator */}
            {retriesLeft > 0 && (
              <View style={styles.retriesRow}>
                {Array.from({ length: MAX_RETRIES }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.retryDot,
                      i < retriesLeft ? styles.retryDotActive : styles.retryDotUsed,
                    ]}
                  />
                ))}
                <Text style={styles.retriesLabel}>
                  {retriesLeft} attempt{retriesLeft !== 1 ? 's' : ''} left
                </Text>
              </View>
            )}

            <View style={styles.errorModalActions}>
              {/* Dismiss */}
              <TouchableOpacity
                style={styles.errorModalDismissBtn}
                onPress={handleDismissUploadError}
                disabled={retrying}
              >
                <Text style={styles.errorModalDismissText}>Dismiss</Text>
              </TouchableOpacity>

              {/* Retry or "No more retries" */}
              {retriesLeft > 0 ? (
                <TouchableOpacity
                  style={[styles.errorModalRetryBtn, retrying && { opacity: 0.6 }]}
                  onPress={handleRetryUpload}
                  disabled={retrying}
                >
                  {retrying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
                      <Text style={styles.errorModalRetryText}>Try Again</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.errorModalDismissBtn}
                  onPress={handleDismissUploadError}
                >
                  <Text style={styles.errorModalDismissText}>Close</Text>
                </TouchableOpacity>
              )}
            </View>

            {retriesLeft === 0 && (
              <Text style={styles.noRetriesText}>
                Max retries reached. Please try uploading again later.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101010' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#666', marginTop: 12 },
  retryButton: {
    marginTop: 20, backgroundColor: '#FF8C00',
    paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  headerSection: {
    alignItems: 'center', paddingVertical: 30,
    backgroundColor: '#101010', borderBottomWidth: 1, borderBottomColor: '#fff',
  },
  avatarContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  avatarTouchable: {
    position: 'relative', width: 84, height: 84,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  cameraIconOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#FF8C00', borderRadius: 12,
    width: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#101010',
  },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#FF8C00', marginBottom: 5 },
  profileEmail: { fontSize: 14, color: '#fff' },
  section: {
    marginHorizontal: 15, marginVertical: 15,
    backgroundColor: '#282828', borderRadius: 12,
    padding: 15, borderWidth: 1, borderColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  displayContainer: { gap: 12 },
  displayItem: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#fff' },
  displayLabel: { fontSize: 12, color: '#fff', marginBottom: 5 },
  displayValue: { fontSize: 16, color: '#fff', fontWeight: '500' },
  formContainer: { gap: 15 },
  formGroup: { marginBottom: 5 },
  label: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#FFD580', borderRadius: 8,
    paddingHorizontal: 15, paddingVertical: 12,
    fontSize: 14, color: '#333', backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#e0e0e0', borderColor: '#bbb', color: '#888' },
  genderContainer: { flexDirection: 'row', gap: 10 },
  genderOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#FFD580', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 10,
    backgroundColor: '#1e1e1e', gap: 6,
  },
  genderOptionSelected: { borderColor: '#FF8C00', backgroundColor: '#2e1f00' },
  genderRadio: {
    width: 16, height: 16, borderRadius: 8, borderWidth: 2,
    borderColor: '#FFD580', alignItems: 'center', justifyContent: 'center',
  },
  genderRadioSelected: { borderColor: '#FF8C00' },
  genderRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF8C00' },
  genderOptionText: { fontSize: 13, color: '#aaa', fontWeight: '500' },
  genderOptionTextSelected: { color: '#FF8C00', fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelButton: {
    flex: 1, borderWidth: 2, borderColor: '#FF8C00',
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  cancelButtonText: { color: '#FF8C00', fontWeight: '600', fontSize: 14 },
  saveButton: {
    flex: 1, backgroundColor: '#FF8C00',
    borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  buttonDisabled: { opacity: 0.6 },
  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#fff',
  },
  settingContent: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 16, color: '#fff', marginLeft: 12, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row', backgroundColor: '#f44336',
    borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  logoutButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
  // Action sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  actionSheet: {
    backgroundColor: '#282828', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12, borderTopWidth: 1, borderColor: '#444',
  },
  actionSheetHandle: {
    width: 40, height: 4, backgroundColor: '#555',
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  actionSheetTitle: {
    fontSize: 16, fontWeight: '700', color: '#fff',
    textAlign: 'center', marginBottom: 18,
  },
  actionSheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#3a3a3a',
  },
  actionSheetItemText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  actionSheetCancel: { borderBottomWidth: 0, justifyContent: 'center', marginTop: 4 },
  actionSheetCancelText: {
    fontSize: 16, color: '#f44336', fontWeight: '600',
    textAlign: 'center', width: '100%',
  },
  // Upload error modal
  errorModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
  },
  errorModalBox: {
    width: '85%', backgroundColor: '#1e1e1e',
    borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  errorModalTitle: {
    color: '#fff', fontSize: 17, fontWeight: '700',
    marginTop: 12, marginBottom: 8,
  },
  errorModalMsg: {
    color: '#aaa', fontSize: 13, textAlign: 'center',
    lineHeight: 19, marginBottom: 16,
  },
  retriesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20,
  },
  retryDot: { width: 10, height: 10, borderRadius: 5 },
  retryDotActive: { backgroundColor: '#FF8C00' },
  retryDotUsed: { backgroundColor: '#333' },
  retriesLabel: { color: '#aaa', fontSize: 12, marginLeft: 4 },
  errorModalActions: {
    flexDirection: 'row', gap: 10, width: '100%',
  },
  errorModalDismissBtn: {
    flex: 1, height: 44, backgroundColor: '#2a2a2a',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#444',
  },
  errorModalDismissText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  errorModalRetryBtn: {
    flex: 1, height: 44, backgroundColor: '#FF8C00',
    borderRadius: 10, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  errorModalRetryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  noRetriesText: {
    color: '#666', fontSize: 11, textAlign: 'center',
    marginTop: 14, lineHeight: 16,
  },
});