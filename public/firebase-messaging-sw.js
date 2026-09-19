importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC6G2XLHvY_WuU4U5I5g-MYLMRNpJ6-vQ",
  authDomain: "mishh-1fb39.firebaseapp.com",
  projectId: "mishh-1fb39",
  storageBucket: "mishh-1fb39.firebasestorage.app",
  messagingSenderId: "29441376412",
  appId: "1:29441376412:web:fe6f8ec85eefe2719a6d59"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Nova mensagem no MISHH ";
  const options = {
    body: payload.notification?.body || "Alguém te enviou uma mensagem",
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [200, 100, 200],
    tag: "mishh-chat"
  };
  self.registration.showNotification(title, options);
});