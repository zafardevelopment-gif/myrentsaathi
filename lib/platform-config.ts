import { supabaseAdmin } from "./supabase-admin";

type ConfigKey =
  | "razorpay_key_id"
  | "razorpay_key_secret"
  | "razorpay_webhook_secret"
  | "whatsapp_access_token"
  | "whatsapp_phone_number_id"
  | "smtp_host"
  | "smtp_port"
  | "smtp_user"
  | "smtp_password"
  | "smtp_from_email"
  | "smtp_from_name";

// Simple in-process cache — cleared after 60 seconds so changes take effect quickly
const cache: Partial<Record<ConfigKey, string>> = {};
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadAll(): Promise<void> {
  const { data } = await supabaseAdmin
    .from("platform_config")
    .select("key, value");
  for (const row of data ?? []) {
    cache[row.key as ConfigKey] = row.value ?? "";
  }
  cacheLoadedAt = Date.now();
}

async function get(key: ConfigKey): Promise<string> {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await loadAll();
  }
  // DB value takes priority; fall back to env var
  const dbVal = cache[key];
  if (dbVal && dbVal.trim() !== "") return dbVal;
  return process.env[key.toUpperCase()] ?? "";
}

export async function getRazorpayKeys() {
  const [keyId, keySecret, webhookSecret] = await Promise.all([
    get("razorpay_key_id"),
    get("razorpay_key_secret"),
    get("razorpay_webhook_secret"),
  ]);
  return { keyId, keySecret, webhookSecret };
}

export async function getWhatsappCreds() {
  const [accessToken, phoneNumberId] = await Promise.all([
    get("whatsapp_access_token"),
    get("whatsapp_phone_number_id"),
  ]);
  return { accessToken, phoneNumberId };
}

export async function getSmtpConfig() {
  const [host, port, user, password, fromEmail, fromName] = await Promise.all([
    get("smtp_host"),
    get("smtp_port"),
    get("smtp_user"),
    get("smtp_password"),
    get("smtp_from_email"),
    get("smtp_from_name"),
  ]);
  return { host, port: port ? Number(port) : 587, user, password, fromEmail, fromName };
}
