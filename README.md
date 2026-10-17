# 🛡️ Aegis DecisionOS

> **Next-Generation Real-Time Clinical Decision Support System (CDSS) & Safety-Critical Advisory Engine**  
> *Deterministic rules at the speed of telemetry. Humans strictly in control.*

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-4.3-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Google GenAI SDK](https://img.shields.io/badge/Google_GenAI_SDK-2.4-4285F4?style=flat-square&logo=google)](https://www.npmjs.com/package/@google/genai)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

---

## ⚡ Quick Start (Run in 30 Seconds)

Get Aegis DecisionOS running locally in three simple steps:

```bash
# 1. Clone your repository
git clone https://github.com/your-username/aegis-decision-os.git
cd aegis-decision-os

# 2. Install dependencies
npm install

# 3. Start development server (Frontend + Backend on http://localhost:3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

*(Optional)* To enable live Gemini AI clinical insights and pack generation, create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```
> **Note:** If `GEMINI_API_KEY` is not provided, Aegis automatically activates its **Deterministic Clinical Fallback Engine**, ensuring full, uninterrupted functionality for local demos, air-gapped environments, and testing.

---

## 📖 Overview

**Aegis DecisionOS** is a high-density, real-time Clinical Decision Support System (CDSS) designed for emergency departments, intensive care units, and critical operational environments. 

In high-stress triage, cognitive overload causes misdiagnoses and delays. Aegis correlates bedside HL7/FHIR telemetry streams with validated clinical protocols, evaluates trade-offs across resource constraints, and surfaces clear, auditable recommendations while ensuring **licensed clinicians remain the sole authoritative decision-makers**.

---

## 🌟 Key Features

### 1. 🏥 Clinical Command Center
- **Real-Time Census & Bedside Telemetry**: Continuously monitors vital signs (SpO2, MAP, Heart Rate, Respiration, GCS, Lactate) with visual normal reference bounds.
- **Dynamic ESI Acuity Triage**: Instant classification across Emergency Severity Index tiers (ESI 1: Resuscitation through ESI 5: Non-Urgent).
- **Incident & Alarm Correlator**: Filters signal noise, grouping erratic sensor spikes into actionable clinical events.
- **Rapid Scenario Bar**: Inject simulated surges, telemetry spikes, sensor dropouts, or cardiac arrest cascades with one click.

### 2. 📋 Decision Workstation & Patient Cases
- **Real-Time Search & Acuity Filter**: Filter patient records by ID, condition, or triage tier (All, ESI 1-2 Emergent, ESI 3 Urgent).
- **Interactive Evidence Graph**: Visual network displaying the provenance of every recommendation (e.g., *Biometric Signals & Labs &rarr; Clinical Rules Engine &rarr; Guideline Recommendations*).
- **Action Evaluation Matrix**: Compares therapeutic options side-by-side with confidence scores, turnaround times, and contraindication flags.
- **Clinical Override Flow**: Requires explicit clinician justification, role authentication, and protocol citation before diverging from guidance.

### 3. 📜 Cryptographic Decision Ledger
- **Immutable Audit Trail**: Every triage score, rule firing, and clinical override is committed with a SHA-256 hash linked to the prior block.
- **Interactive Decision Replay**: Step backward and forward through any patient case timeline to reconstruct telemetry states during review.
- **Regulatory Export**: One-click download of timestamped, tamper-evident audit packages in JSON and clinical CSV formats.

### 4. 💬 Clinical Copilot & AI Advisory
- **Multi-Turn Chat Thread**: Chat directly with a specialized clinical AI assistant grounded in active patient telemetry.
- **Clinician Role Specialization**: Switch between *Clinical Triage Officer*, *Attending Physician Copilot*, and *Safety & Protocol Auditor*.
- **Adaptive Model Routing**: 
  - `gemini-4-argon`: Complex multi-system failure and differential diagnoses.
  - `gemini-3.8-flash`: General triage, protocol consultation, and drug-interaction checking.
  - `gemini-3.1-flash-lite`: Low-latency rapid status checks.
- **Deterministic Offline Fallback**: Guarantees medical responses even during connectivity drops.

### 5. 🎙️ Clinical Voice Assistant & Speech Synthesis
- **Hands-Free Speech Dictation**: Web Speech API integration with live acoustic pulse visualizer, interim speech transcription, and hands-free loop.
- **Gemini 3.8 Flash-Lite TTS**: High-efficiency, low-latency natural clinical voice audio generation (`audio/wav`) via `/api/gemini/tts`.
- **Configurable Voice Personas**: Toggle between clinical voices (*Kore*, *Fenrir*, *Puck*, *Zephyr*, *Charon*) tailored for emergency and ICU environments.
- **Clinical Voice Command & Intent Recognition**: Automatically interprets and navigates on voice commands:
  - *"Assess active ESI priority"*
  - *"Check ICU and acute bed headroom"*
  - *"Open patient decision cases"*
  - *"Trigger emergency surge simulation"*
  - *"Transmit telemetry vitals spike"*
  - *"Go to clinical command center"*
- **Instant Audio Playback**: One-click "Listen" audio playback for any message in the chat drawer or voice dialog.
- **Resilient Zero-Latency Fallback**: Automatically switches to browser `window.speechSynthesis` when running in offline or air-gapped environments.

### 6. 🧪 Scenario Lab & Stress Testing
- Test hospital systems against synthetic edge cases:
  - **Mass Casualty Incident (MCI)**: Sudden influx of multi-trauma admissions.
  - **Telemetry Anomaly Spike**: Severe sepsis cascade vs. monitor lead detachment.
  - **ICU Bed & Ventilator Saturation**: Resource allocation optimization under strict triage guidelines.

### 7. 🛡️ Reliability & Circuit Breaker Console
- Inspect CDSS engine health in real time:
  - Telemetry pipeline latency (sub-50ms processing).
  - Protocol drift tracking and false positive rates.
  - Automatic circuit breakers that disengage AI advisory if confidence drops below safety thresholds.

### 8. 📦 Domain Pack Studio
- Extensible domain architecture. Seamlessly switch between or create domain packs:
  - **Hospital Emergency Medicine** (ED/ICU Triage)
  - **Disaster & Mass Casualty Response**
  - **Industrial Process & Manufacturing Safety**
  - Includes AI-powered pack generation from clinical guidelines or operational SOPs.

### 9. 🌐 Multilingual & RTL Support
- Full internationalization support with instant language switching:
  - 🇺🇸 English (`en`)
  - 🇪🇸 Spanish (`es`)
  - 🇫🇷 French (`fr`)
  - 🇩🇪 German (`de`)
  - 🇨🇳 Simplified Chinese (`zh`)
  - 🇸🇦 Arabic (`ar`) — with automatic Right-to-Left (RTL) layout mirroring.

---

## 🏗️ Architecture & Technology Stack

```
aegis-decision-os/
├── server.ts                  # Express server + Vite SSR/Middleware + Gemini AI endpoints
├── index.html                 # App shell with clinical typography & metadata
├── src/
│   ├── main.tsx               # Client React 19 entry point
│   ├── App.tsx                # Master responsive layout (Header + Sidebar + Views)
│   ├── index.css              # Tailwind v4 styles, tabular data rules & typography scale
│   ├── components/
│   │   ├── Header.tsx         # Unified telemetry status, clock, pack & language switcher
│   │   ├── Sidebar.tsx        # Categorized clinical navigation
│   │   ├── ClinicalChatDrawer # Gemini AI assistant drawer with role switcher
│   │   ├── EvidenceGraph.tsx  # Interactive SVG clinical lineage diagram
│   │   ├── DecisionReplayModal# Step-by-step case state time machine
│   │   ├── InjectEventModal   # Manual FHIR/HL7 telemetry event injection
│   │   └── GuidedDemoModal    # Interactive walkthrough tour
│   ├── context/
│   │   └── EngineContext.tsx  # Central reactive decision engine state & event dispatcher
│   ├── engine/
│   │   └── ruleEngine.ts      # Deterministic clinical evaluation logic
│   ├── domain-packs/
│   │   ├── registry.ts        # Dynamic domain pack loader
│   │   └── data/              # Default protocol packs (Hospital, Disaster, Safety)
│   ├── i18n/
│   │   └── index.ts           # Multilingual dictionary & RTL configurations
│   ├── pages/
│   │   ├── CommandCenter.tsx  # Real-time triage monitor & active patient alerts
│   │   ├── DecisionCases.tsx  # Deep-dive patient evaluation workstation
│   │   ├── DecisionLedger.tsx # Cryptographic ledger & audit logs
│   │   ├── ScenarioLab.tsx    # Edge-case simulation & stress bench
│   │   ├── ReliabilityConsole # System health, circuit breakers & latency telemetry
│   │   ├── ResourcesPage.tsx  # Bed, blood bank, OR & ventilator capacity
│   │   ├── DomainPackStudio   # Custom rule and protocol builder
│   │   └── SettingsPage.tsx   # System preferences, thresholds & audit policies
│   └── types/
│       └── index.ts           # TypeScript interfaces & domain data models
```

---

## 🛠️ Available NPM Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run dev` | `tsx server.ts` | Launches both Vite client and Express API on port 3000 |
| `npm run build` | `vite build` | Compiles the production React application to `/dist` |
| `npm run lint` | `tsc --noEmit` | Performs strict TypeScript type checks across all files |
| `npm run preview` | `vite preview` | Previews the production build locally |
| `npm run clean` | `rm -rf dist` | Cleans previous build artifacts |

---

## 🚀 How to Push to GitHub (Easiest Method)

If you are initializing this repository for GitHub for the first time:

```bash
# 1. Initialize git in the project root
git init

# 2. Add all files to staging
git add .

# 3. Create your first commit
git commit -m "feat: initial commit of Aegis DecisionOS clinical platform"

# 4. Set the main branch
git branch -M main

# 5. Connect to your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 🔒 Safety, Clinical Ethics & Compliance

- **Human-in-the-Loop Mandate**: Aegis DecisionOS is engineered strictly as a clinical decision support system (Class II CDSS framework). It **never** auto-executes medical orders, drug administrations, or surgical interventions.
- **Zero Hallucination Tolerance**: Core triage classifications (ESI score, sepsis thresholds, trauma activation criteria) are evaluated through deterministic rule algorithms before AI commentary is rendered.
- **Audit Traceability**: Every override of an automated recommendation requires a clinician signature, reason code, and is permanently recorded in the SHA-256 ledger.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to use, modify, and distribute for clinical research, operational deployments, or prototyping.
