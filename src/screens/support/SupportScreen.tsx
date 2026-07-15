import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

// ⚠️ Move this to your services/api.js alongside your other endpoints once
// you have a shared API helper set up, the same way ridesAPI/userAPI are
// defined elsewhere in the app. Kept local here since this screen doesn't
// currently import one.

const FAQ_API_URL = 'http://103.154.2.117/~limpoporide/limpopo_new/api/faq';

interface FaqItem {
  question: string;
  answer: string;
}

// Maps whatever the /faq API actually returns into the {question, answer}
// shape this screen renders. Field names are guessed from common patterns
// (question/answer, title/description, ques/ans) since the real response
// shape hasn't been confirmed yet — once you share a sample response,
// this is the only place that needs updating.
function normalizeFaqs(raw: any): FaqItem[] {
  const list = raw?.data ?? raw?.faq ?? raw ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .map((item: any) => ({
      question: item.question ?? item.title ?? item.ques ?? item.faq_question ?? '',
      answer: item.answer ?? item.description ?? item.ans ?? item.faq_answer ?? '',
    }))
    .filter((item: FaqItem) => item.question && item.answer);
}

const CONTACT_OPTIONS = [
  {
    icon: 'phone-outline',
    label: 'Call Support',
    sub: 'Mon–Fri, 8am–8pm',
    action: () => Linking.openURL('tel:+2348001234567'),
    color: '#22c55e',
  },
  {
    icon: 'whatsapp',
    label: 'WhatsApp',
    sub: 'Typically replies in minutes',
    action: () => Linking.openURL('https://wa.me/2348001234567'),
    color: '#25D366',
  },
  {
    icon: 'email-outline',
    label: 'Email Us',
    sub: 'support@yourapp.com',
    action: () => Linking.openURL('mailto:support@yourapp.com'),
    color: '#FF8C00',
  },
];

export default function SupportScreen({ navigation }: any): React.ReactElement {
  const [openFaq, setOpenFaq]       = useState<number | null>(null);
  const [subject, setSubject]       = useState('');
  const [message, setMessage]       = useState('');
  const [submitted, setSubmitted]   = useState(false);

  const [faqList, setFaqList]       = useState<FaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqError, setFaqError]     = useState<string | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      setFaqLoading(true);
      setFaqError(null);

      // Matches your curl: POST with form field type="1"
      const formData = new FormData();
      formData.append('type', '1');

      const res = await fetch(FAQ_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

      const json = await res.json();
      setFaqList(normalizeFaqs(json));
    } catch (e) {
      console.log('fetchFaqs error:', e);
      setFaqError('Unable to load FAQs. Pull to retry.');
    } finally {
      setFaqLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const toggleFaq = (index: number) => {
    setOpenFaq(prev => (prev === index ? null : index));
  };

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;
    // TODO: call your support ticket API here
    setSubmitted(true);
    setSubject('');
    setMessage('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.body}>

          {/* Contact options */}
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactGrid}>
            {CONTACT_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.contactCard}
                activeOpacity={0.8}
                onPress={item.action}
              >
                <View style={[styles.contactIconWrap, { backgroundColor: item.color + '20' }]}>
                  <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FAQ */}
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqLoading ? (
            <View style={styles.faqStateBox}>
              <ActivityIndicator color="#FF8C00" />
              <Text style={styles.faqStateText}>Loading FAQs…</Text>
            </View>
          ) : faqError ? (
            <View style={styles.faqStateBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EA2A2A" />
              <Text style={styles.faqStateText}>{faqError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchFaqs}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : faqList.length === 0 ? (
            <View style={styles.faqStateBox}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color="#555" />
              <Text style={styles.faqStateText}>No FAQs available right now.</Text>
            </View>
          ) : (
            <View style={styles.faqContainer}>
              {faqList.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.faqItem,
                    index < faqList.length - 1 && styles.faqItemBorder,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.faqQuestion}
                    activeOpacity={0.7}
                    onPress={() => toggleFaq(index)}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <MaterialCommunityIcons
                      name={openFaq === index ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#555"
                    />
                  </TouchableOpacity>

                  {openFaq === index && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Submit a ticket */}
          <Text style={styles.sectionTitle}>Submit a Ticket</Text>
          <View style={styles.ticketCard}>
            {submitted ? (
              <View style={styles.successBlock}>
                <MaterialCommunityIcons name="check-circle-outline" size={40} color="#22c55e" />
                <Text style={styles.successTitle}>Ticket Submitted</Text>
                <Text style={styles.successSub}>
                  Our team will get back to you within 24 hours.
                </Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => setSubmitted(false)}
                >
                  <Text style={styles.submitBtnText}>Submit Another</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Payment issue"
                  placeholderTextColor="#555"
                  value={subject}
                  onChangeText={setSubject}
                />

                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your issue in detail..."
                  placeholderTextColor="#555"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (!subject.trim() || !message.trim()) && styles.submitBtnDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleSubmit}
                  disabled={!subject.trim() || !message.trim()}
                >
                  <Text style={styles.submitBtnText}>Send Message</Text>
                  <MaterialCommunityIcons name="send-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* App version */}
          <Text style={styles.versionText}>App version 1.0.0</Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#DF9323',
  },
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },

  // Header
  header: {
    backgroundColor: '#DF9323',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0002',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },

  // Body
  body: {
    padding: 14,
    paddingBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 2,
  },

  // Contact cards
  contactGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  contactCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#2E2E2E',
    alignItems: 'center',
    gap: 6,
  },
  contactIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  contactSub: {
    fontSize: 10,
    color: '#555',
    textAlign: 'center',
    lineHeight: 14,
  },

  // FAQ
  faqContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#2E2E2E',
    overflow: 'hidden',
  },
  faqStateBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: '#2E2E2E',
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  faqStateText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    marginTop: 4,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  faqItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  faqItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#2E2E2E',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    lineHeight: 18,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginTop: 10,
  },

  // Ticket form
  ticketCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: '#2E2E2E',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#2E2E2E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
  },
  textArea: {
    height: 110,
    paddingTop: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Success state
  successBlock: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  successSub: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#333',
    marginTop: 8,
  },
});