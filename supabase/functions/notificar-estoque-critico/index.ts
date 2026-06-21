import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signingInput = `${encode(header)}.${encode(payload)}`;

  const pemKey = serviceAccount.private_key;
  const pemContents = pemKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: produtos } = await supabase
    .from("produtos")
    .select("nome, estoque, estoque_minimo")
    .or("estoque.eq.0,estoque.lt.estoque_minimo");

  if (!produtos || produtos.length === 0)
    return new Response("Nenhum produto crítico.", { status: 200 });

  const lista = produtos.map(p => `• ${p.nome} (${p.estoque} un)`).join("\n");

  const { data: tokens } = await supabase.from("push_tokens").select("token");

  if (!tokens || tokens.length === 0)
    return new Response("Nenhum token cadastrado.", { status: 200 });

  const serviceAccount = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT")!);
  const accessToken = await getAccessToken(serviceAccount);
  const projectId = serviceAccount.project_id;

  for (const { token } of tokens) {
    await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: "⚠️ Estoque crítico!",
            body: `${produtos.length} produto(s) precisam de reposição:\n${lista}`
          }
        }
      })
    });
  }

  return new Response("Notificações enviadas!", { status: 200 });
});