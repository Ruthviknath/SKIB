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

export interface ProfileUpdate {
  name?: string;
  birthDate?: string;
  gender?: Gender;
  bio?: string;
  cityId?: string;
  interestIds?: string[];
}
