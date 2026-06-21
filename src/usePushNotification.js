import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = "BLEuqIR2LKxKEi5L5ViGkPO70B2iabH1FFETr6d9c4oEyEpZh8ZTHUdvotQKj07sH1O4B8gLMIitY3D8RUDvuHo";

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registrarPushToken() {
  try {
    console.log("1. Iniciando registro...");

    const permission = await Notification.requestPermission();
    console.log("2. Permissão:", permission);
    if (permission !== "granted") return;

    console.log("3. Registrando Service Worker...");
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    console.log("4. Service Worker pronto");

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    console.log("5. Subscription obtida");

    const { data: { user }, error } = await supabase.auth.getUser();
    console.log("6. Usuário:", user?.id, error);
    if (!user) return;

    const { error: upsertError } = await supabase.from("push_tokens").upsert(
      { user_id: user.id, token: JSON.stringify(subscription) },
      { onConflict: "user_id,token" }
    );

    console.log("7. Resultado:", upsertError ? upsertError.message : "Token salvo!");
  } catch (err) {
    console.error("ERRO:", err);
  }
}