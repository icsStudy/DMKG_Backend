import { prisma } from '@spacode/db';
import { decrypt, Errors } from '@spacode/utils';
import { graphPost } from '../../lib/meta-client.js';

export async function listMessages(
  businessId: string,
  opts: { platform?: string; type?: string },
) {
  return prisma.socialMessage.findMany({
    where: {
      businessId,
      ...(opts.platform && { platform: opts.platform }),
      ...(opts.type && { type: opts.type }),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function replyToMessage(businessId: string, messageId: string, reply: string) {
  const msg = await prisma.socialMessage.findFirst({
    where: { id: messageId, businessId },
  });
  if (!msg) throw Errors.notFound('Message not found');
  if (msg.repliedAt) throw Errors.validation('Already replied');

  if (msg.platform === 'meta' && msg.type === 'comment') {
    const conn = await prisma.socialConnection.findUnique({
      where: { businessId_platform: { businessId, platform: 'meta' } },
    });
    if (!conn) throw Errors.validation('Meta not connected');
    const token = decrypt(conn.accessToken);
    await graphPost(`/${msg.externalId}/comments`, token, { message: reply });
  } else {
    throw Errors.validation(`Reply not supported for ${msg.platform}/${msg.type}`);
  }

  return prisma.socialMessage.update({
    where: { id: messageId },
    data: { repliedAt: new Date(), content: `${msg.content}\n\n---\nתגובה: ${reply}` },
  });
}
