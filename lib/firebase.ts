import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { supabase } from "@/lib/supabase";

const firebaseConfig = {
  apiKey: "AIzaSyC6G2XLHvY_WuU4U5I5g-MYLMRNpJ6-vQ",
  authDomain: "mishh-1fb39.firebaseapp.com",
  projectId: "mishh-1fb39",
  storageBucket: "mishh-1fb39.firebasestorage.app",
  messagingSenderId: "29441376412",
  appId: "1:29441376412:web:fe6f8ec85eefe2719a6d59",
  measurementId: "G-DFPPFGQZ32"
};

const app = initializeApp(firebaseConfig);

// FUNÇÃO QUE FAZ APARECER NA TELA BLOQUEADA
export async function ativarNotificacaoMISHH(userId: string) {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;

  const messaging = getMessaging(app);
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return null;

  const token = await getToken(messaging, {
    vapidKey: "BFAR_pGIknTTCw0GfLvHfwqESn2PSCiFZYFQqHmavHKmqtxXrvi4PC3HDDuwILB7jZF_AKR1a1NEwrB_vqjxbkg"
  });

  if (token) {
    const { error } = await supabase.from('push_tokens').upsert(
      { user_id: userId, token, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
    if (error) console.error('Erro ao salvar token de push:', error);
  }
  return token;
}

export async function ouvirMensagem() {
  if (typeof window === 'undefined') return;
  const supported = await isSupported();
  if (!supported) return;
  const messaging = getMessaging(app);
  onMessage(messaging, (payload: { notification?: { title?: string; body?: string } }) => {
    new Notification(payload.notification?.title || "Nova mensagem no MISHH", {
      body: payload.notification?.body,
      icon: "/icon.png"
    });
  });
}