import { api } from '@/lib/api';
import type { Plan, PlanCreateInput, PlanMessage } from '@/types/api';

export interface PlansQuery {
  cityId?: string;
  category?: string;
  mine?: boolean;
}

export async function listPlans(query: PlansQuery = {}) {
  const params = new URLSearchParams();
  if (query.cityId) params.set('cityId', query.cityId);
  if (query.category) params.set('category', query.category);
  if (query.mine) params.set('mine', 'true');
  const qs = params.toString();
  return (await api<{ plans: Plan[] }>(`/plans${qs ? `?${qs}` : ''}`)).plans;
}

export const getPlan = async (planId: string) => (await api<{ plan: Plan }>(`/plans/${planId}`)).plan;

export const createPlan = async (input: PlanCreateInput) =>
  (await api<{ plan: Plan }>('/plans', { method: 'POST', body: input })).plan;

export const cancelPlan = async (planId: string) =>
  (await api<{ plan: Plan }>(`/plans/${planId}/cancel`, { method: 'POST' })).plan;

export const requestJoinPlan = async (planId: string, note?: string) =>
  (await api<{ plan: Plan }>(`/plans/${planId}/join`, { method: 'POST', body: { note } })).plan;

export const leavePlan = async (planId: string) =>
  (await api<{ plan: Plan }>(`/plans/${planId}/join`, { method: 'DELETE' })).plan;

export const reviewJoinRequest = async (
  planId: string,
  userId: string,
  status: 'APPROVED' | 'REJECTED',
) =>
  (
    await api<{ plan: Plan }>(`/plans/${planId}/requests/${userId}`, {
      method: 'PATCH',
      body: { status },
    })
  ).plan;

export const listPlanMessages = async (planId: string) =>
  (await api<{ messages: PlanMessage[] }>(`/plans/${planId}/messages`)).messages;

export const sendPlanMessage = async (planId: string, body: string) =>
  (await api<{ message: PlanMessage }>(`/plans/${planId}/messages`, { method: 'POST', body: { body } })).message;
