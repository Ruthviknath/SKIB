import type { Prisma } from '@prisma/client';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';

export const planInclude = {
  city: true,
  interest: true,
  host: { include: profileInclude },
  members: {
    include: { user: { include: profileInclude } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PlanInclude;

export type PlanWithRelations = Prisma.PlanGetPayload<{ include: typeof planInclude }>;

export function toPlanDTO(plan: PlanWithRelations, viewerId?: string) {
  const approvedMembers = plan.members.filter((m) => m.status === 'APPROVED');
  const myMembership = viewerId ? plan.members.find((m) => m.userId === viewerId) ?? null : null;
  const isHost = viewerId === plan.hostId;

  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    venue: plan.venue,
    startsAt: plan.startsAt.toISOString(),
    capacity: plan.capacity,
    spotsFilled: approvedMembers.length,
    spotsLeft: Math.max(0, plan.capacity - approvedMembers.length),
    status: plan.status as 'OPEN' | 'CANCELLED',
    city: { id: plan.city.id, name: plan.city.name },
    interest: { id: plan.interest.id, name: plan.interest.name, category: plan.interest.category },
    host: toPublicProfileDTO(plan.host),
    attendees: approvedMembers.map((m) => ({
      role: m.role as 'HOST' | 'ATTENDEE',
      joinedAt: m.createdAt.toISOString(),
      user: toPublicProfileDTO(m.user),
    })),
    myMembership: myMembership
      ? {
          role: myMembership.role as 'HOST' | 'ATTENDEE',
          status: myMembership.status as 'PENDING' | 'APPROVED' | 'REJECTED',
          note: myMembership.note,
        }
      : null,
    // Pending requests are only exposed to the plan host
    pendingRequests: isHost
      ? plan.members
          .filter((m) => m.status === 'PENDING')
          .map((m) => ({
            id: m.id,
            note: m.note,
            requestedAt: m.createdAt.toISOString(),
            user: toPublicProfileDTO(m.user),
          }))
      : [],
    createdAt: plan.createdAt.toISOString(),
  };
}

export type PlanDTO = ReturnType<typeof toPlanDTO>;
