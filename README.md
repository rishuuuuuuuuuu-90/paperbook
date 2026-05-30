# 📦 PAPERbox

> Previous Year Question Papers — Organized & Searchable

A fast, minimal web platform for GEHU students to browse and download PYQs across all courses and semesters.

## ✨ Features

- 🔍 Instant debounced search across 2,000+ papers
- 🎓 Browse by Course → Semester → Subject hierarchy
- 🔖 Bookmark papers (persisted in localStorage)
- 📄 Upload papers (Firebase-ready)
- 💬 AI Study Assistant chat widget
- 🌑 Carbon Black theme (Vercel/Linear inspired)
- ⚡ Smooth animations with reduced-motion support

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 🛠️ Tech Stack

- **React 18** + **Vite**
- **React Router v7**
- **Vanilla CSS** (Space Grotesk font)
- Firebase (Storage) — plug in `src/firebase.js` to enable real uploads

## 📁 Project Structure

```
src/
  App.jsx       — Main app, all components, routing
  index.css     — Carbon Black theme + all animations
  data.js       — Paper dataset (2000+ entries)
```

## 🎨 Theme

Carbon Black — inspired by Linear, Vercel, Raycast.

| Token | Value |
|-------|-------|
| Background | `#0a0a0a` |
| Surface | `#111111` |
| Card | `#161616` |
| Accent | `#10b981` (Emerald) |
| Text | `#ffffff` / `#6b7280` |
| Border | `#1f1f1f` |

## 📜 License

PAPERbox


