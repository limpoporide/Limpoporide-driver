// import React, { useEffect, useState } from 'react';
// import {
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
//   ScrollView,
//   StatusBar,
//   Dimensions,
//   ActivityIndicator,
// } from 'react-native';
// import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// import { SafeAreaView } from 'react-native-safe-area-context';

// import { notificationsAPI } from '../../services/api';

// const { width } = Dimensions.get('window');

// const isSmall = width < 375;
// const isMedium = width >= 375 && width < 414;

// const rs = (s: number, m: number, l: number) =>
//   isSmall ? s : isMedium ? m : l;

// const C = {
//   bg: '#0F0F0F',
//   orange: '#F19A2A',
//   cardBg: '#333333',
//   cardUnread: '#1E1E1E',
//   textPrimary: '#FFFFFF',
//   textSecondary: '#A0A0A0',
//   unreadDot: '#F19A2A',
//   readAllBtn: '#F19A2A',
// };

// interface Notification {
//   id: number;
//   sender_type: string;
//   user_id: number | null;
//   driver_id: number;
//   title: string;
//   message: string;
//   type: string;
//   is_read: number; // 1 = unread, 0 = read
//   send_code: string;
//   created_at: string;
//   updated_at: string;
// }

// const formatTime = (dateStr: string): string => {
//   const date = new Date(dateStr);
//   const now = new Date();
//   const diffMs = now.getTime() - date.getTime();
//   const diffMins = Math.floor(diffMs / 60000);
//   if (diffMins < 1) return 'Just now';
//   if (diffMins < 60) return `${diffMins}m ago`;
//   const diffHours = Math.floor(diffMins / 60);
//   if (diffHours < 24) return `${diffHours}h ago`;
//   const diffDays = Math.floor(diffHours / 24);
//   return `${diffDays}d ago`;
// };

// const NotificationScreen = ({ navigation }: any) => {
//   const [loading, setLoading] = useState<boolean>(true);
//   const [data, setData] = useState<Notification[]>([]);
//   const [markingAll, setMarkingAll] = useState<boolean>(false);

//   useEffect(() => {
//     getNotification();
//   }, []);

//   const getNotification = async (): Promise<void> => {
//     setLoading(true);
//     try {
//       const response = await notificationsAPI.getNotifications();
//       console.log('getNotifications response::::::', response);
//       if (response?.status) {
//         setData(response?.data || []);
//       }
//     } catch (error) {
//       console.error('Notification load error:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReadAll = async (): Promise<void> => {
//     const hasUnread = data.some((item) => item.is_read === 1);
//     if (!hasUnread || markingAll) return;

//     setMarkingAll(true);
//     try {
//       const response = await notificationsAPI.markAllAsRead();
//       console.log('markAllAsRead response::::::', response);
//       if (response?.status) {
//         setData((prev) => prev.map((item) => ({ ...item, is_read: 0 })));
//       }
//     } catch (error) {
//       console.error('Mark all read error:', error);
//     } finally {
//       setMarkingAll(false);
//     }
//   };





//   return (
//     <SafeAreaView style={styles.safeArea}>
//       <StatusBar backgroundColor={C.bg} barStyle="light-content" />

//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity
//           onPress={() => navigation?.goBack()}
//           style={styles.backBtn}
//         >
//           <MaterialCommunityIcons
//             name="arrow-left"
//             size={24}
//             color={C.textPrimary}
//           />
//         </TouchableOpacity>

//         <View style={styles.headerCenter}>
//           <Text style={styles.headerTitle}>Notifications</Text>
//         </View>

//         {data.some((item) => item.is_read === 1) ? (
//           <TouchableOpacity
//             onPress={handleReadAll}
//             style={[styles.readAllBtn, markingAll && styles.readAllBtnDisabled]}
//             disabled={markingAll}
//           >
//             {markingAll ? (
//               <ActivityIndicator size={12} color={C.orange} />
//             ) : (
//               <Text style={styles.readAllText}>Read All</Text>
//             )}
//           </TouchableOpacity>
//         ) : (
//           <View style={{ width: 68 }} />
//         )}
//       </View>

//       {/* Content */}
//       {loading ? (
//         <View style={styles.centered}>
//           <ActivityIndicator size="large" color={C.orange} />
//         </View>
//       ) : data.length === 0 ? (
//         <View style={styles.centered}>
//           <MaterialCommunityIcons
//             name="bell-off-outline"
//             size={48}
//             color="#444"
//           />
//           <Text style={styles.emptyText}>No notifications yet</Text>
//         </View>
//       ) : (
//         <ScrollView
//           contentContainerStyle={styles.scrollContainer}
//           showsVerticalScrollIndicator={false}
//         >
//           {data.map((item) => {
//             const isUnread = item.is_read === 1;
//             return (
//               <View
//                 key={item.id}
//                 style={[
//                   styles.notificationCard,
//                   isUnread && styles.notificationCardUnread,
//                 ]}
//               >
//                 {/* Unread indicator dot */}
//                 {isUnread && <View style={styles.unreadDot} />}

//                 <View style={styles.cardHeaderRow}>
//                   <Text
//                     style={[
//                       styles.cardTitle,
//                       !isUnread && styles.cardTitleRead,
//                     ]}
//                     numberOfLines={1}
//                   >
//                     {item.title}
//                   </Text>
//                   <Text style={styles.timeText}>
//                     {formatTime(item.created_at)}
//                   </Text>
//                 </View>

//                 <Text style={styles.cardBody}>{item.message}</Text>

//                 {/* Read status tag */}
//                 <View style={styles.cardFooter}>
//                   <View
//                     style={[
//                       styles.statusTag,
//                       isUnread ? styles.statusTagUnread : styles.statusTagRead,
//                     ]}
//                   >
//                     <MaterialCommunityIcons
//                       name={isUnread ? 'email-outline' : 'email-open-outline'}
//                       size={11}
//                       color={isUnread ? C.orange : '#666'}
//                     />
//                     <Text
//                       style={[
//                         styles.statusTagText,
//                         isUnread
//                           ? styles.statusTagTextUnread
//                           : styles.statusTagTextRead,
//                       ]}
//                     >
//                       {isUnread ? 'Unread' : 'Read'}
//                     </Text>
//                   </View>

//                   {/* {item.send_code ? (
//                     <Text style={styles.sendCode}>#{item.send_code}</Text>
//                   ) : null} */}
//                 </View>
//               </View>
//             );
//           })}
//         </ScrollView>
//       )}
//     </SafeAreaView>
//   );
// };

// export default NotificationScreen;

// const styles = StyleSheet.create({
//   safeArea: {
//     flex: 1,
//     backgroundColor: C.bg,
//   },

//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: '#2C2C2C',
//     backgroundColor: C.bg,
//   },

//   backBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 10,
//     backgroundColor: '#1A1A1A',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: '#2C2C2C',
//   },

//   headerCenter: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },

//   headerTitle: {
//     color: C.textPrimary,
//     fontWeight: '700',
//     fontSize: rs(15, 16, 17),
//     letterSpacing: 0.3,
//   },

//   unreadBadge: {
//     backgroundColor: C.orange,
//     borderRadius: 10,
//     minWidth: 20,
//     height: 20,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 5,
//   },

//   unreadBadgeText: {
//     color: '#000',
//     fontSize: 11,
//     fontWeight: '700',
//   },

//   readAllBtn: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: C.orange,
//     minWidth: 68,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   readAllBtnDisabled: {
//     borderColor: '#3A3A3A',
//   },

//   readAllText: {
//     color: C.orange,
//     fontSize: rs(11, 12, 12),
//     fontWeight: '600',
//   },

//   readAllTextDisabled: {
//     color: '#555',
//   },

//   scrollContainer: {
//     paddingHorizontal: 14,
//     paddingVertical: 16,
//     gap: 10,
//   },

//   centered: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     gap: 12,
//   },

//   emptyText: {
//     color: '#555',
//     fontSize: 14,
//     marginTop: 8,
//   },

//   /* Cards */
//   notificationCard: {
//     backgroundColor: C.cardBg,
//     borderRadius: 10,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     borderWidth: 1,
//     borderColor: 'transparent',
//     position: 'relative',
//   },

//   notificationCardUnread: {
//     backgroundColor: '#1C1C1C',
//     borderColor: '#F19A2A33',
//   },

//   unreadDot: {
//     position: 'absolute',
//     top: 14,
//     right: 14,
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: C.orange,
//   },

//   cardHeaderRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 5,
//     paddingRight: 16, // space for unread dot
//   },

//   cardTitle: {
//     color: C.textPrimary,
//     fontSize: rs(12, 13, 14),
//     fontWeight: '700',
//     flex: 1,
//     paddingRight: 8,
//   },

//   cardTitleRead: {
//     color: '#999',
//     fontWeight: '500',
//   },

//   timeText: {
//     color: C.textSecondary,
//     fontSize: rs(10, 11, 11),
//     flexShrink: 0,
//   },

//   cardBody: {
//     color: C.textSecondary,
//     fontSize: rs(11, 12, 12),
//     lineHeight: rs(16, 18, 18),
//     marginBottom: 8,
//   },

//   cardFooter: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     marginTop: 2,
//   },

//   statusTag: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     paddingHorizontal: 8,
//     paddingVertical: 3,
//     borderRadius: 20,
//   },

//   statusTagUnread: {
//     backgroundColor: '#F19A2A18',
//   },

//   statusTagRead: {
//     backgroundColor: '#2A2A2A',
//   },

//   statusTagText: {
//     fontSize: 10,
//     fontWeight: '600',
//   },

//   statusTagTextUnread: {
//     color: C.orange,
//   },

//   statusTagTextRead: {
//     color: '#666',
//   },

//   sendCode: {
//     color: '#555',
//     fontSize: 10,
//   },
// });




import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { notificationsAPI } from '../../services/api';

const { width } = Dimensions.get('window');

const isSmall = width < 375;
const isMedium = width >= 375 && width < 414;

const rs = (s: number, m: number, l: number) =>
  isSmall ? s : isMedium ? m : l;

const C = {
  bg: '#0F0F0F',
  orange: '#F19A2A',
  cardBg: '#333333',
  cardUnread: '#1E1E1E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  unreadDot: '#F19A2A',
  readAllBtn: '#F19A2A',
};

interface Notification {
  id: number;
  sender_type: string;
  user_id: number | null;
  driver_id: number;
  title: string;
  message: string;
  type: string;
  is_read: number; // 1 = unread, 0 = read
  send_code: string;
  created_at: string;
  updated_at: string;
}

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const NotificationScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<Notification[]>([]);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  useEffect(() => {
    getNotification();
  }, []);

  const getNotification = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await notificationsAPI.getNotifications();
      if (response?.status==1) {
        setData(response?.data || []);
      }
    } catch (error) {
      console.error('Notification load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReadAll = async (): Promise<void> => {
    const hasUnread = data.some((item) => item.is_read === 1);
    if (!hasUnread || markingAll) return;

    setMarkingAll(true);
    try {
      const response = await notificationsAPI.markAllAsRead();
      console.log('markAllAsRead response::::::', response);
      if (response?.status) {
        setData((prev) => prev.map((item) => ({ ...item, is_read: 0 })));
      }
    } catch (error) {
      console.error('Mark all read error:', error);
    } finally {
      setMarkingAll(false);
    }
  };





  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color={C.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>

        {data.some((item) => item.is_read === 1) ? (
          <TouchableOpacity
            onPress={handleReadAll}
            style={[styles.readAllBtn, markingAll && styles.readAllBtnDisabled]}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator size={12} color={C.orange} />
            ) : (
              <Text style={styles.readAllText}>Read All</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 68 }} />
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.orange} />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons
            name="bell-off-outline"
            size={48}
            color="#444"
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {data.map((item) => {
            const isUnread = item.is_read === 1;
            return (
              <View
                key={item.id}
                style={[
                  styles.notificationCard,
                  isUnread && styles.notificationCardUnread,
                ]}
              >
                {/* Unread indicator dot */}
                {isUnread && <View style={styles.unreadDot} />}

                <View style={styles.cardHeaderRow}>
                  <Text
                    style={[
                      styles.cardTitle,
                      !isUnread && styles.cardTitleRead,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.timeText}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>

                <Text style={styles.cardBody}>{item.message}</Text>

                {/* Read status tag */}
                <View style={styles.cardFooter}>
                  <View
                    style={[
                      styles.statusTag,
                      isUnread ? styles.statusTagUnread : styles.statusTagRead,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isUnread ? 'email-outline' : 'email-open-outline'}
                      size={11}
                      color={isUnread ? C.orange : '#666'}
                    />
                    <Text
                      style={[
                        styles.statusTagText,
                        isUnread
                          ? styles.statusTagTextUnread
                          : styles.statusTagTextRead,
                      ]}
                    >
                      {isUnread ? 'Unread' : 'Read'}
                    </Text>
                  </View>

                  {/* {item.send_code ? (
                    <Text style={styles.sendCode}>#{item.send_code}</Text>
                  ) : null} */}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default NotificationScreen;

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
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  headerTitle: {
    color: C.textPrimary,
    fontWeight: '700',
    fontSize: rs(15, 16, 17),
    letterSpacing: 0.3,
  },

  unreadBadge: {
    backgroundColor: C.orange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  unreadBadgeText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },

  readAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.orange,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },

  readAllBtnDisabled: {
    borderColor: '#3A3A3A',
  },

  readAllText: {
    color: C.orange,
    fontSize: rs(11, 12, 12),
    fontWeight: '600',
  },

  readAllTextDisabled: {
    color: '#555',
  },

  scrollContainer: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 10,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  emptyText: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },

  /* Cards */
  notificationCard: {
    backgroundColor: C.cardBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },

  notificationCardUnread: {
    backgroundColor: '#1C1C1C',
    borderColor: '#F19A2A33',
  },

  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.orange,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingRight: 16, // space for unread dot
  },

  cardTitle: {
    color: C.textPrimary,
    fontSize: rs(12, 13, 14),
    fontWeight: '700',
    flex: 1,
    paddingRight: 8,
  },

  cardTitleRead: {
    color: '#999',
    fontWeight: '500',
  },

  timeText: {
    color: C.textSecondary,
    fontSize: rs(10, 11, 11),
    flexShrink: 0,
  },

  cardBody: {
    color: C.textSecondary,
    fontSize: rs(11, 12, 12),
    lineHeight: rs(16, 18, 18),
    marginBottom: 8,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },

  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },

  statusTagUnread: {
    backgroundColor: '#F19A2A18',
  },

  statusTagRead: {
    backgroundColor: '#2A2A2A',
  },

  statusTagText: {
    fontSize: 10,
    fontWeight: '600',
  },

  statusTagTextUnread: {
    color: C.orange,
  },

  statusTagTextRead: {
    color: '#666',
  },

  sendCode: {
    color: '#555',
    fontSize: 10,
  },
});