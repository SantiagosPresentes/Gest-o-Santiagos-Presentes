import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";
import { supabase } from "./supabase";

export async function registrarPushToken() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Permissão de notificação negada");
      return;
    }

    const token = await getToken(messaging, {
      vapidKey: "BLEuqIR2LKxKEi5L5ViGkPO70B2iabH1FFETr6d9c4oEyEpZh8ZTHUdvotQKj07sH1O4B8gLMIitY3D8RUDvuHo"
    });

    if (token) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("push_tokens").upsert(
        { user_id: user.id, token },
        { onConflict: "user_id,token" }
      );

      console.log("Token salvo com sucesso!");
    }
  } catch (err) {
    console.error("Erro ao registrar token:", err);
  }
}