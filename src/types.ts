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
  ward?: string;
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

export interface CivicUpdate {
  id: string;
  ward: string;
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
}

export interface SubmissionPayload {
  title?: string;
  category: string;
  ward: string;
  description: string;
  audioBlobUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  submittedAt: string;
  status: 'pending' | 'reviewing' | 'in_progress' | 'resolved';
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'status_change' | 'announcement' | 'comment';
}
