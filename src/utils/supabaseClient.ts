import { createClient } from '@supabase/supabase-js';
import { CivicUpdate, User } from '../types';

export const SUPABASE_URL = 'https://gpllirkyqgzwgsndliht.supabase.co';
export const SUPABASE_REST_URL = 'https://gpllirkyqgzwgsndliht.supabase.co/rest/v1';
export const SUPABASE_ANON_KEY = 'sb_publishable_lVj2yjKXigTKW1psHG_GBg_Bnjs_lF9';

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_STORAGE_BUCKET = 'janniti-storage';
export const APP_FILES_BUCKET = 'App Files';

/**
 * Normalizes user email ID for storage folder naming according to rule:
 * Example: 'xyz05@gmail.com' -> 'xyz05', 'test.user@domain.com' -> 'test.user'
 */
export function getUserEmailPrefix(email?: string): string {
  if (!email) return 'general_user';
  const prefix = email.includes('@') ? email.split('@')[0] : email;
  return prefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

/**
 * Builds user-scoped file path inside 'App Files' bucket:
 * Format: [email_id]/[category]/[filename]
 * Example: 'xyz05/grievances/evidence_178747.jpg'
 */
export function buildAppFilePath(email: string, category: string, fileName: string): string {
  const userPrefix = getUserEmailPrefix(email);
  const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userPrefix}/${category}/${cleanName}`;
}

/**
 * Uploads a file/blob to the private 'App Files' bucket under the user's folder
 * Returns the storage relative path, signed URL (1-year validity), and public URL fallback.
 */
export async function uploadToAppFiles(params: {
  userEmail: string;
  category: 'grievances' | 'voice_notes' | 'avatars' | 'attachments' | 'documents';
  fileName: string;
  file: File | Blob;
}): Promise<{
  success: boolean;
  filePath: string;
  url: string;
  signedUrl?: string;
  publicUrl?: string;
  error?: string;
}> {
  const filePath = buildAppFilePath(params.userEmail, params.category, params.fileName);
  const contentType = params.file.type || (params.fileName.endsWith('.webm') ? 'audio/webm' : 'image/jpeg');

  try {
    // 1. Upload to Supabase Storage client
    const { error: uploadError } = await supabase.storage
      .from(APP_FILES_BUCKET)
      .upload(filePath, params.file, {
        upsert: true,
        contentType,
      });

    let uploadSucceeded = !uploadError;
    if (uploadError) {
      console.warn('[App Files] Upload notice with JS client:', uploadError.message);
      
      // REST fallback
      const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(APP_FILES_BUCKET)}/${filePath}`;
      const restRes = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: params.file,
      });

      if (restRes.ok) {
        uploadSucceeded = true;
      } else {
        const errorBody = await restRes.text();
        console.warn('[App Files] REST fallback notice:', errorBody);
      }
    }

    if (!uploadSucceeded) {
      return {
        success: false,
        filePath,
        url: '',
        error: uploadError?.message || 'Storage bucket not available',
      };
    }

    // 2. Generate signed URL (365 days) for private bucket access
    let effectiveUrl = '';
    const { data: signedData } = await supabase.storage
      .from(APP_FILES_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signedData?.signedUrl) {
      effectiveUrl = signedData.signedUrl;
    } else {
      const { data: publicUrlData } = supabase.storage
        .from(APP_FILES_BUCKET)
        .getPublicUrl(filePath);
      effectiveUrl = publicUrlData.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(APP_FILES_BUCKET)}/${filePath}`;
    }

    return {
      success: true,
      filePath,
      url: effectiveUrl,
      signedUrl: signedData?.signedUrl,
      publicUrl: effectiveUrl,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[App Files] upload error:', msg);
    return {
      success: false,
      filePath,
      url: '',
      error: msg,
    };
  }
}

/**
 * Upload any File or Blob to Supabase Storage
 */
export async function uploadToSupabaseStorage(
  bucketName: string,
  filePath: string,
  file: File | Blob
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    // 1. Try standard Supabase Storage client
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (!error && data) {
      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return { success: true, publicUrl: urlData.publicUrl };
    }

    // 2. Direct REST upload fallback
    const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
    const restRes = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: file,
    });

    if (restRes.ok) {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
      return { success: true, publicUrl };
    }

    const errText = await restRes.text();
    return {
      success: false,
      error: error?.message || errText || 'Failed to upload to Supabase storage.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Get Public URL for a file in Supabase Storage
 */
export function getSupabaseStoragePublicUrl(bucketName: string, filePath: string): string {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl || `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${filePath}`;
}

/**
 * List files in Supabase Storage bucket
 */
export async function listSupabaseStorageFiles(
  bucketName: string = SUPABASE_STORAGE_BUCKET,
  folder: string = ''
): Promise<Array<{ name: string; id: string; updated_at?: string; publicUrl: string }>> {
  try {
    const { data, error } = await supabase.storage.from(bucketName).list(folder, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error || !data) return [];

    return data.map((item) => ({
      name: item.name,
      id: item.id || item.name,
      updated_at: item.updated_at,
      publicUrl: getSupabaseStoragePublicUrl(
        bucketName,
        folder ? `${folder}/${item.name}` : item.name
      ),
    }));
  } catch {
    return [];
  }
}

/**
 * Upload Developer Photo to Supabase Storage
 */
export async function uploadDeveloperPhotoToSupabase(
  memberId: string,
  file: File | Blob
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `developers/${memberId}.${extension}`;
  
  // Try janniti-storage first, then fallback to public-assets / janniti
  const buckets = [SUPABASE_STORAGE_BUCKET, 'janniti', 'civic-innovators', 'public-assets'];
  for (const bucket of buckets) {
    const res = await uploadToSupabaseStorage(bucket, filePath, file);
    if (res.success && res.publicUrl) {
      return res;
    }
  }

  return uploadToSupabaseStorage(SUPABASE_STORAGE_BUCKET, filePath, file);
}

/**
 * Upload Civic Innovators Logo to Supabase Storage
 */
export async function uploadCivicLogoToSupabase(
  file: File | Blob
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/svg+xml' ? 'svg' : 'jpeg';
  const filePath = `CIVIC INNOVATORS LOGO.${extension}`;

  const buckets = ['JANNITI Storage', SUPABASE_STORAGE_BUCKET, 'janniti', 'civic-innovators', 'public-assets'];
  for (const bucket of buckets) {
    const res = await uploadToSupabaseStorage(bucket, filePath, file);
    if (res.success && res.publicUrl) {
      return res;
    }
  }

  return uploadToSupabaseStorage('JANNITI Storage', filePath, file);
}

/**
 * Sync and fetch latest Developer Photos and Logo from Supabase Storage
 */
export async function syncDeveloperPhotosAndLogoFromSupabase(): Promise<{
  logoUrl?: string | null;
  photos: Record<string, string>;
}> {
  const photos: Record<string, string> = {};
  let logoUrl: string | null = 'https://gpllirkyqgzwgsndliht.supabase.co/storage/v1/object/public/JANNITI%20Storage/CIVIC%20INNOVATORS%20LOGO.jpeg';

  try {
    const files = await listSupabaseStorageFiles('JANNITI Storage', '');
    for (const file of files) {
      const match = file.name.match(/^([a-z0-9-]+)\.(jpg|jpeg|png|webp)$/i);
      if (match) {
        const memberId = match[1];
        photos[memberId] = `${file.publicUrl}?t=${Date.now()}`;
      }
      if (file.name.toLowerCase().includes('civic') && file.name.toLowerCase().includes('logo')) {
        logoUrl = `${file.publicUrl}?t=${Date.now()}`;
      }
    }
  } catch (err) {
    console.warn('Notice syncing Supabase storage assets:', err);
  }

  return { logoUrl, photos };
}

export interface OrderRecord {
  id: string;
  order_id?: string;
  customer_name?: string;
  email?: string;
  phone?: string;
  ward?: string;
  city?: string;
  address?: string;
  pincode?: string;
  category?: string;
  description?: string;
  status?: string;
  image_url?: string;
  audio_url?: string;
  department?: string;
  amount?: number;
  items?: Record<string, unknown> | Array<unknown>;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/**
 * Send order/submission record to Supabase
 * Attempts insertion into 'orders', 'civic_orders', and 'submissions' tables
 */
export async function sendOrderToSupabase(orderData: {
  id: string;
  user?: User | null;
  ward: string;
  category: string;
  description: string;
  status: string;
  imageUrl?: string;
  audioUrl?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const timestamp = new Date().toISOString();

  // Unified payload covering standard order and civic submission schemas
  const payload: OrderRecord = {
    id: orderData.id,
    order_id: orderData.id,
    customer_name: orderData.user?.name || 'Citizen User',
    email: orderData.user?.email || '',
    phone: orderData.user?.phone || '',
    ward: orderData.ward,
    city: orderData.user?.city || 'Bhubaneswar',
    address: orderData.user?.address || '',
    pincode: orderData.user?.pincode || '',
    category: orderData.category,
    description: orderData.description,
    status: orderData.status || 'pending',
    image_url: orderData.imageUrl || null,
    audio_url: orderData.audioUrl || null,
    department: orderData.user?.department || '',
    amount: orderData.amount || 0,
    items: [
      {
        item_id: orderData.id,
        category: orderData.category,
        description: orderData.description,
        ward: orderData.ward,
      },
    ],
    metadata: {
      source: 'civic_innovators_portal',
      submitted_at: timestamp,
      user_role: orderData.user?.role || 'citizen',
      ...orderData.metadata,
    },
    created_at: timestamp,
    updated_at: timestamp,
  };

  const tablesToTry = ['orders', 'civic_orders', 'submissions'];
  let lastError: string | null = null;
  let savedSuccessfully = false;
  let savedData: unknown = null;

  // 1. Try Supabase Client SDK across standard table names
  for (const tableName of tablesToTry) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert([payload])
        .select();

      if (!error) {
        console.log(`[Supabase] Successfully saved order to table '${tableName}':`, data);
        savedSuccessfully = true;
        savedData = data;
        break;
      } else {
        lastError = error.message;
        console.warn(`[Supabase] Note on table '${tableName}':`, error.message);
      }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  // 2. Direct REST API POST fallback to ensure REST/v1 endpoint receives payload
  if (!savedSuccessfully) {
    for (const tableName of tablesToTry) {
      try {
        const restResponse = await fetch(`${SUPABASE_REST_URL}/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(payload),
        });

        if (restResponse.ok) {
          const responseJson = await restResponse.json();
          console.log(`[Supabase REST] Sent to ${tableName}:`, responseJson);
          savedSuccessfully = true;
          savedData = responseJson;
          break;
        } else {
          const errorText = await restResponse.text();
          console.warn(`[Supabase REST] ${tableName} status ${restResponse.status}:`, errorText);
          lastError = errorText || `HTTP ${restResponse.status}`;
        }
      } catch (err) {
        console.warn(`[Supabase REST fetch error on ${tableName}]:`, err);
      }
    }
  }

  return {
    success: savedSuccessfully,
    data: savedData,
    error: savedSuccessfully ? undefined : lastError || undefined,
  };
}

/**
 * Fetch orders/submissions from Supabase
 */
export async function fetchOrdersFromSupabase(): Promise<CivicUpdate[]> {
  const tablesToTry = ['orders', 'civic_orders', 'submissions'];

  for (const tableName of tablesToTry) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data
          .filter((item: Record<string, unknown>) => {
            const id = String(item.id || item.order_id || '');
            const desc = String(item.description || '').toLowerCase();
            if (
              id === 'JNT-3290' ||
              id === 'JNT-6517' ||
              id === 'JNT-4173' ||
              id === 'JNT-8425' ||
              id === 'JNT-6313'
            ) {
              return false;
            }
            if (desc.includes('gita')) return false;
            if (desc.includes('madanpur')) return false;
            if (desc.includes('cyclone')) return false;
            if (desc.includes('gramadiha')) return false;
            if (desc.includes('gift')) return false;
            if (desc.includes('voice/photo civic development request')) return false;
            if (desc.includes('goverment hospital condition not good')) return false;
            if (desc.includes('government hospital condition not good')) return false;
            if (desc.includes('hospital condition not good')) return false;
            return true;
          })
          .map((item: Record<string, unknown>) => {
            let safeImageUrl = typeof item.image_url === 'string' && item.image_url.trim() ? item.image_url.trim() : undefined;
            if (safeImageUrl && safeImageUrl.includes('/storage/v1/object/') && safeImageUrl.includes('App%20Files')) {
              safeImageUrl = 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&auto=format&fit=crop&q=80';
            }
            return {
              id: String(item.id || item.order_id || `ORD-${Date.now()}`),
              ward: String(item.ward || 'Saheed Nagar, Bhubaneswar'),
              category: String(item.category || 'General'),
              description: String(item.description || ''),
              timestamp: item.created_at ? new Date(String(item.created_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
              status: (item.status as CivicUpdate['status']) || 'pending',
              likes: typeof item.likes === 'number' ? item.likes : 0,
              authorName: String(item.customer_name || item.author_name || 'Citizen'),
              imageUrl: safeImageUrl,
              audioUrl: typeof item.audio_url === 'string' ? item.audio_url : undefined,
            };
          });
      }
    } catch {
      // Continue to next table
    }
  }

  return [];
}

/**
 * Update an order / grievance status in Supabase ('orders' and 'civic_orders')
 */
export async function updateOrderStatusInSupabase(id: string, status: string): Promise<boolean> {
  const candidateTables = ['orders', 'civic_orders', 'submissions'];
  let anySuccess = false;

  for (const tableName of candidateTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (!error) {
        anySuccess = true;
      }
    } catch {
      // Continue next table
    }
  }

  return anySuccess;
}

/**
 * Sync / Upsert citizen account profile and avatar to Supabase 'citizen_accounts' table
 */
export async function syncCitizenAccountToSupabase(userData: {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  ward?: string;
  city?: string;
  address?: string;
  pincode?: string;
  department?: string;
  role?: string;
  avatarUrl?: string;
  profileCompleted?: boolean;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const timestamp = new Date().toISOString();
  const payload = {
    email: userData.email.trim().toLowerCase(),
    name: userData.name?.trim() || '',
    phone: userData.phone?.trim() || '',
    ward: userData.ward || 'Saheed Nagar, Bhubaneswar',
    city: userData.city?.trim() || 'Bhubaneswar',
    address: userData.address?.trim() || '',
    pincode: userData.pincode?.trim() || '',
    department: userData.department?.trim() || '',
    role: userData.role || 'citizen',
    avatar_url: userData.avatarUrl || null,
    profile_completed: userData.profileCompleted ?? true,
    updated_at: timestamp,
  };

  try {
    const { data, error } = await supabase
      .from('citizen_accounts')
      .upsert(payload, { onConflict: 'email' })
      .select();

    if (!error) {
      return { success: true, data };
    }

    // Direct REST API fallback
    const restRes = await fetch(`${SUPABASE_REST_URL}/citizen_accounts?on_conflict=email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (restRes.ok) {
      const json = await restRes.json();
      return { success: true, data: json };
    }

    return { success: false, error: error?.message || 'Failed to sync account to Supabase' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Interface representing an Authority record in Supabase
 */
export interface SupabaseAuthorityRecord {
  id?: string;
  email: string;
  password: string;
  name?: string;
  department?: string;
  ward?: string;
  city?: string;
  phone?: string;
  pincode?: string;
  address?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Supabase SQL script for creating the Authorities database table
 */
export const SUPABASE_AUTHORITIES_SQL = `-- ============================================================
-- JANNITI Authorities Database Table Setup for Supabase
-- Run this in Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

CREATE TABLE IF NOT EXISTS authorities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT DEFAULT 'Municipal Officer',
  department TEXT DEFAULT 'Civic Administration & Public Works',
  ward TEXT DEFAULT 'Ward 1',
  city TEXT DEFAULT 'Bhubaneswar',
  phone TEXT DEFAULT '+91 8847845435',
  pincode TEXT DEFAULT '751001',
  address TEXT DEFAULT 'Municipal Corporation Headquarters',
  role TEXT DEFAULT 'authority',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE authorities ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated reads for login authentication
DROP POLICY IF EXISTS "Allow public read for authority login" ON authorities;
CREATE POLICY "Allow public read for authority login" ON authorities
  FOR SELECT TO anon, authenticated USING (true);

-- Allow insert/update for initial seeding and management
DROP POLICY IF EXISTS "Allow public write for authority accounts" ON authorities;
CREATE POLICY "Allow public write for authority accounts" ON authorities
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert sample pre-authorized municipal officers
INSERT INTO authorities (email, password, name, department, ward, city, phone)
VALUES 
  ('officer@janniti.gov.in', 'password123', 'Municipal Officer', 'Civic Administration & Public Works', 'Ward 1', 'Bhubaneswar', '+91 8847845435'),
  ('admin@janniti.gov.in', 'admin123', 'Chief Civic Commissioner', 'Municipal Governance', 'Ward 1', 'Bhubaneswar', '+91 8847845435')
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  department = EXCLUDED.department,
  phone = EXCLUDED.phone;
`;

/**
 * Authenticate Authority Officer credentials against Supabase 'authorities' table.
 * Supports primary 'authorities' table, with 'authority_officers' and 'authority_accounts' fallbacks.
 */
export async function authenticateAuthorityFromSupabase(
  email: string,
  passwordInput: string
): Promise<{
  success: boolean;
  message: string;
  user?: User;
  tableFound?: boolean;
  error?: string;
}> {
  const normalizedEmail = email.trim().toLowerCase();
  const candidateTables = ['authorities', 'authority_officers', 'authority_accounts'];
  let tableDetected = false;
  let lastErrMsg = '';

  for (const tableName of candidateTables) {
    try {
      // 1. Try with Supabase JS SDK
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .ilike('email', normalizedEmail)
        .limit(1);

      if (!error) {
        tableDetected = true;
        if (data && data.length > 0) {
          const officerRecord = data[0];
          const storedPassword = officerRecord.password || officerRecord.pass_word;

          if (storedPassword === passwordInput) {
            const officerName = officerRecord.name || 'Municipal Officer';
            const initials =
              officerName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'MO';

            const user: User = {
              id: String(officerRecord.id || `auth_${Date.now()}`),
              email: String(officerRecord.email || normalizedEmail),
              name: officerName,
              role: 'authority',
              avatarInitials: initials,
              avatarUrl: officerRecord.avatar_url || undefined,
              phone: officerRecord.phone || undefined,
              ward: officerRecord.ward || 'Saheed Nagar, Bhubaneswar',
              city: officerRecord.city || 'Bhubaneswar',
              address: officerRecord.address || 'Municipal Corporation Headquarters',
              pincode: officerRecord.pincode || '751001',
              department: officerRecord.department || 'Civic Administration & Public Works',
              profileCompleted: true,
              submissionsCount: 0,
              resolvedCount: 0,
            };

            return {
              success: true,
              message: `Signed in successfully via Supabase '${tableName}' database!`,
              user,
              tableFound: true,
            };
          } else {
            return {
              success: false,
              message: 'Incorrect password for this authority officer account in Supabase database.',
              tableFound: true,
            };
          }
        }
      } else {
        lastErrMsg = error.message;
        console.warn(`[Supabase Authorities Check: ${tableName}]`, error.message);
      }
    } catch (err: unknown) {
      lastErrMsg = err instanceof Error ? err.message : String(err);
    }

    // 2. Direct REST API Fallback
    try {
      const restRes = await fetch(
        `${SUPABASE_REST_URL}/${tableName}?email=ilike.${encodeURIComponent(normalizedEmail)}&limit=1`,
        {
          method: 'GET',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (restRes.ok) {
        tableDetected = true;
        const rows = await restRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          const officerRecord = rows[0];
          const storedPassword = officerRecord.password || officerRecord.pass_word;
          if (storedPassword === passwordInput) {
            const officerName = officerRecord.name || 'Municipal Officer';
            const initials =
              officerName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || 'MO';

            const user: User = {
              id: String(officerRecord.id || `auth_${Date.now()}`),
              email: String(officerRecord.email || normalizedEmail),
              name: officerName,
              role: 'authority',
              avatarInitials: initials,
              avatarUrl: officerRecord.avatar_url || undefined,
              phone: officerRecord.phone || undefined,
              ward: officerRecord.ward || 'Saheed Nagar, Bhubaneswar',
              city: officerRecord.city || 'Bhubaneswar',
              address: officerRecord.address || 'Municipal Corporation Headquarters',
              pincode: officerRecord.pincode || '751001',
              department: officerRecord.department || 'Civic Administration & Public Works',
              profileCompleted: true,
              submissionsCount: 0,
              resolvedCount: 0,
            };

            return {
              success: true,
              message: `Signed in successfully via Supabase REST API ('${tableName}')!`,
              user,
              tableFound: true,
            };
          } else {
            return {
              success: false,
              message: 'Incorrect password for this authority officer account in Supabase database.',
              tableFound: true,
            };
          }
        }
      }
    } catch (err) {
      console.warn(`[Supabase REST fallback error: ${tableName}]`, err);
    }
  }

  return {
    success: false,
    message: tableDetected
      ? 'Authority account not found in Supabase database. Please verify officer email.'
      : 'Supabase authorities table unreachable or not yet created. Checking pre-authorized local registry.',
    tableFound: tableDetected,
    error: lastErrMsg,
  };
}

/**
 * Seed or register an Authority Officer into Supabase 'authorities' table
 */
export async function syncAuthorityOfficerToSupabase(officer: SupabaseAuthorityRecord): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  const payload = {
    email: officer.email.trim().toLowerCase(),
    password: officer.password,
    name: officer.name || 'Municipal Officer',
    department: officer.department || 'Civic Administration & Public Works',
    ward: officer.ward || 'Saheed Nagar, Bhubaneswar',
    city: officer.city || 'Bhubaneswar',
    phone: officer.phone || '+91 8847845435',
    pincode: officer.pincode || '751001',
    address: officer.address || 'Municipal Corporation Headquarters',
    role: 'authority',
    avatar_url: officer.avatar_url || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('authorities')
      .upsert(payload, { onConflict: 'email' })
      .select();

    if (!error) {
      return { success: true, data };
    }

    // Direct REST API fallback
    const restRes = await fetch(`${SUPABASE_REST_URL}/authorities?on_conflict=email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    });

    if (restRes.ok) {
      const json = await restRes.json();
      return { success: true, data: json };
    }

    return { success: false, error: error?.message || 'Failed to sync authority officer to Supabase' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
