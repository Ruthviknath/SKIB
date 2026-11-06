import type { Prisma } from '@prisma/client';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { emitToPlanRoom } from '../../services/realtime/socket.service';
import type { CreatePlanInput, UpdatePlanInput } from './plans.schemas';
import { planInclude, toPlanDTO } from './plans.serializer';

export interface ListPlansFilter {
  cityId?: string;
  interestId?: string;
  category?: string;
  hostId?: string;
  memberUserId?: string;
}

async function requireOnboardedUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, onboardedAt: true } });
  if (!user.onboardedAt) {
    throw new AppError(403, 'ONBOARDING_REQUIRED', 'Complete onboarding before joining or hosting plans');
  }
}

export async function listPlans(filter: ListPlansFilter, viewerId?: string) {
  const where: Prisma.PlanWhereInput = { status: 'OPEN' };
  if (filter.cityId) where.cityId = filter.cityId;
  if (filter.interestId) where.interestId = filter.interestId;
  if (filter.category) where.interest = { category: filter.category };
  if (filter.hostId) where.hostId = filter.hostId;
  if (filter.memberUserId) {
    where.members = { some: { userId: filter.memberUserId, status: { in: ['APPROVED', 'PENDING'] } } };
  }

  const plans = await prisma.plan.findMany({
    where,
    include: planInclude,
    orderBy: { startsAt: 'asc' },
  });
  return plans.map((p) => toPlanDTO(p, viewerId));
}

export async function getPlan(planId: string, viewerId?: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, include: planInclude });
  if (!plan) throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  return toPlanDTO(plan, viewerId);
}

export async function createPlan(hostId: string, input: CreatePlanInput) {
  await requireOnboardedUser(hostId);

  const startsAt = new Date(input.startsAt);
  if (startsAt.getTime() <= Date.now()) {
    throw new AppError(400, 'INVALID_START_TIME', 'Plan start time must be in the future');
  }

  const [city, interest] = await Promise.all([
    prisma.city.findFirst({ where: { id: input.cityId, isActive: true } }),
    prisma.interest.findUnique({ where: { id: input.interestId } }),
  ]);
  if (!city) throw new AppError(400, 'INVALID_CITY', 'Selected city is not active');
  if (!interest) throw new AppError(400, 'INVALID_INTEREST', 'Selected interest does not exist');

  const plan = await prisma.plan.create({
    data: {
      hostId,
      cityId: city.id,
      interestId: interest.id,
      title: input.title,
      description: input.description || null,
      venue: input.venue,
      startsAt,
      capacity: input.capacity,
      members: {
        create: [{ userId: hostId, role: 'HOST', status: 'APPROVED' }],
      },
    },
    include: planInclude,
  });

  return toPlanDTO(plan, hostId);
}

export async function updatePlan(hostId: string, planId: string, input: UpdatePlanInput) {
  const existing = await prisma.plan.findUnique({
    where: { id: planId },
    include: { members: { where: { status: 'APPROVED' } } },
  });
  if (!existing) throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  if (existing.hostId !== hostId) throw new AppError(403, 'FORBIDDEN', 'Only the host can edit this plan');
  if (existing.status === 'CANCELLED') throw new AppError(400, 'PLAN_CANCELLED', 'Cancelled plans cannot be edited');

  const data: Prisma.PlanUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description || null;
  if (input.venue !== undefined) data.venue = input.venue;
  if (input.startsAt !== undefined) {
    const startsAt = new Date(input.startsAt);
    if (startsAt.getTime() <= Date.now()) {
      throw new AppError(400, 'INVALID_START_TIME', 'Plan start time must be in the future');
    }
    data.startsAt = startsAt;
  }
  if (input.interestId !== undefined) {
    const interest = await prisma.interest.findUnique({ where: { id: input.interestId } });
    if (!interest) throw new AppError(400, 'INVALID_INTEREST', 'Selected interest does not exist');
    data.interest = { connect: { id: interest.id } };
  }
  if (input.capacity !== undefined) {
    if (input.capacity < existing.members.length) {
      throw new AppError(
        400,
        'CAPACITY_TOO_SMALL',
        `Cannot reduce capacity below current approved attendees (${existing.members.length})`,
      );
    }
    data.capacity = input.capacity;
  }

  const updated = await prisma.plan.update({ where: { id: planId }, data, include: planInclude });
  return toPlanDTO(updated, hostId);
}

export async function cancelPlan(hostId: string, planId: string) {
  const existing = await prisma.plan.findUnique({ where: { id: planId } });
  if (!existing) throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  if (existing.hostId !== hostId) throw new AppError(403, 'FORBIDDEN', 'Only the host can cancel this plan');

  const updated = await prisma.plan.update({
    where: { id: planId },
    data: { status: 'CANCELLED' },
    include: planInclude,
  });
  return toPlanDTO(updated, hostId);
}

/** Submits a PENDING join request for host approval. */
export async function requestJoinPlan(userId: string, planId: string, note?: string) {
  await requireOnboardedUser(userId);

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { members: true },
  });
  if (!plan) throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  if (plan.status !== 'OPEN') throw new AppError(400, 'PLAN_CLOSED', 'This plan is no longer open');

  const existingMember = plan.members.find((m) => m.userId === userId);
  if (existingMember) {
    if (existingMember.status === 'APPROVED') {
      throw new AppError(400, 'ALREADY_JOINED', 'You are already approved for this plan');
    }
    if (existingMember.status === 'PENDING') {
      throw new AppError(400, 'ALREADY_REQUESTED', 'Your join request is already pending host approval');
    }
    if (existingMember.status === 'REJECTED') {
      throw new AppError(403, 'REQUEST_REJECTED', 'Your request for this plan was declined by the host');
    }
  }

  const approvedCount = plan.members.filter((m) => m.status === 'APPROVED').length;
  if (approvedCount >= plan.capacity) {
    throw new AppError(400, 'PLAN_FULL', 'This plan is already at full capacity');
  }

  await prisma.planMember.create({
    data: {
      planId,
      userId,
      role: 'ATTENDEE',
      status: 'PENDING',
      note: note || null,
    },
  });

  return getPlan(planId, userId);
}

/** Attendee cancels their pending request or leaves an approved spot. */
export async function leavePlan(userId: string, planId: string) {
  const member = await prisma.planMember.findUnique({
    where: { planId_userId: { planId, userId } },
  });
  if (!member) throw new AppError(404, 'NOT_A_MEMBER', 'You have not requested or joined this plan');
  if (member.role === 'HOST') {
    throw new AppError(400, 'HOST_CANNOT_LEAVE', 'As the host, cancel the plan instead of leaving');
  }

  await prisma.planMember.delete({ where: { id: member.id } });
  return getPlan(planId, userId);
}

/** Host approves or rejects a pending join request. */
export async function reviewJoinRequest(
  hostId: string,
  planId: string,
  targetUserId: string,
  status: 'APPROVED' | 'REJECTED',
) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { members: true },
  });
  if (!plan) throw new AppError(404, 'PLAN_NOT_FOUND', 'Plan not found');
  if (plan.hostId !== hostId) throw new AppError(403, 'FORBIDDEN', 'Only the host can review join requests');
  if (plan.status !== 'OPEN') throw new AppError(400, 'PLAN_CLOSED', 'This plan is no longer open');

  const target = plan.members.find((m) => m.userId === targetUserId);
  if (!target) throw new AppError(404, 'REQUEST_NOT_FOUND', 'Join request not found');
  if (target.role === 'HOST') throw new AppError(400, 'INVALID_TARGET', 'Cannot modify host membership');

  if (status === 'APPROVED' && target.status !== 'APPROVED') {
    const approvedCount = plan.members.filter((m) => m.status === 'APPROVED').length;
    if (approvedCount >= plan.capacity) {
      throw new AppError(400, 'PLAN_FULL', 'Plan is already at full capacity');
    }
  }

  await prisma.planMember.update({
    where: { id: target.id },
    data: { status },
  });

  emitToPlanRoom(planId, 'plan:member_updated', { planId, userId: targetUserId, status });
  return getPlan(planId, hostId);
}
