import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { profileInclude, toPublicProfileDTO } from '../profile/profile.serializer';
import type { CreateReportInput } from './safety.schemas';

/** Returns the set of user IDs blocked by `userId` OR who have blocked `userId`. */
export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const b of blocks) {
    ids.add(b.blockerId === userId ? b.blockedId : b.blockerId);
  }
  return ids;
}

export async function isBlockedBetween(userA: string, userB: string): Promise<boolean> {
  const found = await prisma.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
  });
  return !!found;
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new AppError(400, 'INVALID_BLOCK', 'You cannot block yourself');
  }
  const target = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
  if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
  return listBlocks(blockerId);
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
  return listBlocks(blockerId);
}

export async function listBlocks(blockerId: string) {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId },
    include: { blocked: { include: profileInclude } },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    blockedAt: r.createdAt.toISOString(),
    user: toPublicProfileDTO(r.blocked),
  }));
}

export async function createReport(reporterId: string, input: CreateReportInput) {
  if (reporterId === input.targetUserId) {
    throw new AppError(400, 'INVALID_REPORT', 'You cannot report yourself');
  }
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId }, select: { id: true } });
  if (!target) throw new AppError(404, 'USER_NOT_FOUND', 'Reported user not found');

  const report = await prisma.report.create({
    data: {
      reporterId,
      targetUserId: input.targetUserId,
      reason: input.reason,
      details: input.details || null,
    },
    include: {
      reporter: { include: profileInclude },
      targetUser: { include: profileInclude },
    },
  });

  return {
    id: report.id,
    reason: report.reason,
    details: report.details,
    status: report.status as 'OPEN' | 'RESOLVED',
    createdAt: report.createdAt.toISOString(),
    reporter: toPublicProfileDTO(report.reporter),
    targetUser: toPublicProfileDTO(report.targetUser),
  };
}

export async function listReports(status?: string) {
  const reports = await prisma.report.findMany({
    where: status ? { status } : undefined,
    include: {
      reporter: { include: profileInclude },
      targetUser: { include: profileInclude },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return reports.map((r) => ({
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status as 'OPEN' | 'RESOLVED',
    createdAt: r.createdAt.toISOString(),
    reporter: toPublicProfileDTO(r.reporter),
    targetUser: toPublicProfileDTO(r.targetUser),
  }));
}

export async function updateReportStatus(reportId: string, status: 'OPEN' | 'RESOLVED') {
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) throw new AppError(404, 'REPORT_NOT_FOUND', 'Report not found');

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { status },
    include: {
      reporter: { include: profileInclude },
      targetUser: { include: profileInclude },
    },
  });
  return {
    id: updated.id,
    reason: updated.reason,
    details: updated.details,
    status: updated.status as 'OPEN' | 'RESOLVED',
    createdAt: updated.createdAt.toISOString(),
    reporter: toPublicProfileDTO(updated.reporter),
    targetUser: toPublicProfileDTO(updated.targetUser),
  };
}
