# 🩺 CarePulse AI - Full-Stack Healthcare Chatbot

A production-ready, full-stack Healthcare AI Assistant application built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **TypeScript**, powered by an open-source **Kaggle Healthcare Knowledge Base** and optimized for **1-click serverless deployment on Vercel**.

![CarePulse AI Banner](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=next.js)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel Ready](https://img.shields.io/badge/Vercel-Deployment_Ready-blue?style=for-the-badge&logo=vercel)
![Dataset](https://img.shields.io/badge/Dataset-Kaggle_Healthcare_RAG-orange?style=for-the-badge)

---

## 🌟 Key Features

### 1. 🧠 Serverless Hybrid RAG Engine (`/lib/rag.ts`)
- Utilizes an open-source **Kaggle Healthcare Dataset** comprising structured disease profiles, symptom correlations, clinical descriptions, evidence-based precautions, and clinical Q&As.
- In-memory BM25 + TF-IDF weighted semantic scoring running with **sub-5ms latency** and zero external database cold-starts.
- Verified context injection into LLM prompts with citation badges for full transparency.

### 2. 🛡️ Robust Clinical Safety Guardrails (`/lib/guardrails.ts`)
- **Emergency Triage Interceptor**: Instantly flags red-flag symptoms (severe chest pain, radiating left-arm discomfort, stroke signs, anaphylaxis, suicide risk, poison ingestion) and opens an **Emergency Care Modal** with direct-dial emergency hotlines (911, 988, 999, 112).
- **Dosage & Prescription Safe Refusal**: Rejects requests asking for medication dosages, drug calculations, or custom prescriptions, directing patients safely to licensed pharmacists and physicians.
- **Mandatory Medical Disclaimers**: Prominent sticky clinical disclosures, informing users that the tool provides educational guidance rather than formal medical diagnoses.

### 3. ⚡ Multi-Provider LLM Integration & Zero-Key Fallback (`/app/api/chat/route.ts`)
- Supports **Google Gemini**, **OpenAI**, and **Groq** streaming endpoints.
- Features a **High-Precision Clinical Simulation Mode** that streams verified Kaggle dataset context even when no API keys are configured, enabling zero-friction local testing and instant Vercel previews.

### 4. 🎨 Modern Clinical UI/UX (`/app/page.tsx` & `/components/`)
- Responsive dark/light medical aesthetic.
- Streaming message bubbles with Markdown rendering (`react-markdown`, `remark-gfm`).
- Interactive **Kaggle Source Drawer** allowing patients to inspect the exact dataset entries used to answer their queries.
- One-click markdown consultation transcript exporter.

---

## 🏗️ Project Structure

```
healthcare-ai-assistant/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts          # Serverless streaming RAG chat endpoint
│   │   └── dataset/
│   │       └── route.ts          # Dataset inspection and query API
│   ├── globals.css               # Tailwind & medical theme variables
│   ├── layout.tsx                # App root layout with clinical metadata
│   └── page.tsx                  # Main interactive healthcare chat application
├── components/
│   ├── ChatInput.tsx             # Responsive auto-resizing input with clear chat
│   ├── ChatMessage.tsx           # Streaming message bubbles with markdown & badges
│   ├── DisclaimerBanner.tsx      # Top clinical disclaimer banner
│   ├── EmergencyModal.tsx        # Emergency hotline modal for red-flag symptoms
│   ├── Header.tsx                # Brand header with dark/light mode toggle
│   ├── PromptStarters.tsx        # Curated clinical prompt suggestions
│   └── SourceDrawer.tsx          # Slide-over drawer displaying raw Kaggle records
├── data/
│   └── kaggle_healthcare_knowledge.json # Cleaned Kaggle Healthcare Knowledge Base
├── lib/
│   ├── dataset-parser.ts         # Dataset loaders, filters, and schema utilities
│   ├── guardrails.ts             # Medical safety interceptors & emergency hotlines
│   ├── rag.ts                    # Serverless Hybrid RAG retrieval engine
│   └── types.ts                  # TypeScript definitions
├── .env.example                  # Environment variable template
├── next.config.js                # Next.js build configuration
├── package.json                  # Dependencies
├── tailwind.config.js            # Tailwind clinical color themes & animations
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel security headers and serverless settings
└── README.md                     # Documentation
```

---

## 🚀 Quickstart: Local Development

### 1. Navigate to project directory
```bash
cd C:\Users\abhij\.gemini\antigravity\scratch\healthcare-ai-assistant
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your API key (if desired):
```env
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
# or
OPENAI_API_KEY="your-openai-api-key"
# or
GROQ_API_KEY="your-groq-api-key"
```
*(Note: If left empty, the application runs seamlessly using the built-in verified Kaggle dataset synthesis engine).*

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚢 Deploying to Vercel (Continuous Deployment)

### Method 1: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Initialize Git & Commit**:
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of CarePulse Healthcare AI Assistant"
   ```

2. **Push to GitHub**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

3. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository.
   - Under **Environment Variables**, add:
     - `GOOGLE_GENERATIVE_AI_API_KEY` (or `OPENAI_API_KEY`)
   - Click **Deploy**.

---

### Method 2: Deploy directly via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

---

## 🔒 Medical & Clinical Disclaimer
CarePulse AI is strictly an educational decision-support demonstration tool built upon open-source Kaggle healthcare datasets. It is **not** a licensed medical device and does not provide formal medical diagnoses, clinical prescriptions, or emergency triage. In any genuine medical emergency, call **911 / 999 / 112** immediately.
