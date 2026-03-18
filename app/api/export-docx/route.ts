import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType,
  AlignmentType, ShadingType,
} from 'docx';
import { InterviewPrep } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────
const MARGIN = 1440; // 1 inch in twips
const BODY_SIZE = 24; // 12pt = 24 half-points
const FONT = 'Arial';

function h1(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 200 } });
}

function h2(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 320, after: 160 } });
}

function body(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, font: FONT })],
    spacing: { before: 80, after: 80 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: BODY_SIZE, font: FONT })],
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
  });
}

function bold(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: BODY_SIZE, font: FONT })],
    spacing: { before: 120, after: 60 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { before: 100, after: 100 } });
}

// ── Interview Prep Document ───────────────────────────────
function buildInterviewDoc(prep: InterviewPrep, company: string, jobTitle: string): Document {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `面试准备手册`, bold: true, size: 56, font: FONT, color: '1E3A5F' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${company} · ${jobTitle}`, size: 28, font: FONT, color: '555555' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 600 },
    }),
  );

  // 1. Company Background
  children.push(h1('一、公司背景'));
  if (prep.companyBackground?.overview) { children.push(h2('公司简介'), body(prep.companyBackground.overview)); }
  if (prep.companyBackground?.industryPosition) { children.push(h2('行业定位与近期动态'), body(prep.companyBackground.industryPosition)); }
  if (prep.companyBackground?.chinaMarket) { children.push(h2('中国市场'), body(prep.companyBackground.chinaMarket)); }
  if (prep.companyBackground?.whyHiring) { children.push(h2('为什么招聘此岗位（分析）'), body(prep.companyBackground.whyHiring)); }

  // 2. Job Match
  children.push(spacer(), h1('二、岗位匹配分析'));
  if ((prep.jobMatch?.strengthsMatch || []).length > 0) {
    children.push(h2('个人优势匹配'));
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '我的优势', bold: true, font: FONT, size: 22 })] })], shading: { type: ShadingType.CLEAR, fill: 'D0E8F0' }, width: { size: 50, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '对应JD要求', bold: true, font: FONT, size: 22 })] })], shading: { type: ShadingType.CLEAR, fill: 'D0E8F0' }, width: { size: 50, type: WidthType.PERCENTAGE } }),
        ],
      }),
      ...(prep.jobMatch.strengthsMatch).map((sm) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sm.strength || '', font: FONT, size: 22 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sm.jobRequirement || '', font: FONT, size: 22 })] })], width: { size: 50, type: WidthType.PERCENTAGE } }),
          ],
        })
      ),
    ];
    children.push(
      new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }) as unknown as Paragraph,
    );
  }
  if ((prep.jobMatch?.weaknesses || []).length > 0) {
    children.push(h2('潜在劣势与应对策略'));
    for (const w of prep.jobMatch.weaknesses) {
      children.push(
        bold(`劣势：${w.weakness || ''}`),
        body(`应对策略：${w.strategy || ''}`),
        body(`参考话术：${w.talkingPoint || ''}`),
        spacer(),
      );
    }
  }

  // 3. Self Introduction
  children.push(spacer(), h1('三、自我介绍'));
  if (prep.selfIntroduction?.chinese) {
    children.push(h2('中文版（2-3分钟）'), body(prep.selfIntroduction.chinese));
  }
  if (prep.selfIntroduction?.english) {
    children.push(h2('English Version'), body(prep.selfIntroduction.english));
  }

  // 4. Core Q&A
  children.push(spacer(), h1('四、核心面试问答'));
  const catLabel: Record<string, string> = { general: '通用问题', technical: '专业问题', behavioral: '行为面试（STAR）' };
  for (const cat of ['general', 'technical', 'behavioral']) {
    const qs = (prep.coreQA || []).filter((q) => q.category === cat);
    if (!qs.length) continue;
    children.push(h2(catLabel[cat]));
    for (const q of qs) {
      children.push(
        bold(`Q: ${q.question}`),
        body(`A: ${q.answer}`),
        spacer(),
      );
    }
  }

  // 5. STAR Stories
  children.push(spacer(), h1('五、STAR 故事库'));
  for (const s of (prep.starStories || [])) {
    children.push(
      h2(s.title || ''),
      body(s.story || ''),
      body(`适用场景：${(s.applicableScenarios || []).join('、')}`),
      spacer(),
    );
  }

  // 6. AI Capabilities
  if (prep.aiCapabilities) {
    children.push(spacer(), h1('六、AI 能力与工具使用'));
    children.push(body(prep.aiCapabilities.description || ''));
    children.push(h2('参考话术'), body(prep.aiCapabilities.talkingPoint || ''));
  }

  // 7. Questions to Ask
  children.push(spacer(), h1('七、主动提问清单'));
  for (const q of (prep.questionsToAsk || [])) {
    children.push(bullet(q));
  }

  // 8. Strategy
  children.push(spacer(), h1('八、面试核心策略'));
  if (prep.strategy?.positioning) {
    children.push(h2('差异化定位'), body(prep.strategy.positioning));
  }
  if ((prep.strategy?.principles || []).length > 0) {
    children.push(h2('核心原则'));
    for (const p of prep.strategy.principles) { children.push(bullet(p)); }
  }
  if (prep.strategy?.closingScript) {
    children.push(h2('结尾推进话术'), body(prep.strategy.closingScript));
  }

  // 9. Salary Negotiation
  children.push(spacer(), h1('九、薪资谈判建议'));
  if (prep.salaryNegotiation?.marketRange) {
    children.push(h2('市场薪资参考'), body(prep.salaryNegotiation.marketRange));
  }
  if ((prep.salaryNegotiation?.strategies || []).length > 0) {
    children.push(h2('谈判策略'));
    for (const s of prep.salaryNegotiation.strategies) { children.push(bullet(s)); }
  }

  // 10. Warnings
  children.push(spacer(), h1('十、注意事项与常见陷阱'));
  if ((prep.warningsAndTraps?.traps || []).length > 0) {
    children.push(h2('常见陷阱问题'));
    for (const t of prep.warningsAndTraps.traps) { children.push(bullet(t)); }
  }
  if ((prep.warningsAndTraps?.avoidPhrases || []).length > 0) {
    children.push(h2('避免说的话'));
    for (const p of prep.warningsAndTraps.avoidPhrases) { children.push(bullet(p)); }
  }

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children,
    }],
  });
}

// ── Resume Document ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildResumeDoc(content: string, _company: string, _jobTitle: string): Document {
  const lines = content.split('\n');
  const children: Paragraph[] = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return spacer();
    if (trimmed.startsWith('# ')) return h1(trimmed.slice(2));
    if (trimmed.startsWith('## ')) return h2(trimmed.slice(3));
    return body(line);
  });

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children,
    }],
  });
}

// ── Route Handler ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, company = '', jobTitle = '' } = body;

    let doc: Document;
    let filename: string;

    if (type === 'interview') {
      const prep = body.prep as InterviewPrep;
      if (!prep) return NextResponse.json({ error: '缺少面试准备数据' }, { status: 400 });
      doc = buildInterviewDoc(prep, company, jobTitle);
      filename = `面试准备手册_${company}_${jobTitle}.docx`;
    } else if (type === 'resume') {
      const content = body.content as string;
      if (!content) return NextResponse.json({ error: '缺少简历内容' }, { status: 400 });
      doc = buildResumeDoc(content, company, jobTitle);
      filename = `简历_${company}_${jobTitle}.docx`;
    } else {
      return NextResponse.json({ error: '未知导出类型' }, { status: 400 });
    }

    const buffer = await Packer.toBuffer(doc);
    const uint8 = new Uint8Array(buffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': uint8.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('export-docx error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `导出失败: ${message}` }, { status: 500 });
  }
}
