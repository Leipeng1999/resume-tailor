import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, Header, Footer, PageNumber,
  BorderStyle, TabStopType, TabStopPosition,
} from 'docx';
import { InterviewPrep } from '@/lib/types';

// ── Layout constants ──────────────────────────────────────
const CM2 = 1134;   // 2 cm in twips
const CM25 = 1418;  // 2.5 cm in twips
const CM15 = 851;   // 1.5 cm in twips

// ── Teal brand color ──────────────────────────────────────
const TEAL = '0F6E56';
const TEAL_LIGHT = 'D0EDE7';
const GRAY_DARK = '333333';
const GRAY_MID = '666666';
const GRAY_LIGHT = '888888';
const FONT = 'Arial';

// ── Helper: no-border table cell options ─────────────────
const noBorder = {
  top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

// ── Interview Doc helpers ─────────────────────────────────
function ih1(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 32, color: TEAL, font: FONT })],
    spacing: { before: 480, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: TEAL, space: 4 } },
  });
}

function ih2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 26, color: GRAY_DARK, font: FONT })],
    spacing: { before: 320, after: 100 },
  });
}

function ibody(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: FONT, color: GRAY_DARK })],
    spacing: { before: 80, after: 80, line: 360 },
  });
}

function ibullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: FONT, color: GRAY_DARK })],
    bullet: { level: 0 },
    spacing: { before: 60, after: 60 },
  });
}

function ibold(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: FONT, color: GRAY_DARK })],
    spacing: { before: 120, after: 60 },
  });
}

// STAR story paragraph with left teal border
function istar(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: FONT, color: GRAY_DARK })],
    spacing: { before: 80, after: 80, line: 360 },
    border: { left: { style: BorderStyle.THICK, size: 24, color: TEAL, space: 8 } },
    indent: { left: 200 },
  });
}

// Highlighted tip paragraph (teal background via table cell)
function ibox(label: string, text: string): Table {
  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `${label}  `, bold: true, size: 20, font: FONT, color: TEAL }),
                  new TextRun({ text, size: 20, font: FONT, color: GRAY_DARK }),
                ],
                spacing: { before: 60, after: 60 },
              }),
            ],
            shading: { type: ShadingType.CLEAR, fill: TEAL_LIGHT },
            borders: noBorder,
            margins: { top: 80, bottom: 80, left: 160, right: 160 },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
  });
}

function ispacer(): Paragraph {
  return new Paragraph({ text: '', spacing: { before: 100, after: 100 } });
}

// ── Build Interview Prep Header ───────────────────────────
function buildInterviewHeader(company: string, jobTitle: string): Header {
  return new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: '面试准备手册', size: 18, color: GRAY_LIGHT, font: FONT }),
          new TextRun({ text: '\t', size: 18 }),
          new TextRun({ text: `${company} · ${jobTitle}`, size: 18, color: GRAY_LIGHT, font: FONT }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
      }),
    ],
  });
}

function buildInterviewFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY_LIGHT, font: FONT }),
          new TextRun({ text: ' / ', size: 18, color: GRAY_LIGHT }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GRAY_LIGHT, font: FONT }),
        ],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD', space: 4 } },
      }),
    ],
  });
}

// ── Interview Prep Document ───────────────────────────────
function buildInterviewDoc(prep: InterviewPrep, company: string, jobTitle: string): Document {
  const children: (Paragraph | Table)[] = [];

  // ── Cover page ───────────────────────────────────────────
  children.push(
    new Paragraph({ text: '', spacing: { before: 0, after: 800 } }),
    new Paragraph({
      children: [new TextRun({ text: '面试准备手册', bold: true, size: 56, font: FONT, color: TEAL })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${company} · ${jobTitle}`, size: 30, font: FONT, color: GRAY_MID })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: new Date().toLocaleDateString('zh-CN'), size: 22, font: FONT, color: GRAY_LIGHT })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    }),
  );

  // ── Table of Contents placeholder (new page) ─────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: '目  录', bold: true, size: 32, font: FONT, color: TEAL })],
      spacing: { before: 0, after: 200 },
      pageBreakBefore: true,
    }),
  );
  const tocItems = [
    '一、公司背景', '二、岗位匹配分析', '三、自我介绍（2分钟）',
    '四、核心面试问答', '五、STAR 故事库', '六、AI 能力与工具使用',
    '七、主动提问清单', '八、面试核心策略', '九、薪资谈判建议', '十、注意事项与常见陷阱',
  ];
  for (const item of tocItems) {
    children.push(new Paragraph({ children: [new TextRun({ text: item, size: 22, font: FONT, color: GRAY_DARK })], spacing: { before: 60, after: 60 } }));
  }

  // ── Content starts on new page ───────────────────────────

  // 1. Company Background
  children.push(new Paragraph({ text: '', pageBreakBefore: true }));
  children.push(ih1('一、公司背景'));
  if (prep.companyBackground?.overview)         { children.push(ih2('公司简介'),            ibody(prep.companyBackground.overview)); }
  if (prep.companyBackground?.industryPosition) { children.push(ih2('行业定位与近期动态'), ibody(prep.companyBackground.industryPosition)); }
  if (prep.companyBackground?.chinaMarket)      { children.push(ih2('中国市场'),            ibody(prep.companyBackground.chinaMarket)); }
  if (prep.companyBackground?.whyHiring)        { children.push(ih2('为什么招聘此岗位（分析）'), ibody(prep.companyBackground.whyHiring)); }

  // 2. Job Match
  children.push(ispacer(), ih1('二、岗位匹配分析'));
  if ((prep.jobMatch?.strengthsMatch || []).length > 0) {
    children.push(ih2('个人优势匹配'));
    const rows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '我的优势', bold: true, font: FONT, size: 22 })] })], shading: { type: ShadingType.CLEAR, fill: TEAL_LIGHT }, width: { size: 50, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '对应JD要求', bold: true, font: FONT, size: 22 })] })], shading: { type: ShadingType.CLEAR, fill: TEAL_LIGHT }, width: { size: 50, type: WidthType.PERCENTAGE } }),
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
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }) as unknown as Paragraph);
  }
  if ((prep.jobMatch?.weaknesses || []).length > 0) {
    children.push(ih2('潜在劣势与应对策略'));
    for (const w of prep.jobMatch.weaknesses) {
      children.push(
        ibold(`劣势：${w.weakness || ''}`),
        ibox('应对策略：', w.strategy || ''),
        ibody(`参考话术：${w.talkingPoint || ''}`),
        ispacer(),
      );
    }
  }

  // 3. Self Introduction
  children.push(ispacer(), ih1('三、自我介绍（2分钟）'));
  if (prep.selfIntroduction?.chinese) { children.push(ih2('中文版'), ibody(prep.selfIntroduction.chinese)); }
  if (prep.selfIntroduction?.english) { children.push(ih2('English Version'), ibody(prep.selfIntroduction.english)); }

  // 4. Core Q&A
  children.push(ispacer(), ih1('四、核心面试问答'));
  const catLabel: Record<string, string> = { general: '通用问题', technical: '专业问题', behavioral: '行为面试（STAR）' };
  for (const cat of ['general', 'technical', 'behavioral']) {
    const qs = (prep.coreQA || []).filter((q) => q.category === cat);
    if (!qs.length) continue;
    children.push(ih2(catLabel[cat]));
    for (const q of qs) {
      children.push(ibold(`Q: ${q.question}`), ibody(`A: ${q.answer}`), ispacer());
    }
  }

  // 5. STAR Stories
  children.push(ispacer(), ih1('五、STAR 故事库'));
  for (const s of (prep.starStories || [])) {
    children.push(
      ih2(s.title || ''),
      istar(s.story || ''),
      ibody(`适用场景：${(s.applicableScenarios || []).join('、')}`),
      ispacer(),
    );
  }

  // 6. AI Capabilities
  if (prep.aiCapabilities) {
    children.push(ispacer(), ih1('六、AI 能力与工具使用'));
    children.push(ibody(prep.aiCapabilities.description || ''));
    children.push(ih2('参考话术'), ibody(prep.aiCapabilities.talkingPoint || ''));
  }

  // 7. Questions to Ask
  children.push(ispacer(), ih1('七、主动提问清单'));
  for (const q of (prep.questionsToAsk || [])) { children.push(ibullet(q)); }

  // 8. Strategy
  children.push(ispacer(), ih1('八、面试核心策略'));
  if (prep.strategy?.positioning)                 { children.push(ih2('差异化定位'), ibody(prep.strategy.positioning)); }
  if ((prep.strategy?.principles || []).length > 0) {
    children.push(ih2('核心原则'));
    for (const p of prep.strategy.principles) { children.push(ibullet(p)); }
  }
  if (prep.strategy?.closingScript) { children.push(ih2('结尾推进话术'), ibox('话术：', prep.strategy.closingScript)); }

  // 9. Salary Negotiation
  children.push(ispacer(), ih1('九、薪资谈判建议'));
  if (prep.salaryNegotiation?.marketRange)              { children.push(ih2('市场薪资参考'), ibody(prep.salaryNegotiation.marketRange)); }
  if ((prep.salaryNegotiation?.strategies || []).length > 0) {
    children.push(ih2('谈判策略'));
    for (const s of prep.salaryNegotiation.strategies) { children.push(ibullet(s)); }
  }

  // 10. Warnings
  children.push(ispacer(), ih1('十、注意事项与常见陷阱'));
  if ((prep.warningsAndTraps?.traps || []).length > 0) {
    children.push(ih2('常见陷阱问题'));
    for (const t of prep.warningsAndTraps.traps) { children.push(ibullet(t)); }
  }
  if ((prep.warningsAndTraps?.avoidPhrases || []).length > 0) {
    children.push(ih2('避免说的话'));
    for (const p of prep.warningsAndTraps.avoidPhrases) { children.push(ibullet(p)); }
  }

  return new Document({
    sections: [{
      headers: { default: buildInterviewHeader(company, jobTitle) },
      footers: { default: buildInterviewFooter() },
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: CM2, right: CM25, bottom: CM2, left: CM25 },
        },
      },
      children: children as Paragraph[],
    }],
  });
}

// ── Resume helpers ────────────────────────────────────────
const R_FONT = 'Arial';
const TIGHT = { before: 40, after: 40, line: 240 };

function rName(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 32, font: R_FONT, color: GRAY_DARK })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 80 },
  });
}

function rContact(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 18, font: R_FONT, color: GRAY_MID })],
    alignment: AlignmentType.CENTER,
    spacing: TIGHT,
  });
}

function rDivider(): Paragraph {
  return new Paragraph({
    text: '',
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GRAY_DARK, space: 2 } },
    spacing: { before: 80, after: 80 },
  });
}

function rSection(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: R_FONT, color: GRAY_DARK })],
    spacing: { before: 140, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 2 } },
  });
}

function rBody(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: R_FONT, color: GRAY_DARK })],
    spacing: TIGHT,
  });
}

function rBullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, font: R_FONT, color: GRAY_DARK })],
    bullet: { level: 0 },
    spacing: { before: 30, after: 30 },
  });
}

// ── Resume Document ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildResumeDoc(content: string, _company: string, _jobTitle: string): Document {
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  // Detect if the first line is a name (short, non-empty, not a section header)
  let firstNonEmpty = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { firstNonEmpty = i; break; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      // Skip multiple blank lines; add one small spacer only if previous wasn't blank
      if (i > 0 && lines[i - 1]?.trim()) {
        children.push(new Paragraph({ text: '', spacing: { before: 40, after: 0 } }));
      }
      continue;
    }

    // First non-empty line treated as name if it looks like one
    if (i === firstNonEmpty && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('•') && trimmed.length < 40) {
      children.push(rName(trimmed));
      continue;
    }

    // Heading 1: starts with # or ALL CAPS section header
    if (trimmed.startsWith('# ')) {
      children.push(rSection(trimmed.slice(2)));
      continue;
    }
    if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(3), bold: true, size: 20, font: R_FONT, color: GRAY_DARK })],
        spacing: { before: 80, after: 30 },
      }));
      continue;
    }
    // Detect section-like all-caps lines (e.g. "WORK EXPERIENCE", "EDUCATION")
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /^[A-Z\s&]+$/.test(trimmed)) {
      children.push(rSection(trimmed));
      continue;
    }
    // Contact info line (contains @ or | separating items)
    if ((trimmed.includes('@') || trimmed.includes('|')) && i < firstNonEmpty + 3) {
      children.push(rContact(trimmed));
      continue;
    }
    // Bullet points
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(rBullet(trimmed.slice(2)));
      continue;
    }
    children.push(rBody(trimmed));
  }

  // Add top divider after contact info (after the first section header)
  // Insert divider after first 2-3 lines (name + contact)
  const insertAt = Math.min(3, children.length);
  children.splice(insertAt, 0, rDivider());

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: CM15, right: CM15, bottom: CM15, left: CM15 },
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
