



import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ridesAPI } from '../../services/api';
import { useSocket } from '../../webSocket/SocketContext';
import useSocketListener from '../../webSocket/useSocketListener';
import { useSelector } from 'react-redux';
import { SOCKET_EVENTS } from '../../webSocket/socketEvents';

const { width } = Dimensions.get('window');

const C = {
  bg: '#0B0B0B',
  orange: '#E59332',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2D2D2D',
};

type Message = {
  id: string;
  text: string;
  timestamp: string;
  isOwn: boolean;
  chat_type:String;
};
const formatTime = (dateString: string) => {
  const date = new Date(dateString.replace(' ', 'T'));

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const ChatScreen = ({ navigation, route }: any) => {
  const { data } = route?.params ?? {};
  console.log("Chat Screen Data --->",data);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const user = useSelector(state => state.auth.userData);
  console.log("Data --->",data);
    const { isConnected, connectSocket } = useSocket();
  
  useEffect(() => {
    if (user?.id && !isConnected) {
      console.log('[SearchRide] socket fallback connect:', user.id);
      connectSocket(user.id);
    }
  }, [user?.id, isConnected]);

   useSocketListener(SOCKET_EVENTS.SEND_MESSAGE, data => {
      console.log('[SOCKET] Chat List:', data);
      getChat()
    });
  
    // ── Socket: ride cancelled by driver ─────────────────────────────────────
    useSocketListener(SOCKET_EVENTS.DRIVER_CANCEL_RIDE, data => {
      console.log('[SOCKET] driver_ride_cancel:', data);
   
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    });
  

  useEffect(() => {
    getChat();
  }, []);

  const getChat = async () => {
    try {
      const response = await ridesAPI.getChatHistory({
        receiver_id:  data?.user_id,
        booking_id: data?.booking_id,
      });

      console.log('getChat::::::', response);

      if (response?.status && response?.data) {
        const formattedMessages = response.data.map((item: any) => ({
          id: String(item.id),
          text: item.message,
          timestamp: formatTime(item.created_at),
          isOwn: Number(item.isOwn) === 1,
          chat_type:item?.chat_type
        }));

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.log('getChat error:', error);
    }
  };
  const sendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const response = await ridesAPI.sendMessage({
        receiver_id: data?.user_id,
        message: inputText.trim(),
        booking_id: data?.booking_id
      });

      console.log('sendMessage::::::', response);

      if (response?.status) {
        setInputText('');
        getChat(); // refresh messages
      }
    } catch (error) {
      console.log('sendMessage error:', error);
    }
  };

  // const renderMessage = ({ item }: { item: Message }) => (
  //   <View style={[styles.messageRow, item.isOwn ? styles.ownRow : styles.otherRow]}>
  //     <View style={[styles.messageBubble, item.isOwn ? styles.ownBubble : styles.otherBubble]}>
  //       <Text style={[styles.messageText, item.isOwn ? styles.ownText : styles.otherText]}>
  //         {item.text}
  //       </Text>
  //       <Text style={[styles.timestamp, item.isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
  //         {item.timestamp}
  //       </Text>
  //     </View>
  //   </View>
  // );


  const renderMessage = ({ item }: { item: Message }) => {
  const isRight = item.chat_type === 'right';

  return (
    <View
      style={[
        styles.messageRow,
        isRight ? styles.ownRow : styles.otherRow,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isRight ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isRight ? styles.ownText : styles.otherText,
          ]}
        >
          {item.text}
        </Text>

        <Text
          style={[
            styles.timestamp,
            isRight ? styles.ownTimestamp : styles.otherTimestamp,
          ]}
        >
          {item.timestamp}
        </Text>
      </View>
    </View>
  );
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.orange} barStyle="dark-content" />

      {/* Header unchanged */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat with {data?.user_name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        {/* Input bar - will stay right above keyboard */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={C.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <MaterialCommunityIcons name="send" size={22} color={C.orange} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

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
    borderColor: '#2C2C2C',
  },
  headerTitle: {
    color: C.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chatList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  otherRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: C.orange,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: C.textPrimary,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: C.textPrimary,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  otherTimestamp: {
    color: C.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2C',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 40,
    color: C.bg,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    position: 'absolute',
    right: 20,
    bottom: 13,
    padding: 6,
  },
});