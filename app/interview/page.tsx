'use client';

import { useState, useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import CopyButton from '@/components/CopyButton';
import RefineInput from '@/components/RefineInput';
import { showToast } from '@/components/Toast';
import { InterviewPrep, ParsedJD, InterviewRound } from '@/lib/types';
import { getApiKey, getParsedJDs, deleteParsedJD } from '@/lib/storage';
import {
  BookOpen, Upload, Building2, User, MessageCircle, HelpCircle,
  AlertCircle, Download, X, FileText, ChevronDown, RotateCcw,
  Lightbulb, Target, Star, Brain, TrendingUp, ShieldAlert, Check, Trash2,
} from 'lucide-react';
import type { SectionKey } from '@/app/api/generate-interview-prep/route';

// ── Types ─────────────────────────────────────────────────
type PartialPrep = Partial<InterviewPrep>;

// ── Section config (10 sections) ──────────────────────────
const SECTIONS: { key: SectionKey; label: string; shortLabel: string; desc: string }[] = [
  { key: 'companyBackground', label: '公司背景',        shortLabel: '公司背景', desc: '正在分析公司背景...' },
  { key: 'jobMatch',          label: '岗位匹配分析',    shortLabel: '岗位匹配', desc: '正在分析岗位匹配...' },
  { key: 'selfIntroduction',  label: '自我介绍',        shortLabel: '自我介绍', desc: '正在生成自我介绍...' },
  { key: 'coreQA',            label: '核心面试问答',    shortLabel: '面试问答', desc: '正在生成面试问答...' },
  { key: 'starStories',       label: 'STAR 故事库',     shortLabel: 'STAR故事', desc: '正在生成 STAR 故事...' },
  { key: 'aiCapabilities',    label: 'AI 能力',         shortLabel: 'AI能力',   desc: '正在生成 AI 能力板块...' },
  { key: 'questionsToAsk',    label: '主动提问清单',    shortLabel: '提问清单', desc: '正在生成提问清单...' },
  { key: 'strategy',          label: '面试核心策略',    shortLabel: '面试策略', desc: '正在生成面试策略...' },
  { key: 'salaryNegotiation', label: '薪资谈判建议',    shortLabel: '薪资谈判', desc: '正在生成薪资建议...' },
  { key: 'warningsAndTraps',  label: '注意事项与常见陷阱', shortLabel: '注意事项', desc: '正在生成注意事项...' },
];

const roundOptions: { value: InterviewRound; label: string }[] = [
  { value: 'hr',        label: 'HR 面' },
  { value: 'technical', label: '技术面' },
  { value: 'final',     label: '终面' },
];

type PrepFile = { id: string; name: string; size: number; text: string };

// ── Progress Bar ──────────────────────────────────────────
function ProgressBar({
  generatingSectionKey, failedSections, prep,
}: {
  generatingSectionKey: SectionKey | null;
  failedSections: SectionKey[];
  prep: PartialPrep;
}) {
  const currentIdx = generatingSectionKey
    ? SECTIONS.findIndex((s) => s.key === generatingSectionKey)
    : -1;
  const doneCount = SECTIONS.filter((s) => s.key in prep).length;

  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-teal-700">
          {generatingSectionKey
            ? `第 ${currentIdx + 1}/10 板块：${SECTIONS[currentIdx]?.desc}`
            : failedSections.length > 0
            ? `已完成，${failedSections.length} 个板块失败`
            : '全部生成完成 ✓'}
        </span>
        <span className="text-xs text-teal-500">已完成 {doneCount} / 10 板块</span>
      </div>
      <div className="flex gap-1">
        {SECTIONS.map((s) => {
          const isDone   = s.key in prep;
          const isActive = s.key === generatingSectionKey;
          const isFailed = failedSections.includes(s.key);
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                isDone   ? 'bg-teal-600' :
                isActive ? 'bg-teal-400 animate-pulse' :
                isFailed ? 'bg-red-400' :
                'bg-slate-200'
              }`} />
              <span className={`text-[10px] truncate w-full text-center hidden lg:block ${
                isDone   ? 'text-teal-700 font-medium' :
                isActive ? 'text-teal-500' :
                isFailed ? 'text-red-500' :
                'text-slate-400'
              }`}>{s.shortLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Accordion Section ─────────────────────────────────────
function Section({
  icon, title, badge, copyText, defaultOpen = false,
  loading = false, failed = false, onRetry, children,
}: {
  icon: React.ReactNode; title: string; badge?: string; copyText?: string;
  defaultOpen?: boolean; loading?: boolean; failed?: boolean; onRetry?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border overflow-hidden bg-white ${failed ? 'border-red-200' : 'border-slate-200'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-left">
          <span className={failed ? 'text-red-400' : 'text-teal-600'}>{icon}</span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {badge && <Badge className="text-xs bg-teal-100 text-teal-700">{badge}</Badge>}
          {loading && (
            <span className="flex items-center gap-1 text-xs text-teal-500">
              <span className="h-3 w-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              生成中...
            </span>
          )}
          {failed && <span className="text-xs text-red-500 font-medium">生成失败</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {failed && onRetry && (
            <span onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                重新生成
              </button>
            </span>
          )}
          {copyText && !loading && !failed && (
            <span onClick={(e) => e.stopPropagation()}>
              <CopyButton text={copyText} variant="ghost" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 text-sm text-slate-700">
          {loading ? (
            <div className="py-6 text-center text-sm text-slate-400">正在生成，请稍候...</div>
          ) : failed ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-red-400">该板块生成失败</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 mx-auto rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  点击重新生成
                </button>
              )}
            </div>
          ) : children}
        </div>
      )}
    </div>
  );
}

function NarrativeBlock({ text, label }: { text: string; label?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 leading-relaxed">
      {label && <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>}
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ── Download helper ───────────────────────────────────────
async function downloadDocx(
  prep: PartialPrep, company: string, jobTitle: string,
  setExporting: (v: boolean) => void,
) {
  setExporting(true);
  try {
    const res = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'interview', prep, company, jobTitle }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `面试准备手册_${company}_${jobTitle}.docx`; a.click();
    URL.revokeObjectURL(url);
    showToast('Word 文件已导出！', 'success');
  } catch (e: unknown) {
    showToast(e instanceof Error ? e.message : '导出失败', 'error');
  } finally {
    setExporting(false);
  }
}

// ── Page ──────────────────────────────────────────────────
export default function InterviewPage() {
  const [jdText,           setJdText]           = useState('');
  const [selectedJDIndex,  setSelectedJDIndex]  = useState<number>(-1);
  const [companyName,      setCompanyName]       = useState('');
  const [interviewRound,   setInterviewRound]   = useState<InterviewRound>('hr');
  const [interviewerTitle, setInterviewerTitle] = useState('');
  const [prepFiles,        setPrepFiles]         = useState<PrepFile[]>([]);
  const [extraText,        setExtraText]         = useState('');

  // generation state
  const [generatingSectionKey, setGeneratingSectionKey] = useState<SectionKey | null>(null);
  const [isGeneratingAll,      setIsGeneratingAll]      = useState(false);
  const [failedSections,       setFailedSections]       = useState<SectionKey[]>([]);
  const [prep,                 setPrep]                 = useState<PartialPrep>({});
  const [error,                setError]                = useState('');
  const [exporting,            setExporting]            = useState(false);
  const [prepDragOver,         setPrepDragOver]         = useState(false);

  const prepFileId = useId();
  const [apiKey,   setApiKey]   = useState('');
  const [savedJDs, setSavedJDs] = useState<ParsedJD[]>([]);

  useEffect(() => {
    setApiKey(getApiKey());
    setSavedJDs(getParsedJDs());
  }, []);

  // ── JD delete ────────────────────────────────────────────
  const handleDeleteJD = (index: number) => {
    const jd = savedJDs[index];
    if (!confirm(`确认删除 ${jd.companyName ? jd.companyName + ' - ' : ''}${jd.jobTitle} 的记录？`)) return;
    deleteParsedJD(index);
    setSavedJDs(getParsedJDs());
    if (selectedJDIndex === index) setSelectedJDIndex(-1);
    else if (selectedJDIndex > index) setSelectedJDIndex(selectedJDIndex - 1);
    showToast('JD 记录已删除', 'success');
  };

  // ── File parsing ─────────────────────────────────────────
  const parseFiles = async (files: File[]) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch('/api/parse-resume', { method: 'POST', body: fd });
        const d   = await res.json();
        if (res.ok) setPrepFiles((p) => [...p, { id: `${Date.now()}-${file.name}`, name: file.name, size: file.size, text: d.text }]);
      } catch {}
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    await parseFiles(files);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setPrepDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(pdf|docx?|txt)$/i.test(f.name));
    if (files.length) {
      showToast(`正在解析 ${files.length} 个文件...`, 'info');
      await parseFiles(files);
      showToast('文件解析完成', 'success');
    }
  };

  const removeFile = (id: string) => setPrepFiles((p) => p.filter((f) => f.id !== id));

  const combinedPrepText = [
    ...prepFiles.map((f) => `[${f.name}]\n${f.text}`),
    ...(extraText.trim() ? [extraText] : []),
  ].join('\n\n');

  // ── JD helpers ───────────────────────────────────────────
  const getActiveParsedJD = (): ParsedJD | null => {
    if (selectedJDIndex >= 0 && savedJDs[selectedJDIndex]) return savedJDs[selectedJDIndex];
    if (jdText.trim()) return { jobTitle: companyName || '目标岗位', companyName: companyName || '', coreSkills: [], educationExperience: '', industryKeywords: [], niceToHave: [], rawText: jdText };
    return null;
  };

  const activeJD       = getActiveParsedJD();
  const displayCompany = companyName || activeJD?.companyName || '目标公司';
  const displayJob     = activeJD?.jobTitle || '目标岗位';

  // ── Call one section ─────────────────────────────────────
  const callSection = async (
    sectionKey: SectionKey,
    parsedJD: ParsedJD,
    completedSectionTitles: string[],
  ): Promise<Partial<InterviewPrep>> => {
    const res = await fetch('/api/generate-interview-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parsedJD, prepFiles: combinedPrepText, companyName,
        interviewRound, interviewerTitle, apiKey,
        section: sectionKey,
        completedSectionTitles,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `${sectionKey} 生成失败`);
    return data;
  };

  // ── Generate all 10 sections ─────────────────────────────
  const handleGenerate = async () => {
    const parsedJD = getActiveParsedJD();
    if (!parsedJD) { showToast('请先选择或输入 JD 信息', 'info'); setError('请先选择或输入 JD 信息'); return; }
    if (!apiKey)   { showToast('请先配置 Anthropic API Key', 'error'); setError('未配置 API Key'); return; }

    setError('');
    setPrep({});
    setFailedSections([]);
    setIsGeneratingAll(true);

    const failed: SectionKey[]      = [];
    const completedTitles: string[] = [];

    for (const sec of SECTIONS) {
      setGeneratingSectionKey(sec.key);
      try {
        const data = await callSection(sec.key, parsedJD, completedTitles);
        setPrep((p) => ({ ...p, ...data }));
        completedTitles.push(sec.label);
      } catch (e: unknown) {
        failed.push(sec.key);
        const msg = e instanceof Error ? e.message : `${sec.label} 生成失败`;
        showToast(`${sec.label} 生成失败，继续下一板块...`, 'error');
        console.error(`Section ${sec.key} failed:`, msg);
      }
    }

    setGeneratingSectionKey(null);
    setIsGeneratingAll(false);
    setFailedSections(failed);

    if (failed.length === 0) {
      showToast('面试手册全部生成完成！🎉', 'success');
    } else {
      const names = failed.map((k) => SECTIONS.find((s) => s.key === k)?.label).filter(Boolean).join('、');
      setError(`${failed.length} 个板块生成失败（${names}），可单独点击「重新生成」重试`);
    }
  };

  // ── Retry a single failed section ────────────────────────
  const handleRetrySection = async (sectionKey: SectionKey) => {
    const parsedJD = getActiveParsedJD();
    if (!parsedJD || !apiKey) return;

    setFailedSections((prev) => prev.filter((k) => k !== sectionKey));
    setGeneratingSectionKey(sectionKey);

    try {
      const completedTitles = SECTIONS
        .filter((s) => s.key in prep && s.key !== sectionKey)
        .map((s) => s.label);
      const data = await callSection(sectionKey, parsedJD, completedTitles);
      setPrep((p) => ({ ...p, ...data }));
      const label = SECTIONS.find((s) => s.key === sectionKey)?.label ?? sectionKey;
      showToast(`${label} 生成完成`, 'success');
      setError('');
    } catch (e: unknown) {
      setFailedSections((prev) => [...prev, sectionKey]);
      const msg = e instanceof Error ? e.message : '生成失败';
      showToast(msg, 'error');
    } finally {
      setGeneratingSectionKey(null);
    }
  };

  const isGenerating = isGeneratingAll || generatingSectionKey !== null;
  const hasAny       = Object.keys(prep).length > 0;
  const isDone       = !isGenerating && hasAny;

  const fullContent = hasAny ? JSON.stringify(prep, null, 2) : '';

  const selectedCls   = 'border-teal-600 bg-teal-600 text-white shadow-sm';
  const unselectedCls = 'border-slate-200 bg-white text-slate-600 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700';

  const catColor: Record<string, string> = {
    general:    'bg-blue-100 text-blue-700',
    technical:  'bg-violet-100 text-violet-700',
    behavioral: 'bg-amber-100 text-amber-700',
  };
  const catLabel: Record<string, string> = {
    general: '通用问题', technical: '专业问题', behavioral: '行为面试（STAR）',
  };

  // helper: is a specific section visible?
  const showSection = (key: SectionKey) =>
    key in prep || generatingSectionKey === key || failedSections.includes(key);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">面试准备手册生成器</h1>
        <p className="text-slate-500 mt-1">逐板块生成专业面试手册，包含公司调研、自我介绍、问答话术、STAR故事等10大板块</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</span>
          <button
            type="button"
            onClick={() => { setError(''); handleGenerate(); }}
            className="cursor-pointer shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            重新生成
          </button>
        </div>
      )}

      {/* Input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">职位信息</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {savedJDs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">选择已解析的 JD</Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {(savedJDs || []).map((jd, i) => (
                    <div key={i} className="flex items-stretch">
                      <button type="button"
                        onClick={() => { setSelectedJDIndex(i); setCompanyName(jd.companyName || ''); }}
                        className={`flex-1 cursor-pointer text-left px-3 py-2 rounded-l-lg border text-sm font-medium transition-all ${selectedJDIndex === i ? selectedCls : unselectedCls}`}
                      >
                        <span className="font-medium">{jd.jobTitle}</span>
                        {jd.companyName && <span className={selectedJDIndex === i ? 'text-teal-100' : 'text-slate-500'}> @ {jd.companyName}</span>}
                      </button>
                      <button type="button"
                        onClick={() => handleDeleteJD(i)}
                        className={`px-2 rounded-r-lg border border-l-0 transition-all cursor-pointer ${
                          selectedJDIndex === i
                            ? 'border-teal-600 bg-teal-600 text-white hover:bg-teal-700'
                            : 'border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                        }`}
                        title="删除此记录"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">— 或者手动输入新 JD —</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm">JD 描述</Label>
              <Textarea value={jdText} onChange={(e) => { setJdText(e.target.value); setSelectedJDIndex(-1); }} placeholder="粘贴职位描述..." className="min-h-[80px] text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">公司名称</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="公司名称" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">面试官职位</Label>
                <Input value={interviewerTitle} onChange={(e) => setInterviewerTitle(e.target.value)} placeholder="如：HR Manager" className="text-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">面试轮次</Label>
              <div className="flex gap-2">
                {roundOptions.map((r) => (
                  <button type="button" key={r.value} onClick={() => setInterviewRound(r.value)}
                    className={`flex-1 cursor-pointer py-2 rounded-lg border text-sm font-medium transition-all ${interviewRound === r.value ? selectedCls : unselectedCls}`}
                  >{r.label}</button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">面试素材（可选，强烈推荐）</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-500">上传你的面试准备文件（好故事、好经历），AI 会将真实经历融入 STAR 故事库和话术</p>
            <div
              className={`relative rounded-lg border-2 border-dashed transition-all ${prepDragOver ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-teal-50/30'}`}
              onDragOver={(e) => { e.preventDefault(); setPrepDragOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); setPrepDragOver(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPrepDragOver(false); }}
              onDrop={handleDrop}
            >
              {prepDragOver
                ? <div className="flex flex-col items-center justify-center py-6 pointer-events-none"><Upload className="h-8 w-8 text-teal-500 mb-2" /><p className="text-sm font-medium text-teal-700">松开以上传</p></div>
                : <label htmlFor={prepFileId} className="flex cursor-pointer flex-col items-center justify-center py-4 gap-1">
                    <Upload className="h-5 w-5 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">点击或拖拽上传素材文件</p>
                    <p className="text-xs text-slate-400">PDF / Word / TXT，可多选</p>
                    <input id={prepFileId} type="file" accept=".pdf,.docx,.doc,.txt" multiple className="hidden" onChange={handleFileInput} />
                  </label>
              }
            </div>
            {prepFiles.length > 0 && (
              <div className="space-y-1.5">
                {prepFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-teal-600" />
                      <span className="text-sm text-slate-700 truncate">{f.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeFile(f.id)} className="cursor-pointer ml-2 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Textarea value={extraText} onChange={(e) => setExtraText(e.target.value)} placeholder="或直接粘贴面试素材（好故事、好经历）..." className="min-h-[80px] text-sm" />
          </CardContent>
        </Card>
      </div>

      <Button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating || (!jdText.trim() && selectedJDIndex < 0)}
        className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2 py-6 text-base"
      >
        {isGenerating
          ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />正在生成面试手册...</>
          : <><BookOpen className="w-5 h-5" />{hasAny ? '重新生成' : '生成面试准备手册'}</>
        }
      </Button>

      {/* Progress bar */}
      {(isGenerating || hasAny) && (
        <ProgressBar
          generatingSectionKey={generatingSectionKey}
          failedSections={failedSections}
          prep={prep}
        />
      )}

      {/* Results – appear section by section */}
      {hasAny && (
        <div className="space-y-3">
          {/* Toolbar */}
          {isDone && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <span className="text-sm font-semibold text-slate-800">{displayCompany} · {displayJob}</span>
                <span className="text-xs text-slate-400 ml-2">面试准备手册</span>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={exporting}
                  onClick={() => downloadDocx(prep, displayCompany, displayJob, setExporting)}>
                  {exporting ? <span className="h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  导出 Word
                </Button>
                <CopyButton text={fullContent} variant="outline" />
              </div>
            </div>
          )}

          {/* 1. Company Background */}
          {showSection('companyBackground') && (
            <Section icon={<Building2 className="w-4 h-4" />} title="一、公司背景" defaultOpen={true}
              loading={generatingSectionKey === 'companyBackground'}
              failed={failedSections.includes('companyBackground')}
              onRetry={() => handleRetrySection('companyBackground')}
              copyText={[prep.companyBackground?.overview, prep.companyBackground?.industryPosition, prep.companyBackground?.chinaMarket, prep.companyBackground?.whyHiring].filter(Boolean).join('\n\n')}
            >
              {prep.companyBackground?.overview         && <NarrativeBlock text={prep.companyBackground.overview}         label="公司简介" />}
              {prep.companyBackground?.industryPosition && <NarrativeBlock text={prep.companyBackground.industryPosition} label="行业定位与近期动态" />}
              {prep.companyBackground?.chinaMarket      && <NarrativeBlock text={prep.companyBackground.chinaMarket}      label="中国市场布局" />}
              {prep.companyBackground?.whyHiring        && <NarrativeBlock text={prep.companyBackground.whyHiring}        label="为什么招聘此岗位（分析）" />}
            </Section>
          )}

          {/* 2. Job Match */}
          {showSection('jobMatch') && (
            <Section icon={<Target className="w-4 h-4" />} title="二、岗位匹配分析"
              badge={prep.jobMatch ? `${(prep.jobMatch.strengthsMatch || []).length} 条优势` : undefined}
              loading={generatingSectionKey === 'jobMatch'}
              failed={failedSections.includes('jobMatch')}
              onRetry={() => handleRetrySection('jobMatch')}
            >
              {(prep.jobMatch?.strengthsMatch || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">个人优势 vs JD 要求</p>
                  <div className="space-y-2">
                    {prep.jobMatch!.strengthsMatch.map((sm, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-teal-50 border border-teal-100 p-2.5">
                          <p className="font-medium text-teal-700 mb-0.5">我的优势</p>
                          <p className="text-slate-700">{sm.strength}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
                          <p className="font-medium text-slate-500 mb-0.5">对应JD要求</p>
                          <p className="text-slate-700">{sm.jobRequirement}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(prep.jobMatch?.weaknesses || []).length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-amber-600 mb-2">⚠️ 潜在劣势与应对策略</p>
                  <div className="space-y-3">
                    {prep.jobMatch!.weaknesses.map((w, i) => (
                      <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <p className="font-medium text-amber-800 text-xs">劣势：{w.weakness}</p>
                        <p className="text-xs text-slate-600">策略：{w.strategy}</p>
                        <div className="rounded-md bg-white border border-amber-100 p-2.5">
                          <p className="text-xs font-medium text-amber-600 mb-1">参考话术</p>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">{w.talkingPoint}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* 3. Self Introduction */}
          {showSection('selfIntroduction') && (
            <Section icon={<User className="w-4 h-4" />} title="三、自我介绍（2分钟）"
              loading={generatingSectionKey === 'selfIntroduction'}
              failed={failedSections.includes('selfIntroduction')}
              onRetry={() => handleRetrySection('selfIntroduction')}
              copyText={(prep.selfIntroduction?.chinese || '') + (prep.selfIntroduction?.english ? '\n\n---\n\n' + prep.selfIntroduction.english : '')}
            >
              {prep.selfIntroduction?.chinese && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-500">中文版</p>
                    <CopyButton text={prep.selfIntroduction.chinese} />
                  </div>
                  <NarrativeBlock text={prep.selfIntroduction.chinese} />
                </div>
              )}
              {prep.selfIntroduction?.english && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-500">English Version</p>
                    <CopyButton text={prep.selfIntroduction.english} />
                  </div>
                  <NarrativeBlock text={prep.selfIntroduction.english} />
                </div>
              )}
            </Section>
          )}

          {/* 4. Core Q&A */}
          {showSection('coreQA') && (
            <Section icon={<MessageCircle className="w-4 h-4" />} title="四、核心面试问答"
              badge={prep.coreQA ? `${(prep.coreQA || []).length} 题` : undefined}
              loading={generatingSectionKey === 'coreQA'}
              failed={failedSections.includes('coreQA')}
              onRetry={() => handleRetrySection('coreQA')}
            >
              {['general', 'technical', 'behavioral'].map((cat) => {
                const qs = (prep.coreQA || []).filter((q) => q.category === cat);
                if (!qs.length) return null;
                return (
                  <div key={cat} className="space-y-3">
                    <Badge className={`text-xs ${catColor[cat]}`}>{catLabel[cat]}</Badge>
                    {qs.map((q, qi) => (
                      <div key={q.id || qi} className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                          <p className="font-semibold text-slate-800 text-sm">Q: {q.question}</p>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-teal-600">参考话术</p>
                            <CopyButton text={q.answer} />
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-700">{q.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Section>
          )}

          {/* 5. STAR Stories */}
          {showSection('starStories') && (
            <Section icon={<Star className="w-4 h-4" />} title="五、STAR 故事库"
              badge={prep.starStories ? `${(prep.starStories || []).length} 个故事` : undefined}
              loading={generatingSectionKey === 'starStories'}
              failed={failedSections.includes('starStories')}
              onRetry={() => handleRetrySection('starStories')}
            >
              {(prep.starStories || []).map((s, i) => (
                <div key={s.id || i} className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-50 to-slate-50 px-3 py-2.5 border-b border-slate-200 flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{s.title}</p>
                        {s.fromUserMaterial && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5">
                            ✦ 来自你的素材
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(s.applicableScenarios || []).map((sc, j) => (
                          <Badge key={j} variant="outline" className="text-xs border-teal-200 text-teal-700">{sc}</Badge>
                        ))}
                      </div>
                    </div>
                    <CopyButton text={s.story} />
                  </div>
                  <div className="p-3">
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-700 text-sm">{s.story}</p>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* 6. AI Capabilities */}
          {showSection('aiCapabilities') && (
            <Section icon={<Brain className="w-4 h-4" />} title="六、AI 能力与工具使用"
              loading={generatingSectionKey === 'aiCapabilities'}
              failed={failedSections.includes('aiCapabilities')}
              onRetry={() => handleRetrySection('aiCapabilities')}
              copyText={prep.aiCapabilities ? (prep.aiCapabilities.description || '') + '\n\n' + (prep.aiCapabilities.talkingPoint || '') : undefined}
            >
              {prep.aiCapabilities ? (
                <>
                  <NarrativeBlock text={prep.aiCapabilities.description} label="背景描述" />
                  <NarrativeBlock text={prep.aiCapabilities.talkingPoint} label="面试参考话术" />
                </>
              ) : (
                <p className="text-sm text-slate-400 py-2">JD 或素材中未涉及 AI 工具使用，此板块不适用。</p>
              )}
            </Section>
          )}

          {/* 7. Questions to Ask */}
          {showSection('questionsToAsk') && (
            <Section icon={<HelpCircle className="w-4 h-4" />} title="七、主动提问清单"
              badge={prep.questionsToAsk ? `${(prep.questionsToAsk || []).length} 个问题` : undefined}
              loading={generatingSectionKey === 'questionsToAsk'}
              failed={failedSections.includes('questionsToAsk')}
              onRetry={() => handleRetrySection('questionsToAsk')}
              copyText={(prep.questionsToAsk || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}
            >
              <div className="space-y-2">
                {(prep.questionsToAsk || []).map((q, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="w-5 h-5 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 font-medium">{i + 1}</span>
                    <p className="text-sm text-slate-700 leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 8. Strategy */}
          {showSection('strategy') && (
            <Section icon={<Lightbulb className="w-4 h-4" />} title="八、面试核心策略"
              loading={generatingSectionKey === 'strategy'}
              failed={failedSections.includes('strategy')}
              onRetry={() => handleRetrySection('strategy')}
              copyText={[prep.strategy?.positioning, ...(prep.strategy?.principles || []), prep.strategy?.closingScript].filter(Boolean).join('\n\n')}
            >
              {prep.strategy?.positioning && <NarrativeBlock text={prep.strategy.positioning} label="差异化定位" />}
              {(prep.strategy?.principles || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">核心原则</p>
                  <div className="space-y-1.5">
                    {prep.strategy!.principles.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {prep.strategy?.closingScript && <NarrativeBlock text={prep.strategy.closingScript} label="结尾推进话术" />}
            </Section>
          )}

          {/* 9. Salary */}
          {showSection('salaryNegotiation') && (
            <Section icon={<TrendingUp className="w-4 h-4" />} title="九、薪资谈判建议"
              loading={generatingSectionKey === 'salaryNegotiation'}
              failed={failedSections.includes('salaryNegotiation')}
              onRetry={() => handleRetrySection('salaryNegotiation')}
              copyText={[prep.salaryNegotiation?.marketRange, ...(prep.salaryNegotiation?.strategies || [])].filter(Boolean).join('\n\n')}
            >
              {prep.salaryNegotiation?.marketRange && <NarrativeBlock text={prep.salaryNegotiation.marketRange} label="市场薪资参考" />}
              {(prep.salaryNegotiation?.strategies || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">谈判策略</p>
                  <div className="space-y-1.5">
                    {prep.salaryNegotiation!.strategies.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-teal-50 border border-teal-100">
                        <span className="text-teal-600 shrink-0 font-medium text-xs mt-0.5">{i + 1}.</span>
                        <p className="text-sm text-slate-700">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* 10. Warnings */}
          {showSection('warningsAndTraps') && (
            <Section icon={<ShieldAlert className="w-4 h-4" />} title="十、注意事项与常见陷阱"
              loading={generatingSectionKey === 'warningsAndTraps'}
              failed={failedSections.includes('warningsAndTraps')}
              onRetry={() => handleRetrySection('warningsAndTraps')}
              copyText={[...(prep.warningsAndTraps?.traps || []), ...(prep.warningsAndTraps?.avoidPhrases || [])].join('\n')}
            >
              {(prep.warningsAndTraps?.traps || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1.5">⚠️ 常见陷阱问题</p>
                  <div className="space-y-1.5">
                    {prep.warningsAndTraps!.traps.map((t, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(prep.warningsAndTraps?.avoidPhrases || []).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">🚫 避免说的话</p>
                  <div className="space-y-1.5">
                    {prep.warningsAndTraps!.avoidPhrases.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <X className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700">{p}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Refine - only when done generating */}
          {isDone && (
            <RefineInput
              currentContent={fullContent}
              contentType="interview"
              onRefined={(refined) => {
                try {
                  const updates = JSON.parse(refined) as Partial<InterviewPrep>;
                  if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
                    showToast('未检测到有效修改', 'error');
                    return;
                  }
                  setPrep((p) => ({ ...p, ...updates }));
                } catch {
                  showToast('AI 返回格式有误，请重试', 'error');
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
