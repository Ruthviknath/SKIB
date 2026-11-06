// Shapes returned by the SKIB API. Kept framework-free so the future mobile app can reuse them.
export type Gender = 'woman' | 'man' | 'nonbinary';
export type OnboardingStep = 'basics' | 'city' | 'interests' | 'photos';

export interface City {
  id: string;
  name: string;
  state?: string;
}

export interface Interest {
  id: string;
  name: string;
  category: string;
}

export interface Photo {
  id: string;
  url: string;
  position: number;
}

export interface OnboardingRules {
  minAge: number;
  minInterests: number;
  maxInterests: number;
  minPhotos: number;
  maxPhotos: number;
  maxBioLength: number;
}

export interface Profile {
  id: string;
  phone: string;
  name: string | null;
  birthDate: string | null;
  age: number | null;
  gender: Gender | null;
  bio: string | null;
  city: City | null;
  interests: Interest[];
  photos: Photo[];
  onboarding: { completed: boolean; missing: OnboardingStep[]; rules: OnboardingRules };
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  age: number | null;
  gender: Gender | null;
  bio: string | null;
  city: City | null;
  interests: Interest[];
  photos: Photo[];
  createdAt: string;
}

export interface ProfileUpdate {
  name?: string;
  birthDate?: string;
  gender?: Gender;
  bio?: string;
  cityId?: string;
  interestIds?: string[];
}

export type PlanRole = 'HOST' | 'ATTENDEE';
export type PlanMemberStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Plan {
  id: string;
  title: string;
  description: string | null;
  venue: string;
  startsAt: string;
  capacity: number;
  spotsFilled: number;
  spotsLeft: number;
  status: 'OPEN' | 'CANCELLED';
  city: City;
  interest: Interest;
  host: PublicProfile;
  attendees: Array<{
    role: PlanRole;
    joinedAt: string;
    user: PublicProfile;
  }>;
  myMembership: {
    role: PlanRole;
    status: PlanMemberStatus;
    note: string | null;
  } | null;
  pendingRequests: Array<{
    id: string;
    note: string | null;
    requestedAt: string;
    user: PublicProfile;
  }>;
  createdAt: string;
}

export interface PlanCreateInput {
  title: string;
  description?: string;
  venue: string;
  cityId: string;
  interestId: string;
  startsAt: string;
  capacity: number;
}

export interface PlanMessage {
  id: string;
  planId: string;
  body: string;
  createdAt: string;
  sender: PublicProfile;
}

// Phase 3 types
export interface Candidate extends PublicProfile {
  sharedInterestCount: number;
  sharedInterests: string[];
}

export interface MatchSummary {
  id: string;
  createdAt: string;
  peer: PublicProfile;
  lastMessage: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  } | null;
}

export interface DirectMessage {
  id: string;
  matchId: string;
  body: string;
  createdAt: string;
  sender: PublicProfile;
}

export interface CommunitySummary {
  id: string;
  name: string;
  description: string;
  city: City;
  interest: Interest;
  memberCount: number;
  postCount: number;
  joined: boolean;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  body: string;
  createdAt: string;
  author: PublicProfile;
}

export interface CommunityDetail extends Omit<CommunitySummary, 'postCount'> {
  members: PublicProfile[];
  posts: CommunityPost[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface StoryItem {
  id: string;
  caption: string;
  photoUrl: string | null;
  createdAt: string;
  author: PublicProfile;
  plan: {
    id: string;
    title: string;
    city: string;
    interest: string;
  };
}

export interface UserRatingItem {
  id: string;
  score: number;
  vouchTag: string | null;
  comment: string | null;
  createdAt: string;
  plan: { id: string; title: string };
  rater: PublicProfile;
}

export interface UserRatingsSummary {
  count: number;
  averageScore: number | null;
  ratings: UserRatingItem[];
}

export interface ReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
  reporter: PublicProfile;
  targetUser: PublicProfile;
}
