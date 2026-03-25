import { NextRequest, NextResponse } from 'next/server';
import { callClaudeWithImage, callClaudeWithMultipleImages } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mediaType, images, apiKey } = body;

    type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // Support both single image (legacy) and multiple images array
    const imageList: Array<{ base64: string; mediaType: MediaType }> =
      images ||
      (imageBase64 ? [{ base64: imageBase64, mediaType: (mediaType || 'image/jpeg') as MediaType }] : []);

    if (imageList.length === 0) {
      return NextResponse.json({ error: '请提供图片数据' }, { status: 400 });
    }

    let extractedText: string;

    if (imageList.length === 1) {
      const prompt = `请识别并提取这张图片中的所有文字内容，特别是职位描述（JD）相关信息。请直接返回识别出的文字内容，保持原有格式结构，不要添加任何解释。`;
      extractedText = await callClaudeWithImage(prompt, imageList[0].base64, imageList[0].mediaType, apiKey);
    } else {
      const prompt = `以下是同一个职位描述的多张截图，请将所有图片的内容合并识别，还原为完整的职位描述文本。直接返回合并后的完整文字内容，保持原有格式结构，去除重复内容，不要添加任何解释。`;
      extractedText = await callClaudeWithMultipleImages(prompt, imageList, apiKey);
    }

    return NextResponse.json({ text: extractedText });
  } catch (error: unknown) {
    console.error('parse-jd-image error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `图片识别失败: ${message}` }, { status: 500 });
  }
}
