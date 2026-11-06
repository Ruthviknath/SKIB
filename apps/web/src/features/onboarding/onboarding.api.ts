import { api } from '@/lib/api';
import type { City, Interest, Profile } from '@/types/api';

export const getCities = async () => (await api<{ cities: City[] }>('/catalog/cities')).cities;

export const getInterests = async () => (await api<{ interests: Interest[] }>('/catalog/interests')).interests;

export const completeOnboarding = async () => (await api<{ profile: Profile }>('/onboarding/complete', { method: 'POST' })).profile;
