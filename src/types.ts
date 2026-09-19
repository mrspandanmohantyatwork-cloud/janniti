export type Language = 'en' | 'hi' | 'or';

export type DeviceMode = 'pc' | 'mobile';

export type UserRole = 'citizen' | 'authority';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatarInitials: string;
  avatarUrl?: string;
  phone?: string;
  ward?: string; // Exact Locality / Sector
  locality?: string;
  city?: string;
  address?: string;
  pincode?: string;
  department?: string;
  profileCompleted?: boolean;
  submissionsCount: number;
  resolvedCount: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  designation?: string;
  quote: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  initials: string;
  gradient: string;
}

export interface CivicFeedback {
  rating: number; // 1 to 5
  satisfaction: 'satisfied' | 'neutral' | 'unsatisfied';
  comment?: string;
  submittedAt: string;
  userName?: string;
}

export interface CivicUpdate {
  id: string;
  ward: string; // Exact location on map (e.g., "Market Building, Unit-2, Bhubaneswar")
  location?: string;
  lat?: number;
  lng?: number;
  category: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'reviewing' | 'in_progress' | 'resolved';
  likes?: number;
  authorName?: string;
  authorId?: string;
  imageUrl?: string;
  audioUrl?: string;
  filePath?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  isEmergency?: boolean;
  slaDeadline?: string; // e.g., "24-48 working hours"
  feedback?: CivicFeedback;
}

export interface SubmissionPayload {
  title?: string;
  category: string;
  ward: string; // Exact location on map
  location?: string;
  lat?: number;
  lng?: number;
  description: string;
  audioBlobUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  submittedAt: string;
  status: 'pending' | 'reviewing' | 'in_progress' | 'resolved';
  isEmergency?: boolean;
  slaDeadline?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'status_change' | 'announcement' | 'comment';
}

export interface LoginAuditRecord {
  id: string;
  timestamp: string; // ISO 8601 string
  formattedTime: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  department?: string;
  ward?: string;
  status: 'SUCCESS' | 'FAILED' | 'LOGOUT' | 'CHECKPOINT';
  authMethod: string;
  ipAddress?: string;
  device?: string;
  auditSignature: string;
  details?: string;
}
