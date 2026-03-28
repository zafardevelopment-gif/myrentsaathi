/**
 * DB-based Auth Layer
 * Login: email + password stored in users table (password field)
 * No Supabase Auth — direct table lookup
 */

import { supabase } from "./supabase";

export type DBUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  password: string | null;
};

// ─── LOGIN (by email) ────────────────────────────────────────

export async function dbLogin(email: string, password: string): Promise<{
  success: boolean;
  user?: DBUser;
  error?: string;
}> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role, password")
    .eq("email", email.trim().toLowerCase())
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return { success: false, error: "No account found with this email." };
  }

  if (data.password !== password) {
    return { success: false, error: "Incorrect password." };
  }

  return { success: true, user: data as DBUser };
}

// ─── LOGIN (Superadmin by User ID) ────────────────────────────

export async function superAdminLogin(userId: string, password: string): Promise<{
  success: boolean;
  user?: DBUser;
  error?: string;
}> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role, password")
    .eq("admin_user_id", userId.trim())
    .eq("role", "superadmin")
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return { success: false, error: "Invalid User ID or account not found." };
  }

  if (data.password !== password) {
    return { success: false, error: "Incorrect password." };
  }

  return { success: true, user: data as DBUser };
}

// ─── SIGNUP: SOCIETY ADMIN ────────────────────────────────────

export async function signupSocietyAdmin(params: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  society_name: string;
  society_city: string;
  society_state: string;
  society_address: string;
  total_flats: number;
  maintenance_amount: number;
}): Promise<{ success: boolean; error?: string; userId?: string; societyId?: string }> {
  // Check email not already taken
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", params.email.trim().toLowerCase())
    .single();
  if (existing) return { success: false, error: "Email already registered." };

  // Create user
  const { data: user, error: userErr } = await supabase
    .from("users")
    .insert({
      email: params.email.trim().toLowerCase(),
      full_name: params.full_name.trim(),
      phone: params.phone.trim(),
      role: "society_admin",
      password: params.password,
      is_active: true,
    })
    .select("id")
    .single();
  if (userErr || !user) return { success: false, error: userErr?.message ?? "Failed to create account." };

  // Create society
  const { data: societyInsert, error: socErr } = await supabase
    .from("societies")
    .insert({
      name: params.society_name.trim(),
      city: params.society_city.trim(),
      state: params.society_state.trim(),
      address: params.society_address.trim(),
      total_flats: params.total_flats,
      maintenance_amount: params.maintenance_amount,
      subscription_plan: "free",
      is_active: true,
      pincode: null,
      registration_number: null,
      total_floors: 0,
    })
    .select("id")
    .single();
  if (socErr || !societyInsert) {
    console.error("Society creation error:", socErr);
    return { success: false, error: socErr?.message ?? "Failed to create society." };
  }

  const societyId = societyInsert.id;

  // Link admin to society
  const { error: memberErr } = await supabase.from("society_members").insert({
    user_id: user.id,
    society_id: societyId,
    role: "admin",
    designation: "Society Admin",
  });

  if (memberErr) {
    console.error("Member creation error:", memberErr);
    // Don't fail, society was created successfully
  }

  return { success: true, userId: user.id, societyId: societyId };
}

// ─── SIGNUP: LANDLORD ─────────────────────────────────────────

export async function signupLandlord(params: {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ success: boolean; error?: string; userId?: string }> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", params.email.trim().toLowerCase())
    .single();
  if (existing) return { success: false, error: "Email already registered." };

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email: params.email.trim().toLowerCase(),
      full_name: params.full_name.trim(),
      phone: params.phone.trim(),
      role: "landlord",
      password: params.password,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !user) return { success: false, error: error?.message ?? "Failed to create account." };

  return { success: true, userId: user.id };
}

// ─── ADD GUARD (by society admin) ────────────────────────────

export async function addGuard(params: {
  full_name: string;
  email: string;
  phone: string;
  society_id: string;
}): Promise<{ success: boolean; error?: string; password?: string }> {
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", params.email.trim().toLowerCase())
    .single();
  if (existing) return { success: false, error: "Email already registered." };

  const autoPassword = params.full_name.split(" ")[0] + "@guard";

  const { data: user, error: userErr } = await supabase
    .from("users")
    .insert({
      email: params.email.trim().toLowerCase(),
      full_name: params.full_name.trim(),
      phone: params.phone.trim(),
      role: "guard",
      password: autoPassword,
      is_active: true,
    })
    .select("id")
    .single();
  if (userErr || !user) return { success: false, error: userErr?.message ?? "Failed to create guard." };

  const { error: memErr } = await supabase.from("society_members").insert({
    user_id: user.id,
    society_id: params.society_id,
    role: "guard",
    designation: "Security Guard",
  });
  if (memErr) return { success: false, error: "Failed to link guard to society." };

  return { success: true, password: autoPassword };
}

// ─── ADD BOARD MEMBER (by admin) ─────────────────────────────

export async function addBoardMember(params: {
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  society_id: string;
}): Promise<{ success: boolean; error?: string }> {
  // Upsert user
  let userId: string;
  const { data: existing } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", params.email.trim().toLowerCase())
    .single();

  if (existing) {
    userId = existing.id;
    if (existing.role !== "board_member") {
      await supabase.from("users").update({ role: "board_member" }).eq("id", userId);
    }
  } else {
    const autoPassword = params.full_name.split(" ")[0] + "@123";
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email: params.email.trim().toLowerCase(),
        full_name: params.full_name.trim(),
        phone: params.phone.trim(),
        role: "board_member",
        password: autoPassword,
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !newUser) return { success: false, error: "Failed to create user." };
    userId = newUser.id;
  }

  // Add to society_members — DB constraint allows 'board_member'
  const { error: memErr } = await supabase.from("society_members").insert({
    user_id: userId,
    society_id: params.society_id,
    role: "board_member",
    designation: params.designation,
  });
  if (memErr) return { success: false, error: "Failed to add to society." };

  return { success: true };
}

// ─── ADD TENANT (by landlord) ─────────────────────────────────

export async function addTenant(params: {
  full_name: string;
  email: string;
  phone: string;
  flat_id: string;
  society_id?: string | null;
  landlord_id: string;
  monthly_rent: number;
  security_deposit: number;
  lease_start: string;
  lease_end: string;
}): Promise<{ success: boolean; error?: string }> {
  // Upsert user
  let userId: string;
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", params.email.trim().toLowerCase())
    .single();

  if (existing) {
    userId = existing.id;
  } else {
    const autoPassword = params.full_name.split(" ")[0] + "@123";
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({
        email: params.email.trim().toLowerCase(),
        full_name: params.full_name.trim(),
        phone: params.phone.trim(),
        role: "tenant",
        password: autoPassword,
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !newUser) return { success: false, error: "Failed to create user." };
    userId = newUser.id;
  }

  // Create tenant record
  const tenantInsert: Record<string, unknown> = {
    user_id: userId,
    flat_id: params.flat_id,
    landlord_id: params.landlord_id,
    lease_start: params.lease_start,
    lease_end: params.lease_end,
    monthly_rent: params.monthly_rent,
    security_deposit: params.security_deposit,
    status: "active",
  };
  if (params.society_id) tenantInsert.society_id = params.society_id;

  const { data: tenantRecord, error: tenantErr } = await supabase
    .from("tenants")
    .insert(tenantInsert)
    .select("id")
    .single();
  if (tenantErr || !tenantRecord) return { success: false, error: tenantErr?.message ?? "Failed to create tenant record." };

  // Update flat status + current_tenant_id
  await supabase.from("flats").update({
    current_tenant_id: userId,
    status: "occupied",
  }).eq("id", params.flat_id);

  // Add to society_members only if society exists
  if (params.society_id) {
    await supabase.from("society_members").insert({
      user_id: userId,
      society_id: params.society_id,
      role: "tenant",
    });
  }

  // Create first rent payment record
  const currentMonth = new Date().toISOString().slice(0, 7);
  const rentInsert: Record<string, unknown> = {
    tenant_id: tenantRecord.id,
    flat_id: params.flat_id,
    landlord_id: params.landlord_id,
    amount: 0,
    expected_amount: params.monthly_rent,
    month_year: currentMonth,
    due_date: currentMonth + "-05",
    status: "pending",
  };
  if (params.society_id) rentInsert.society_id = params.society_id;
  await supabase.from("rent_payments").insert(rentInsert);

  return { success: true };
}
