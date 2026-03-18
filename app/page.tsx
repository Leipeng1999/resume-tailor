import Link from 'next/link';
import {
  FileText, MessageSquare, BookOpen, History,
  ArrowRight, Upload, Sparkles, CheckCircle2,
  ChevronRight, Star
} from 'lucide-react';

const features = [
  {
    href: '/tailor',
    icon: FileText,
    title: '简历定制',
    description: '上传简历 + 粘贴 JD，AI 智能优化，左右对比视图，逐条审核每处修改',
    gradient: 'from-teal-500 to-teal-700',
    bg: 'bg-teal-50 hover:bg-teal-100',
    border: 'border-teal-200 hover:border-teal-400',
    iconBg: 'bg-teal-600',
    tag: 'bg-teal-100 text-teal-700',
    tags: ['左右对比视图', 'ATS 评分', '关键词匹配'],
  },
  {
    href: '/message',
    icon: MessageSquare,
    title: 'HR 消息生成',
    description: '一键生成 LinkedIn / Boss直聘 / 猎聘等平台专业求职消息，支持中英双语',
    gradient: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-600',
    tag: 'bg-blue-100 text-blue-700',
    tags: ['多平台适配', '多语言版本', '个性化追问'],
  },
  {
    href: '/interview',
    icon: BookOpen,
    title: '面试准备',
    description: '上传面试素材 + JD，AI 生成公司调研、自我介绍、问答模板全套文件',
    gradient: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-50 hover:bg-violet-100',
    border: 'border-violet-200 hover:border-violet-400',
    iconBg: 'bg-violet-600',
    tag: 'bg-violet-100 text-violet-700',
    tags: ['STAR 格式', '多版本自我介绍', '反问建议'],
  },
  {
    href: '/history',
    icon: History,
    title: '历史记录',
    description: '查看所有投递记录，包含匹配度评分、定制简历快照，支持搜索筛选',
    gradient: 'from-slate-500 to-slate-700',
    bg: 'bg-slate-50 hover:bg-slate-100',
    border: 'border-slate-200 hover:border-slate-400',
    iconBg: 'bg-slate-600',
    tag: 'bg-slate-200 text-slate-700',
    tags: ['本地保存', '按公司筛选', '一键恢复'],
  },
];

const steps = [
  { icon: Upload, label: '上传简历', desc: 'PDF / Word 均支持' },
  { icon: FileText, label: '输入 JD', desc: '粘贴文字或截图上传' },
  { icon: Sparkles, label: 'AI 分析优化', desc: '关键词匹配 + 重写' },
  { icon: CheckCircle2, label: '审核导出', desc: '逐条接受 / 还原' },
];

const keywords = [
  'Medical Writing', 'CSR', 'ICH-GCP', 'Regulatory Submission',
  'KOL Management', 'Real World Evidence', 'Medical Affairs',
  'Drug Safety', 'Pharmacovigilance', 'Clinical Study Report',
  'IND / NDA', 'Protocol', 'MSL', 'Investigator Brochure',
  'Medical Education', 'SCI Publications',
];

export default function HomePage() {
  return (
    <div className="space-y-12 pb-12">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-900 px-6 py-14 text-center text-white shadow-xl">
        {/* subtle grid background */}
        <div className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <Star className="h-3.5 w-3.5 fill-yellow-300 text-yellow-300" />
            专为医学 / 生命科学行业打造
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI 智能求职助手
          </h1>

          <p className="mx-auto max-w-xl text-lg text-teal-100 leading-relaxed">
            从 JD 解析到面试准备，一站式覆盖。
            <br className="hidden sm:block" />
            精准匹配医学行业关键词，帮你拿到更多面试邀请。
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/tailor"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 shadow-md transition hover:bg-teal-50 hover:shadow-lg"
            >
              开始定制简历
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/interview"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
            >
              准备面试
            </Link>
          </div>
        </div>
      </div>

      {/* ── Feature Cards ──────────────────────────────────────── */}
      <div>
        <h2 className="mb-5 text-center text-lg font-semibold text-slate-700">四大核心功能</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.href}
                href={f.href}
                className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border-2 p-6 transition-all duration-200 ${f.bg} ${f.border}`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${f.iconBg} shadow-md`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
                </div>

                {/* Text */}
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {f.tags.map((t) => (
                    <span key={t} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${f.tag}`}>{t}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Steps ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-center text-base font-semibold text-slate-800">使用步骤</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 ring-4 ring-teal-100">
                    <Icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="absolute hidden translate-x-[4rem] text-slate-300 sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Keywords Banner ──────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-medium text-slate-300">支持医学行业关键词精准识别</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full border border-slate-600 bg-slate-700/50 px-3 py-1 text-xs text-slate-200 transition hover:border-teal-500 hover:bg-teal-900/30 hover:text-teal-300"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
