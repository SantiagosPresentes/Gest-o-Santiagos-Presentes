importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDdVM8Oc290iP9FWGQ_L06AyYbK7XixXyw",
  authDomain: "santiagos-presentes.firebaseapp.com",
  projectId: "santiagos-presentes",
  storageBucket: "santiagos-presentes.firebasestorage.app",
  messagingSenderId: "727035547129",
  appId: "1:727035547129:web:82e04cecd591a0a7844128"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/favicon.png"
  });
});