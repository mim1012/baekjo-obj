<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

This file contains instructions and context for AI coding agents working on the **Baekjo Objet (백조오브제)** project.

## 🚀 Project Overview
Baekjo Objet is a premium pet lifestyle e-commerce platform and B2B/Partner management portal. It is designed to provide curated products and professional counseling (e.g., insurance, veterinary) for pet owners.

## 🛠 Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Data Storage:** Currently using Mock Data (`src/data/*.ts`) and `localStorage` (`src/lib/storage.ts`) for frontend-only prototyping. No real backend yet.

## 🏗 Directory Structure
- `src/app/`: Next.js App Router pages
- `src/components/`: Reusable React components
- `src/data/`: Static mock data files
- `src/lib/`: Utility functions and storage wrappers
- `src/types/`: TypeScript interface definitions

## 📋 Core Conventions
- **Client Components:** Use `'use client';` directive at the top of files when using browser APIs or React hooks.
- **Styling:** Use Tailwind CSS. Colors: `#202521` (dark text), `#FAF9F5` (light bg), `#2F3B34` (primary dark green).
- **Data Management:** Read/write `localStorage` using `src/lib/storage.ts` to simulate a DB.
- **Roles:** `user` (일반 회원), `partner` (입점 업체), `b2b` (B2B 업체), `insurance` (보험사), `admin` (관리자).

## ⚠️ Important Notes
- This is a frontend-only prototype. Do not attempt to connect to a real database.
- Maintain existing visual aesthetics (premium, elegant, minimal).
