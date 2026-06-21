import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";
import { supabase } from "./supabase";

export async function registrarPushToken() {
  try {
    console.log("1. Iniciando registro de push token...");
    
    const permission = await Notification.requestPermission();
    console.log("2. Permissão:", permission);
    
    if (permission !== "granted") {
      console.log("Permissão negada");
      return;
    }

    console.log("3. Obtendo token FCM...");
    const token = await getToken(messaging, {
      vapidKey: "BLEuqIR2LKxKEi5L5ViGkPO70B2iabH1FFETr6d9c4oEyEpZh8ZTHUdvotQKj07sH1O4B8gLMIitY3D8RUDvuHo"
    });

    console.log("4. Token obtido:", token ? "sim" : "não");

    if (token) {
      console.log("5. Buscando usuário...");
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log("6. Usuário:", user?.id, "Erro:", error);
      
      if (!user) return;

      console.log("7. Salvando token...");
      const { error: upsertError } = await supabase.from("push_tokens").upsert(
        { user_id: user.id, token },
        { onConflict: "user_id,token" }
      );
      
      console.log("8. Resultado:", upsertError ? upsertError.message : "Token salvo!");
    }
  } catch (err) {
    console.error("ERRO:", err);
  }
}