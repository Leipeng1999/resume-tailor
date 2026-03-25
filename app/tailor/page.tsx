'use client';

import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import CopyButton from '@/components/CopyButton';
import RefineInput from '@/components/RefineInput';
import { LoadingSpinner, CardSkeleton } from '@/components/Loadingskeleton';
import { showToast } from '@/components/Toast';
import { ParsedJD, TailoredResume, MatchScore, ResumeDiff } from '@/lib/types';
import {
  getApiKey, saveCurrentResume, getCurrentResume, saveParsedJD,
  getParsedJDs, deleteParsedJD,
} from '@/lib/storage';
import {
  Upload, ImagePlus, Wand2, ChevronRight, Check, RotateCcw,
  AlertCircle, TrendingUp, CheckCircle2, XCircle, FileText, Download,
  Trash2, ChevronDown, X,
} from 'lucide-react';

function useApiKey() {
  const [key, setKey] = useState('');
  useEffect(() => { setKey(getApiKey()); }, []);
  return key;
}

type JDImageItem = { id: string; preview: string; base64: string; mediaType: string };

export default function TailorPage() {
  const jdImageId   = useId();
  const resumeFileId = useId();

  const [jdText,        setJdText]        = useState('');
  const [parsedJD,      setParsedJD]      = useState<ParsedJD | null>(null);
  const [parseLoading,     setParseLoading]     = useState(false);
  const [autoProcessing,   setAutoProcessing]   = useState(false);
  const [autoProcessMsg,   setAutoProcessMsg]   = useState('');
  const [jdDragOver,       setJdDragOver]       = useState(false);

  // Multi-image queue
  const [jdImages,      setJdImages]      = useState<JDImageItem[]>([]);

  // Saved JD list
  const [savedJDs,      setSavedJDs]      = useState<ParsedJD[]>([]);
  const [showJdList,    setShowJdList]    = useState(false);

  const [resumeText,    setResumeText]    = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeDragOver,setResumeDragOver]= useState(false);
  const [resumeFileInfo,setResumeFileInfo]= useState<{ name: string; size: number } | null>(null);

  const [tailored,      setTailored]      = useState<TailoredResume | null>(null);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [matchScore,    setMatchScore]    = useState<MatchScore | null>(null);
  const [scoreLoading,  setScoreLoading]  = useState(false);
  const [diffs,         setDiffs]         = useState<ResumeDiff[]>([]);
  const [diffView,      setDiffView]      = useState<'sidebyside' | 'line' | 'changes'>('sidebyside');
  const [error,         setError]         = useState('');
  const [exportingDocx, setExportingDocx] = useState(false);

  const jdImageRef = useRef<HTMLInputElement>(null);
  const apiKey = useApiKey();

  useEffect(() => {
    const saved = getCurrentResume();
    if (saved) setResumeText(saved);
    setSavedJDs(getParsedJDs());
  }, []);

  function checkApiKey(): boolean {
    if (!apiKey) {
      showToast('请先点击右上角「API Key」按钮配置 Anthropic API Key', 'error');
      setError('未配置 API Key，请点击右上角设置');
      return false;
    }
    return true;
  }

  /* ── Auto: add images → OCR → parse JD ───────────────── */
  const addToImageQueue = useCallback(async (files: File[]) => {
    if (!checkApiKey()) return;
    const newImages: JDImageItem[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);
      const mediaType = file.type || 'image/jpeg';
      const preview = URL.createObjectURL(file);
      const id = `img-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      newImages.push({ id, preview, base64, mediaType });
    }
    setJdImages(newImages);
    setAutoProcessing(true);
    setError('');

    try {
      // Step 1: OCR
      setAutoProcessMsg(`正在识别 ${newImages.length} 张截图...`);
      const images = newImages.map((img) => ({
        base64: img.base64,
        mediaType: img.mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
      }));
      const ocrRes = await fetch('/api/parse-jd-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, apiKey }),
      });
      const ocrData = await ocrRes.json();
      if (!ocrRes.ok) throw new Error(ocrData.error);
      const extractedText = ocrData.text;
      setJdText(extractedText);

      // Step 2: Parse JD
      setAutoProcessMsg('正在解析 JD 内容...');
      const parseRes = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: extractedText, apiKey }),
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error);
      setParsedJD(parseData);
      saveParsedJD(parseData);
      setSavedJDs(getParsedJDs());
      showToast('截图识别并解析 JD 完成！', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '识别或解析失败';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setAutoProcessing(false);
      setAutoProcessMsg('');
      setJdImages((prev) => { prev.forEach((i) => URL.revokeObjectURL(i.preview)); return []; });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  /* ── Shared resume processing ─────────────────────────── */
  const processResumeFile = useCallback(async (file: File) => {
    setResumeLoading(true);
    setError('');
    showToast('正在解析简历...', 'info');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResumeText(data.text);
      saveCurrentResume(data.text);
      setResumeFileInfo({ name: file.name, size: file.size });
      showToast('简历解析成功！', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '简历解析失败';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setResumeLoading(false);
    }
  }, []);

  /* ── File input handlers ──────────────────────────────── */
  const handleJDImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await addToImageQueue(files);
    e.target.value = '';
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processResumeFile(file);
    e.target.value = '';
  };

  /* ── JD paste (Ctrl+V image) ──────────────────────────── */
  const handleJdPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await addToImageQueue([file]);
        return;
      }
    }
  };

  /* ── JD drag-and-drop ─────────────────────────────────── */
  const handleJdDragOver = (e: React.DragEvent) => { e.preventDefault(); setJdDragOver(true); };
  const handleJdDragEnter = (e: React.DragEvent) => { e.preventDefault(); setJdDragOver(true); };
  const handleJdDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setJdDragOver(false);
  };
  const handleJdDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setJdDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) await addToImageQueue(files);
  };

  /* ── Resume drag-and-drop ─────────────────────────────── */
  const handleResumeDragOver  = (e: React.DragEvent) => { e.preventDefault(); setResumeDragOver(true); };
  const handleResumeDragEnter = (e: React.DragEvent) => { e.preventDefault(); setResumeDragOver(true); };
  const handleResumeDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setResumeDragOver(false);
  };
  const handleResumeDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setResumeDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      /\.(pdf|docx?|txt)$/i.test(f.name)
    );
    if (file) await processResumeFile(file);
  };

  /* ── Parse JD text ────────────────────────────────────── */
  const handleParseJD = async () => {
    if (!jdText.trim()) { showToast('请先输入 JD 内容', 'info'); return; }
    if (!checkApiKey()) return;
    setParseLoading(true); setError('');
    try {
      const res = await fetch('/api/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParsedJD(data);
      saveParsedJD(data);
      setSavedJDs(getParsedJDs());
      showToast('JD 解析完成！', 'success');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '解析失败';
      setError(msg); showToast(msg, 'error');
    } finally {
      setParseLoading(false);
    }
  };

  /* ── AI tailor ────────────────────────────────────────── */
  const handleTailor = async () => {
    if (!resumeText.trim()) { showToast('请先上传或粘贴简历内容', 'info'); return; }
    if (!parsedJD)           { showToast('请先解析左侧 JD', 'info'); return; }
    if (!checkApiKey()) return;
    setTailorLoading(true); setError('');
    try {
      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, parsedJD, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTailored(data);
      setDiffs((data.diffs || []).map((d: ResumeDiff) => ({ ...d, accepted: true })));
      showToast('简历定制完成！请查看对比视图', 'success');
      setScoreLoading(true);
      const scoreRes = await fetch('/api/match-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: data.tailoredContent, parsedJD, apiKey }),
      });
      const scoreData = await scoreRes.json();
      if (scoreRes.ok) setMatchScore(scoreData);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '定制失败';
      setError(msg); showToast(msg, 'error');
    } finally {
      setTailorLoading(false); setScoreLoading(false);
    }
  };

  const toggleDiff  = (id: string) => setDiffs((p) => p.map((d) => d.id === id ? { ...d, accepted: !d.accepted } : d));
  const acceptAll   = () => setDiffs((p) => p.map((d) => ({ ...d, accepted: true })));
  const rejectAll   = () => setDiffs((p) => p.map((d) => ({ ...d, accepted: false })));

  const handleExportDocx = async () => {
    if (!tailored) return;
    setExportingDocx(true);
    try {
      const company = parsedJD?.companyName || '';
      const jobTitle = parsedJD?.jobTitle || '简历';
      const res = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'resume', content: tailored.tailoredContent, company, jobTitle }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '导出失败');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `简历_${company}_${jobTitle}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('简历已导出为 Word 文件！', 'success');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '导出失败', 'error');
    } finally {
      setExportingDocx(false);
    }
  };

  /* ── JD record delete ─────────────────────────────────── */
  const handleDeleteJD = (index: number) => {
    const jd = savedJDs[index];
    if (!confirm(`确认删除 ${jd.companyName ? jd.companyName + ' - ' : ''}${jd.jobTitle} 的记录？`)) return;
    deleteParsedJD(index);
    setSavedJDs(getParsedJDs());
    showToast('JD 记录已删除', 'success');
  };

  const acceptedCount  = diffs.filter((d) => d.accepted && d.type !== 'unchanged').length;
  const modifiedCount  = diffs.filter((d) => d.type !== 'unchanged').length;
  const unchangedCount = diffs.filter((d) => d.type === 'unchanged').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">JD 解析 + 简历定制</h1>
        <p className="mt-1 text-slate-500">解析职位描述，AI 智能定制简历内容</p>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
          {parsedJD && resumeText && (
            <button
              type="button"
              onClick={() => { setError(''); handleTailor(); }}
              className="cursor-pointer shrink-0 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              重试
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Left: JD Input with drag-drop ─────────────── */}
        <div className="space-y-4">
          {/* Drag wrapper */}
          <div
            className="relative"
            onDragOver={handleJdDragOver}
            onDragEnter={handleJdDragEnter}
            onDragLeave={handleJdDragLeave}
            onDrop={handleJdDrop}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>职位描述 (JD)</span>
                  <label
                    htmlFor={jdImageId}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 ${autoProcessing ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    上传截图（可多选）
                    <input
                      id={jdImageId}
                      ref={jdImageRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleJDImage}
                    />
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  onPaste={handleJdPaste}
                  placeholder="粘贴 JD 文字内容，或拖拽/Ctrl+V 粘贴截图自动识别..."
                  className="min-h-[200px] font-mono text-sm"
                />

                {/* Auto-processing loading state */}
                {autoProcessing && (
                  <div className="space-y-2">
                    {jdImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {jdImages.map((img) => (
                          <div key={img.id} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.preview}
                              alt="截图预览"
                              className="h-16 w-16 rounded-lg border border-violet-200 object-cover opacity-70"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2.5 text-sm text-violet-700">
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                      {autoProcessMsg || '正在识别截图并解析 JD...'}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ImagePlus className="h-3 w-3" />
                  拖拽/Ctrl+V/上传截图后自动识别并解析 JD · 支持多张合并识别
                </div>
                <Button
                  type="button"
                  onClick={handleParseJD}
                  disabled={!jdText.trim() || parseLoading}
                  className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {parseLoading
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />解析中...</>
                    : <><ChevronRight className="h-4 w-4" />解析 JD</>
                  }
                </Button>
              </CardContent>
            </Card>

            {/* JD drag overlay */}
            {jdDragOver && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-teal-500 bg-teal-50/95 pointer-events-none">
                <div className="text-center">
                  <ImagePlus className="mx-auto mb-2 h-10 w-10 text-teal-500" />
                  <p className="text-sm font-medium text-teal-700">松开以自动识别截图并解析 JD</p>
                  <p className="mt-1 text-xs text-teal-600">支持 JPG、PNG、WebP，可多张</p>
                </div>
              </div>
            )}
          </div>

          {parseLoading && <CardSkeleton />}
          {parsedJD && !parseLoading && (
            <Card className="border-teal-100 bg-teal-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-teal-800">
                  ✓ {parsedJD.jobTitle}{parsedJD.companyName && ` @ ${parsedJD.companyName}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(parsedJD.coreSkills || []).length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-slate-700">核心技能</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(parsedJD.coreSkills || []).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {parsedJD.educationExperience && (
                  <div>
                    <p className="mb-1 font-medium text-slate-700">学历/经验</p>
                    <p className="text-slate-600">{parsedJD.educationExperience}</p>
                  </div>
                )}
                {(parsedJD.industryKeywords || []).length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-slate-700">行业关键词</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(parsedJD.industryKeywords || []).map((k) => (
                        <Badge key={k} className="bg-teal-100 text-teal-800 hover:bg-teal-200 text-xs">{k}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(parsedJD.niceToHave || []).length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-slate-700">加分项</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(parsedJD.niceToHave || []).map((n) => <Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Saved JD list */}
          {savedJDs.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowJdList((v) => !v)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showJdList ? 'rotate-180' : ''}`} />
                历史 JD 记录（{savedJDs.length} 条）— 点击快速加载
              </button>
              {showJdList && (
                <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                  {savedJDs.map((jd, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setJdText(jd.rawText || '');
                          setParsedJD(jd);
                          showToast('JD 已加载', 'success');
                        }}
                        className="flex-1 text-left text-sm text-slate-700 hover:text-teal-700 transition-colors cursor-pointer truncate rounded-l-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 px-3 py-2"
                      >
                        {jd.companyName ? `${jd.companyName} — ` : ''}{jd.jobTitle}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJD(i)}
                        className="shrink-0 rounded-r-lg border border-l-0 border-slate-200 bg-slate-50 px-2 py-2 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Resume upload with drag-drop ───────── */}
        <div className="space-y-4">
          {/* Drag wrapper */}
          <div
            className="relative"
            onDragOver={handleResumeDragOver}
            onDragEnter={handleResumeDragEnter}
            onDragLeave={handleResumeDragLeave}
            onDrop={handleResumeDrop}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>上传简历</span>
                  <label
                    htmlFor={resumeFileId}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 ${resumeLoading ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    {resumeLoading
                      ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
                      : <Upload className="h-3.5 w-3.5" />
                    }
                    上传简历 (PDF / Word)
                    <input
                      id={resumeFileId}
                      type="file"
                      accept=".pdf,.docx,.doc,.txt"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resumeFileInfo && (
                  <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                    <FileText className="h-4 w-4 shrink-0 text-teal-600" />
                    <span className="text-sm text-teal-800 truncate">{resumeFileInfo.name}</span>
                    <span className="text-xs text-teal-500 shrink-0 ml-auto">
                      {(resumeFileInfo.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
                {resumeLoading
                  ? <LoadingSpinner text="正在解析简历..." />
                  : (
                    <Textarea
                      value={resumeText}
                      onChange={(e) => { setResumeText(e.target.value); saveCurrentResume(e.target.value); }}
                      placeholder="拖拽 PDF/Word 文件到此处，或点击右上角上传，也可直接粘贴简历文字..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  )
                }
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Upload className="h-3 w-3" />
                  支持拖拽简历文件到此区域 · 或点击右上角按钮上传
                </div>
                <Button
                  type="button"
                  onClick={handleTailor}
                  disabled={!resumeText.trim() || !parsedJD || tailorLoading}
                  className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {tailorLoading
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />AI 定制中...</>
                    : <><Wand2 className="h-4 w-4" />AI 定制简历</>
                  }
                </Button>
                {!parsedJD && resumeText && (
                  <p className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" />请先解析左侧 JD，再进行简历定制
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Resume drag overlay */}
            {resumeDragOver && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-teal-500 bg-teal-50/95 pointer-events-none">
                <div className="text-center">
                  <Upload className="mx-auto mb-2 h-10 w-10 text-teal-500" />
                  <p className="text-sm font-medium text-teal-700">松开以上传简历</p>
                  <p className="mt-1 text-xs text-teal-600">支持 PDF、Word、TXT</p>
                </div>
              </div>
            )}
          </div>

          {tailored?.suggestions && (tailored.suggestions || []).length > 0 && (
            <Card className="border-blue-100 bg-blue-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800">💡 AI 建议补充</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {(tailored.suggestions || []).map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-blue-700">
                      <span className="mt-0.5 shrink-0">•</span>{s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {tailorLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <LoadingSpinner text="AI 正在定制简历，约需 15-30 秒..." />
        </div>
      )}

      {tailored && !tailorLoading && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-700">修改统计：</span>
            <span className="flex items-center gap-1 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />{acceptedCount} 处已接受
            </span>
            <span className="flex items-center gap-1 text-sm text-amber-700">
              <TrendingUp className="h-4 w-4" />{modifiedCount} 处有修改
            </span>
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <Check className="h-4 w-4" />{unchangedCount} 处保持不变
            </span>
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={acceptAll} className="gap-1 text-xs">
                <Check className="h-3 w-3" />接受全部
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={rejectAll} className="gap-1 text-xs">
                <RotateCcw className="h-3 w-3" />还原全部
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleExportDocx} disabled={exportingDocx} className="gap-1 text-xs">
                {exportingDocx
                  ? <span className="h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  : <Download className="h-3 w-3" />
                }
                导出 Word
              </Button>
              <CopyButton text={tailored.tailoredContent} variant="outline" />
            </div>
          </div>

          <Tabs value={diffView} onValueChange={(v) => setDiffView(v as typeof diffView)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="sidebyside">左右对比</TabsTrigger>
              <TabsTrigger value="line">逐行对比</TabsTrigger>
              <TabsTrigger value="changes">仅看更改</TabsTrigger>
            </TabsList>

            <TabsContent value="sidebyside">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">原始简历</CardTitle></CardHeader>
                  <CardContent>
                    {diffs.length > 0
                      ? <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                          {diffs.map((d) => (
                            <span key={d.id} className={
                              d.type === 'modified' || d.type === 'removed'
                                ? 'bg-red-100 text-red-700 line-through' : 'text-slate-500'
                            }>{d.originalText}</span>
                          ))}
                        </div>
                      : <p className="whitespace-pre-wrap text-sm text-slate-600">{tailored.originalContent}</p>
                    }
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-teal-700">定制后简历</CardTitle></CardHeader>
                  <CardContent>
                    {diffs.length > 0
                      ? <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
                          {diffs.map((d) => (
                            <span key={d.id} className={
                              d.accepted && (d.type === 'modified' || d.type === 'added')
                                ? 'bg-green-100 text-green-800' : 'text-slate-500'
                            }>{d.accepted ? d.newText : d.originalText}</span>
                          ))}
                        </div>
                      : <p className="whitespace-pre-wrap text-sm text-slate-900">{tailored.tailoredContent}</p>
                    }
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="line">
              <Card>
                <CardContent className="space-y-3 pt-4">
                  {diffs.filter((d) => d.type !== 'unchanged').length === 0
                    ? <p className="py-4 text-center text-sm text-slate-500">暂无行级差异数据</p>
                    : diffs.filter((d) => d.type !== 'unchanged').map((diff) => (
                        <div key={diff.id} className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm">
                          {diff.originalText && (
                            <p className="rounded bg-red-50 px-2 py-1 font-mono text-red-700 line-through">{diff.originalText}</p>
                          )}
                          <div className="flex items-center gap-1 pl-1 text-xs text-slate-400">
                            <ChevronRight className="h-3 w-3" />
                            {diff.type === 'added' ? '新增' : '替换为'}
                          </div>
                          {diff.newText && (
                            <p className="rounded bg-green-50 px-2 py-1 font-mono text-green-800">{diff.newText}</p>
                          )}
                        </div>
                      ))
                  }
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="changes">
              <div className="space-y-3">
                {diffs.filter((d) => d.type !== 'unchanged').length === 0
                  ? <Card><CardContent className="py-8 text-center text-sm text-slate-500">暂无差异数据</CardContent></Card>
                  : diffs.filter((d) => d.type !== 'unchanged').map((diff) => (
                      <Card key={diff.id}>
                        <CardContent className="space-y-3 pt-4">
                          <div className="grid grid-cols-2 gap-3 font-mono text-sm">
                            {diff.originalText && (
                              <div className="rounded border border-red-200 bg-red-50 p-2 text-red-800">
                                <p className="mb-1 text-xs text-red-500">原文</p>
                                {diff.originalText}
                              </div>
                            )}
                            {diff.newText && (
                              <div className={`rounded border p-2 ${diff.accepted ? 'border-green-200 bg-green-50 text-green-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                <p className={`mb-1 text-xs ${diff.accepted ? 'text-green-600' : 'text-slate-500'}`}>
                                  {diff.accepted ? '已采纳' : '建议修改'}
                                </p>
                                {diff.newText}
                              </div>
                            )}
                          </div>
                          {diff.reason && (
                            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                              <span className="font-medium">AI 修改理由：</span>{diff.reason}
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button type="button" size="sm" onClick={() => toggleDiff(diff.id)}
                              className={`gap-1 text-xs ${diff.accepted ? 'bg-green-600 hover:bg-green-700 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                              {diff.accepted ? <><Check className="h-3 w-3" />已接受</> : <><CheckCircle2 className="h-3 w-3" />接受</>}
                            </Button>
                            <Button type="button" variant="outline" size="sm"
                              onClick={() => setDiffs((p) => p.map((d) => d.id === diff.id ? { ...d, accepted: false } : d))}
                              className="gap-1 border-red-200 text-xs text-red-600 hover:bg-red-50">
                              <XCircle className="h-3 w-3" />还原
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                }
              </div>
            </TabsContent>
          </Tabs>

          <RefineInput
            currentContent={tailored.tailoredContent}
            contentType="resume"
            context={parsedJD ? `目标岗位：${parsedJD.jobTitle} @ ${parsedJD.companyName}` : undefined}
            onRefined={(refined) => setTailored((p) => p ? { ...p, tailoredContent: refined } : null)}
          />
        </div>
      )}

      {(scoreLoading || matchScore) && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800">
            <TrendingUp className="h-4 w-4 text-teal-600" />匹配度分析
          </h2>
          {scoreLoading
            ? <LoadingSpinner text="正在计算匹配度..." />
            : matchScore && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: '综合匹配度', value: matchScore.overall,      color: 'text-teal-600' },
                    { label: '关键词匹配', value: matchScore.keywordMatch, color: 'text-blue-600' },
                    { label: 'ATS 友好度', value: matchScore.atsScore,     color: 'text-violet-600' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2 text-center">
                      <div className={`text-3xl font-bold ${item.color}`}>{item.value}%</div>
                      <Progress value={item.value} className="h-2" />
                      <p className="text-xs text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-1 font-medium text-green-700">
                      <CheckCircle2 className="h-4 w-4" />已匹配关键词 ({(matchScore.matchedKeywords || []).length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(matchScore.matchedKeywords || []).map((k) => (
                        <Badge key={k} className="bg-green-100 text-green-700 text-xs">{k}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1 font-medium text-red-700">
                      <XCircle className="h-4 w-4" />缺失关键词 ({(matchScore.missingKeywords || []).length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(matchScore.missingKeywords || []).map((k) => (
                        <Badge key={k} variant="outline" className="border-red-300 text-red-600 text-xs">{k}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {(matchScore.atsIssues || []).length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1 text-sm font-medium text-amber-700">
                      <AlertCircle className="h-4 w-4" />ATS 优化建议
                    </p>
                    <ul className="space-y-1">
                      {(matchScore.atsIssues || []).map((issue, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-amber-700">
                          <span className="mt-0.5 shrink-0">•</span>{issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
