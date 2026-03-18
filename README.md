# 医学求职助手 — AI Resume Tailor

专为医学 / 生命科学行业打造的 AI 求职助手。

## 功能特性

- **简历定制**：上传简历 + JD，AI 智能定制，左右对比视图，逐条审核
- **HR 消息生成**：LinkedIn、Boss直聘、猎聘、求职邮件多平台适配
- **面试准备**：公司调研、自我介绍、面试问答、反问建议全套生成
- **历史记录**：所有记录本地保存，支持搜索筛选

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制 `.env.example` 为 `.env.local`，填入你的 Anthropic API Key：

```
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

> 获取 API Key：https://console.anthropic.com/

### 3. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 http://localhost:3000

## 在界面配置 API Key

你也可以在应用界面右上角点击 **API Key** 按钮，直接输入 Key（保存在浏览器本地）。

## 技术栈

- **框架**：Next.js 14 (App Router) + TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **AI**：Anthropic Claude API (claude-opus-4-6)
- **文件解析**：pdf-parse (PDF) + mammoth (Word)
- **数据存储**：localStorage（本地持久化）

## 目录结构

```
app/
  page.tsx              # 首页
  tailor/page.tsx       # 简历定制页
  message/page.tsx      # HR消息生成页
  interview/page.tsx    # 面试准备页
  history/page.tsx      # 历史记录页
  api/
    parse-jd/           # JD 文本解析
    parse-jd-image/     # JD 图片识别
    parse-resume/       # 简历文件解析
    tailor-resume/      # 简历定制
    match-score/        # 匹配度评分
    generate-message/   # HR消息生成
    generate-interview-prep/  # 面试准备生成
    refine/             # 通用追问优化
components/
  Navbar.tsx            # 顶部导航栏
  CopyButton.tsx        # 复制按钮
  RefineInput.tsx       # 追问优化输入框
  Loadingskeleton.tsx   # 加载动画
lib/
  types.ts              # TypeScript 类型定义
  storage.ts            # localStorage 工具函数
  claude.ts             # Claude API 封装
```

## 支持的文件格式

- 简历：PDF、Word (.docx/.doc)、纯文本 (.txt)
- JD：直接粘贴文字 / 上传图片截图（JPG、PNG）
- 面试素材：PDF、Word、TXT（支持多文件）
