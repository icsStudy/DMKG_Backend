import { prisma } from '@spacode/db';
import { Errors } from '@spacode/utils';
import { generateImage } from '../../lib/image-provider.js';

export async function generateCreativeImage(
  businessId: string,
  data: { prompt?: string; contentItemId?: string; platform?: string },
) {
  let prompt = data.prompt?.trim();
  if (data.contentItemId) {
    const item = await prisma.contentItem.findFirst({
      where: { id: data.contentItemId, businessId },
    });
    if (!item) throw Errors.notFound('Content item not found');
    prompt = prompt ?? `${item.hook ?? item.idea ?? ''} ${item.description ?? ''}`.trim();
  }
  if (!prompt) throw Errors.validation('prompt or contentItemId required');

  const mediaUrl = await generateImage(prompt);
  const record = await prisma.aiManualPostImage.create({
    data: {
      businessId,
      contentItemId: data.contentItemId,
      prompt,
      mediaUrl,
      platform: data.platform,
    },
  });

  if (data.contentItemId) {
    await prisma.contentItem.update({
      where: { id: data.contentItemId },
      data: { mediaUrl },
    });
  }

  return { id: record.id, mediaUrl, prompt };
}
