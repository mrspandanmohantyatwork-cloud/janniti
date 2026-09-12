import { User, UserRole, CivicUpdate, NotificationItem } from '../types';
import { authenticateAuthorityFromSupabase } from './supabaseClient';

export interface StoredAccount {
  id: string;
  email: string;
  password: string; // Plain/hashed simulation for local storage
  role: UserRole;
  profileCompleted: boolean;
  name?: string;
  avatarUrl?: string;
  phone?: string;
  ward?: string;
  city?: string;
  address?: string;
  pincode?: string;
  department?: string;
  createdAt: string;
}

const STORAGE_KEYS = {
  ACCOUNTS: 'civic_registered_accounts',
  SESSION: 'civic_active_session',
  UPDATES: 'civic_real_updates',
  NOTIFICATIONS: 'civic_real_notifications',
};

// Default pre-authorized authority officer account
const DEFAULT_AUTHORITY_ACCOUNT: StoredAccount = {
  id: 'usr_authority_default',
  email: 'officer@janniti.gov.in',
  password: 'password123',
  role: 'authority',
  profileCompleted: true,
  name: 'Municipal Officer',
  ward: 'Ward 1',
  city: 'Bhubaneswar',
  address: 'Municipal Corporation Headquarters',
  pincode: '751001',
  phone: '+91 98765 43210',
  department: 'Civic Administration & Public Works',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ----------------- ACCOUNTS -----------------
export const getStoredAccounts = (): StoredAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    const parsed: StoredAccount[] = raw ? JSON.parse(raw) : [];
    if (!parsed.some((a) => a.role === 'authority')) {
      parsed.push(DEFAULT_AUTHORITY_ACCOUNT);
      try {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(parsed));
      } catch {
        // ignore
      }
    }
    return parsed;
  } catch {
    return [DEFAULT_AUTHORITY_ACCOUNT];
  }
};

export const registerAccount = (
  email: string,
  password: string,
  role: UserRole
): { success: boolean; message: string; account?: StoredAccount } => {
  if (role === 'authority') {
    return {
      success: false,
      message: 'Authority officer accounts cannot be self-registered. Please contact civic administration.',
    };
  }

  const accounts = getStoredAccounts();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return {
      success: false,
      message: 'An account with this email address already exists. Please sign in.',
    };
  }

  const newAccount: StoredAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    email: normalizedEmail,
    password,
    role,
    profileCompleted: false,
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save account:', err);
  }

  return { success: true, message: 'Account registered successfully!', account: newAccount };
};

export const authenticateUser = (
  email: string,
  password: string,
  role: UserRole
): { success: boolean; message: string; user?: User; needsProfileCompletion?: boolean } => {
  const accounts = getStoredAccounts();
  const normalizedEmail = email.trim().toLowerCase();

  const account = accounts.find((a) => a.email.toLowerCase() === normalizedEmail);

  if (!account) {
    if (role === 'authority') {
      return {
        success: false,
        message: 'Authority account not found. Authority access is restricted to authorized municipal officers.',
      };
    }
    return {
      success: false,
      message: 'Account does not exist with this email address. Please sign up first.',
    };
  }

  if (account.password !== password) {
    return {
      success: false,
      message: 'Incorrect password. Please verify your credentials and try again.',
    };
  }

  // Check role match
  if (account.role !== role) {
    return {
      success: false,
      message: `This account is registered as a ${account.role.toUpperCase()}. Please switch to the ${account.role.toUpperCase()} role tab to sign in.`,
    };
  }

  const userObj = buildUserFromAccount(account);
  saveActiveSession(userObj);

  return {
    success: true,
    message: 'Signed in successfully!',
    user: userObj,
    needsProfileCompletion: !account.profileCompleted,
  };
};

export const authenticateUserAsync = async (
  email: string,
  password: string,
  role: UserRole
): Promise<{ success: boolean; message: string; user?: User; needsProfileCompletion?: boolean; source?: 'supabase' | 'local' }> => {
  const normalizedEmail = email.trim().toLowerCase();

  // If role is authority, query Supabase database 'authorities' table first
  if (role === 'authority') {
    try {
      const supaResult = await authenticateAuthorityFromSupabase(normalizedEmail, password);
      if (supaResult.success && supaResult.user) {
        saveActiveSession(supaResult.user);
        // Cache in local accounts for offline resilience
        const accounts = getStoredAccounts();
        const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === normalizedEmail);
        const storedUser: StoredAccount = {
          id: supaResult.user.id || `auth_${Date.now()}`,
          email: normalizedEmail,
          password: password,
          role: 'authority',
          profileCompleted: true,
          name: supaResult.user.name,
          ward: supaResult.user.ward,
          city: supaResult.user.city,
          address: supaResult.user.address,
          pincode: supaResult.user.pincode,
          phone: supaResult.user.phone,
          department: supaResult.user.department,
          avatarUrl: supaResult.user.avatarUrl,
          createdAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          accounts[existingIdx] = storedUser;
        } else {
          accounts.push(storedUser);
        }
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
        } catch {
          // ignore
        }

        return {
          success: true,
          message: supaResult.message,
          user: supaResult.user,
          needsProfileCompletion: false,
          source: 'supabase',
        };
      } else if (supaResult.tableFound && supaResult.message.includes('Incorrect password')) {
        return {
          success: false,
          message: supaResult.message,
        };
      }
    } catch (err) {
      console.warn('[Supabase Auth Check]', err);
    }

    // Fallback: Check local pre-authorized authority registry (e.g. officer@janniti.gov.in)
    const localRes = authenticateUser(email, password, role);
    if (localRes.success) {
      return {
        ...localRes,
        source: 'local',
        message: 'Signed in via pre-authorized registry. (Run Supabase SQL script to link live database)',
      };
    }

    return {
      success: false,
      message: 'Authority account not found in Supabase database. Please check officer email or run the SQL setup script.',
    };
  }

  // Citizens authenticate using accounts registry
  return authenticateUser(email, password, role);
};

export const updateAccountDetails = (
  userId: string,
  details: {
    name: string;
    phone: string;
    ward: string;
    city: string;
    address: string;
    pincode: string;
    department?: string;
    avatarUrl?: string;
  }
): User | null => {
  const accounts = getStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === userId);

  if (idx === -1) return null;

  accounts[idx] = {
    ...accounts[idx],
    name: details.name.trim(),
    phone: details.phone.trim(),
    ward: details.ward.trim(),
    city: details.city.trim(),
    address: details.address.trim(),
    pincode: details.pincode.trim(),
    department: details.department?.trim(),
    avatarUrl: details.avatarUrl !== undefined ? details.avatarUrl : accounts[idx].avatarUrl,
    profileCompleted: true,
  };

  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to update account:', err);
  }

  const updatedUser = buildUserFromAccount(accounts[idx]);
  saveActiveSession(updatedUser);
  return updatedUser;
};

// ----------------- SESSION -----------------
export const getActiveSession = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveActiveSession = (user: User): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
};

export const clearActiveSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
};

// Helper: build User interface from account
export const buildUserFromAccount = (account: StoredAccount): User => {
  const allUpdates = getStoredCivicUpdates();
  const userSubmissions = allUpdates.filter(
    (u) => u.authorId === account.id || (account.name && u.authorName === account.name)
  );
  const resolved = userSubmissions.filter((u) => u.status === 'resolved');

  const fullName = account.name || account.email.split('@')[0];
  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'CI';

  return {
    id: account.id,
    name: account.name || account.email.split('@')[0],
    email: account.email,
    role: account.role,
    avatarInitials: initials,
    avatarUrl: account.avatarUrl,
    phone: account.phone || '',
    ward: account.ward || 'Ward 1',
    city: account.city || '',
    address: account.address || '',
    pincode: account.pincode || '',
    department: account.department || '',
    profileCompleted: !!account.profileCompleted,
    submissionsCount: userSubmissions.length,
    resolvedCount: resolved.length,
  };
};

// ----------------- REAL CIVIC UPDATES -----------------
export const isDisallowedIssue = (item: { id?: string; description?: string }): boolean => {
  if (!item) return false;
  if (item.id === 'JNT-3290' || item.id === 'JNT-6517') return true;
  const desc = (item.description || '').toLowerCase();
  if (desc.includes('gita')) return true;
  if (desc.includes('madanpur')) return true;
  if (desc.includes('cyclone')) return true;
  if (desc.includes('gramadiha')) return true;
  if (desc.includes('gift')) return true;
  return false;
};

export const getStoredCivicUpdates = (): CivicUpdate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UPDATES);
    const parsed: CivicUpdate[] = raw ? JSON.parse(raw) : [];
    const filtered = parsed.filter((u) => !isDisallowedIssue(u));
    // Ensure "Big pothole on the road which is creating problem for people using road transport" / JNT-9662 is pending
    const normalized = filtered.map((u) => {
      if (
        u.id === 'JNT-9662' ||
        (u.description && u.description.toLowerCase().includes('big pothole on the road'))
      ) {
        return { ...u, status: 'pending' as const };
      }
      return u;
    });
    if (filtered.length !== parsed.length || JSON.stringify(normalized) !== JSON.stringify(filtered)) {
      saveStoredCivicUpdates(normalized);
    }
    return normalized;
  } catch {
    return [];
  }
};

export const saveStoredCivicUpdates = (updates: CivicUpdate[]): void => {
  try {
    const filtered = updates.filter((u) => !isDisallowedIssue(u));
    localStorage.setItem(STORAGE_KEYS.UPDATES, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to save updates:', err);
  }
};

// ----------------- REAL NOTIFICATIONS -----------------
export const getStoredNotifications = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredNotifications = (notifications: NotificationItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (err) {
    console.error('Failed to save notifications:', err);
  }
};
