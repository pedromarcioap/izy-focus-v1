# Izy Focus - Specification Document

## 1. Project Overview

**Project Name:** Izy Focus  
**Type:** Chrome Extension (Manifest V3)  
**Core Functionality:** Pomodoro-style focus timer with gamification (garden) and Google Drive sync  
**Target Users:** Productivity-focused individuals who want to block distractions and track focus sessions

---

## 2. Design System

### 2.1 Color Palette

| Color Name | Hex | Usage |
|------------|-----|-------|
| Primary (Emerald) | `#10B981` | Main actions, success states, growing plants |
| Primary Dark | `#059669` | Hover states, borders |
| Primary Light | `#D1FAE5` | Backgrounds, subtle highlights |
| Secondary (Violet) | `#8B5CF6` | Accent, achievements, XP |
| Secondary Dark | `#7C3AED` | Hover states |
| Secondary Light | `#EDE9FE` | Backgrounds |
| Accent (Amber) | `#F59E0B` | Warnings, stones, highlight |
| Accent Light | `#FEF3C7` | Backgrounds |
| Background | `#FAFAFA` | Main background |
| Background Dark | `#F3F4F6` | Cards, secondary areas |
| Surface | `#FFFFFF` | Cards, inputs |
| Text Primary | `#111827` | Headings, important text |
| Text Secondary | `#6B7280` | Body text |
| Text Tertiary | `#9CA3AF` | Placeholders, hints |
| Border | `#E5E7EB` | Borders, dividers |
| Error | `#EF4444` | Errors, destructive actions |
| Success | `#10B981` | Success states |

### 2.2 Dark Mode Colors

| Color Name | Hex | Usage |
|------------|-----|-------|
| Background | `#0F172A` | Main background |
| Background Dark | `#1E293B` | Cards, secondary |
| Surface | `#334155` | Inputs, cards |
| Text Primary | `#F1F5F9` | Headings |
| Text Secondary | `#94A3B8` | Body text |
| Border | `#475569` | Borders |

### 2.3 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | Figtree | 700 | 20px/18px/16px |
| Body | Figtree | 400 | 14px |
| Labels | Figtree | 600 | 12px |
| Timer Display | Figtree | 700 | 48px |
| Small Text | Figtree | 400 | 12px |

### 2.4 Spacing System

- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- Card padding: 16px
- Section gap: 24px
- Button padding: 12px 16px

### 2.5 Border Radius

- Small (buttons, inputs): 8px
- Medium (cards): 12px
- Large (modals): 16px
- Full (avatars): 9999px

### 2.6 Shadows

```css
/* Small - buttons, inputs */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

/* Medium - cards */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

/* Large - modals */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

### 2.7 Transitions

| Type | Duration | Easing |
|------|----------|--------|
| Default | 200ms | ease |
| Slow | 300ms | ease |
| Fast | 150ms | ease |

---

## 3. UI Components

### 3.1 Icons (Lucide/Heroicons Style)

All icons use 24px viewBox, 2px stroke width, rounded line caps.

#### Navigation Icons (Header)

| Icon | SVG Path | Usage |
|------|----------|-------|
| Garden | `M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5` | Garden page |
| Chart | `M3 3v18h18M9 17V9M15 17V5M21 17v-4` | Stats/History |
| Settings | `M12 15a3 3 0 100-6 3 3 0 000 6z M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83` | Settings |
| Plus | `M12 5v14M5 12h14` | Add new |

#### Action Icons

| Icon | SVG Path | Usage |
|------|----------|-------|
| Play | `M5 3l14 9-14 9V3z` | Start focus |
| Pause | `M6 4h4v16H6zM14 4h4v16h-4z` | Pause |
| Stop | `M6 6h12v12H6z` | Stop/Finish |
| Check | `M20 6L9 17l-5-5` | Complete |
| X | `M18 6L6 18M6 6l12 12` | Cancel/Close |
| Edit | `M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9-9z` | Edit |
| Delete | `M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16` | Delete |
| Download | `M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3` | Export |
| Upload | `M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12` | Import |
| Sync | `M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15` | Sync |
| Cloud | `M3 15a4 4 0 004 4h9a4 4 0 001.7-3.36 6 6 0 0010.3 1.36A4 4 0 0023 12a4 4 0 01-4 4H3z` | Cloud connect |
| Cloud Off | `M1 1l22 22M18.3 18.3a4 4 0 00-5.66 0M16.3 13.3l-1-1a6 6 0 018.5 8.5l-1-1M2 2l22 22M3.5 3.5a4 4 0 015.66 5.36` | Cloud disconnect |
| Sun | `M12 3v1M12 20v1M4.22 4.22l.71.71M18.36 18.36l.71.71M1 12h1M22 12h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71` | Light mode |
| Moon | `M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z` | Dark mode |
| Bell | `M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0` | Notifications |
| Volume | `M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07` | Sound |
| Volume X | `M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6` | Mute |
| Heart | `M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z` | Favorite |
| Star | `M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z` | Achievement |
| Trophy | `M8 21h8M12 17v4M6 6h12v4a4 4 0 01-4 4H10a4 4 0 01-4-4V6zM6 10a2 2 0 100-4 2 2 0 000 4zM18 10a2 2 0 100-4 2 2 0 000 4z` | Leaderboard |
| Flame | `M12 2c.5 2.5 2 4.5 4 6.5 2 2 3 4.5 3 7.5a4 4 0 01-4 4h-6a4 4 0 01-4-4c0-3 1-5.5 3-7.5 2-2 3.5-4 4-6.5z` | Streak |
| Target | `M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2` | Goal |
| Clock | `M12 2a10 10 0 100 20 10 10 0 000-20zM12 6v6l4 2` | Timer |
| Leaf | `M12 2C7 2 3 7 3 10c0 4 3 7 9 9-1-6 0-12-6-14 0 0 3 2 6 3z` | Plant/Seed |
| Gem | `M12 2l3 4 1-1 1 4-5-2-5 2 1-4 1 1-3-4z` | Stone |
| Calendar | `M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18` | Date/History |
| Filter | `M22 3H2l8 9.46V19l4 2v-8.54L22 3z` | Filter |
| Search | `M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z` | Search |

#### Status Icons

| Icon | SVG Path | Usage |
|------|----------|-------|
| Check Circle | `M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3` | Success |
| Alert Circle | `M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01` | Warning |
| Info | `M12 2a10 10 0 100 20 10 10 0 000-20zM12 16v-4M12 8h.01` | Info |
| Loading | Animate spin | Loading state |

### 3.2 Buttons

#### Primary Button
```css
background: #10B981;
color: white;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
transition: all 200ms ease;
:hover { background: #059669; transform: translateY(-1px); }
:active { transform: translateY(0); }
:disabled { opacity: 0.5; cursor: not-allowed; }
```

#### Secondary Button
```css
background: transparent;
color: #10B981;
border: 1px solid #10B981;
padding: 12px 24px;
border-radius: 8px;
font-weight: 600;
:hover { background: #D1FAE5; }
```

#### Ghost Button
```css
background: transparent;
color: #6B7280;
padding: 8px 16px;
:hover { background: #F3F4F6; color: #111827; }
```

#### Icon Button
```css
width: 36px;
height: 36px;
border-radius: 8px;
display: flex;
align-items: center;
justify-content: center;
:hover { background: #F3F4F6; }
```

### 3.3 Cards

```css
background: white;
border-radius: 12px;
padding: 16px;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
transition: all 200ms ease;
:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
```

### 3.4 Input Fields

```css
background: white;
border: 1px solid #E5E7EB;
border-radius: 8px;
padding: 12px 16px;
font-size: 14px;
transition: all 200ms ease;
:focus { border-color: #10B981; outline: none; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
:placeholder { color: #9CA3AF; }
```

### 3.5 Toggle Switch

```css
width: 44px;
height: 24px;
background: #E5E7EB;
border-radius: 9999px;
cursor: pointer;
transition: all 200ms ease;
:checked { background: #10B981; }
::before {
  content: '';
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 9999px;
  transition: all 200ms ease;
  transform: translateX(2px);
}
:checked::before { transform: translateX(22px); }
```

---

## 4. Page Designs

### 4.1 Popup (Main View)

#### Home State
```
┌─────────────────────────────────────────────┐
│ 🏠 Izy Focus           🌿  📊  ⚙️  🌙     │  ← Header: Logo + Nav + Dark toggle
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🌱 Iniciar Sessão de Foco          │   │  ← Main Card
│  │                                     │   │
│  │  Selecione uma lista:               │   │
│  │  ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ 🍅 Pomodoro │ │ 📚 Estudo   │    │   │  ← Quick start buttons
│  │  │   25 min    │ │   45 min    │    │   │
│  │  └─────────────┘ └─────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐    │   │
│  │  │ 💼 Trabalho │ │ 🎯 Custom   │    │   │
│  │  │   60 min    │ │   90 min    │    │
│  │  └─────────────┘ └─────────────┘    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐  │  ← Stats row
│  │   🌱 12   │ │   💎 5   │ │  🔥 7    │  │  ← Seeds | Stones | Streak
│  │  Sementes │ │  Pedras  │ │  Dias    │  │
│  └───────────┘ └───────────┘ └───────────┘  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  ✏️  Intenção do Dia                        │  ← Intention
│  ┌─────────────────────────────────────┐   │
│  │ O que você vai conquistar hoje?    │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│  0/200                                      │
│                                             │
└─────────────────────────────────────────────┘
```

#### Active Focus State
```
┌─────────────────────────────────────────────┐
│ 🔴 Focando...           ⏸️  ⏹️            │  ← Timer active indicator
├─────────────────────────────────────────────┤
│                                             │
│         ╭─────────────────────╮            │
│        │   ╱╲    🌱    ╱╲     │            │  ← Animated plant
│        │  ╱  ╲         ╱  ╲    │            │
│        │ ╱    ╲       ╱    ╲   │            │
│        │╱══════╲     ╱══════╲  │            │
│        │        ╲___╱         │            │
│        ╰─────────────────────╯            │
│                                             │
│              ⏱️ 25:00                       │  ← Timer display
│           Foco: Estudo                      │  ← Current task
│        ════════════════                    │  ← Progress ring
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🎵 Sons Ambiente          🌧️ 🌳 🔇  │   │  ← Sound selector
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

#### Completed State
```
┌─────────────────────────────────────────────┐
│ 🏆 Sessão Concluída!                         │
├─────────────────────────────────────────────┤
│                                             │
│           🎉  ✨  🌱  ✨  🎉                │
│                                             │
│      +1 Semente de Foco                     │
│      +50 XP                                 │
│                                             │
│   ┌─────────────────────────────────────┐  │
│   │    🌱🌱🌱🌱🌱🌱🌱🌱🌱🌱    │  │  ← Progress
│   │    ████████░░░░░░░░░░░░    │  │  ← Level progress
│   │    Nível 3 │ 150/250 XP    │  │
│   └─────────────────────────────────────┘  │
│                                             │
│  ┌───────────────┐  ┌───────────────┐      │
│  │ Proximo Ciclo │  │ Finalizar     │      │
│  └───────────────┘  └───────────────┘      │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.2 Options Page

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Configurações                            🌙              │
│─────────────────────────────────────────────────────────────│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  📋 Listas de Foco                                      │ │
│ │  ───────────────────────────────────────────────────    │ │
│ │  ┌─────────────────────────────────────────────────┐    │ │
│ │  │ 🍅 Pomodoro    25min focus • 5min break         │    │ │
│ │  │ [Blocklist: Redes Sociais]           ✏️ 🗑️     │    │ │
│ │  └─────────────────────────────────────────────────┘    │ │
│ │  ┌─────────────────────────────────────────────────┐    │ │
│ │  │ 📚 Estudo     45min focus • 15min break        │    │ │
│ │  │ [Whitelist: Trabalho]              ✏️ 🗑️      │    │ │
│ │  └─────────────────────────────────────────────────┘    │ │
│ │                                                         │ │
│ │  [+ Adicionar Nova Lista de Foco]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  🚫 Listas de Bloqueio                                  │ │
│ │  ───────────────────────────────────────────────────    │ │
│ │  ┌─────────────────────────────────────────────────┐    │ │
│ │  │ Redes Sociais                                    │    │ │
│ │  │ facebook.com, twitter.com, instagram.com...     │    │ │
│ │  │                                         ✏️ 🗑️    │    │ │
│ │  └─────────────────────────────────────────────────┘    │ │
│ │                                                         │ │
│ │  [+ Adicionar Nova Blocklist]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  ✅ Listas de Permissão                                 │ │
│ │  ───────────────────────────────────────────────────    │ │
│ │  ┌─────────────────────────────────────────────────┐    │ │
│ │  │ Ferramentas de Trabalho                          │    │ │
│ │  │ github.com, docs.google.com, notion.so...       │    │ │
│ │  │                                         ✏️ 🗑️    │    │ │
│   └──────────────────────────────────────────────────────┘ │
│                                                          │
│  [+ Adicionar Nova Whitelist]                            │
└─────────────────────────────────────────────────────────┘
```

#### Sync Section
```
┌─────────────────────────────────────────────────────────┐ │
│  ☁️ Sincronização                                        │ │
│  ───────────────────────────────────────────────────    │ │
│                                                          │ │
│  ┌─────────────────────────────────────────────────┐    │ │
│  │  🟢 Conectado                                    │    │ │
│  │  ultimo sincronizado: há 5 minutos              │    │ │
│  │                                                  │    │ │
│  │  ☑ Sincronização automática                    │    │ │
│  │  [Sincronizar Agora]  [Desconectar]            │    │ │
│  └─────────────────────────────────────────────────┘    │ │
│                                                         │ │
│  ┌─────────────────────────────────────────────────┐    │ │
│  │  💾 Backup Manual                                │    │ │
│  │  ───────────────────────────────────────────     │    │ │
│  │                                                  │    │ │
│  │  [📥 Exportar Dados]  [📤 Importar Dados]       │    │ │
│  │                                                  │    │ │
│  │  Formato: JSON                                  │    │ │
│  └─────────────────────────────────────────────────┘    │ │
└─────────────────────────────────────────────────────────┘
```

### 4.3 History Page

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Histórico                                   🌙           │
│─────────────────────────────────────────────────────────────│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  Resumo do Hoje                                         │ │
│ │  ───────────────────────────────────────────────────    │ │
│ │  ⏱️  2h 30m    │  🍅 4 ciclos    │  🔥 streak 7 dias   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Filtrar: [Todas ▼] [Esta Semana ▼] [🔍 Buscar]            │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │ HOJE                                                     │
│  │ ─────────────────────────────────────────────────────  │
│  │  14:30  🍅 Pomodoro    25min    ✅ Completo            │
│  │  11:00  📚 Estudo      45min    ✅ Completo            │
│  │  09:00  🍅 Pomodoro    25min    ❌ Interrompido         │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │ ONTEM                                                   │
│  │ ─────────────────────────────────────────────────────  │
│  │  16:30  📚 Estudo      45min    ✅ Completo            │
│  │  14:00  💼 Trabalho    60min    ✅ Completo            │
│  │  11:00  🍅 Pomodoro    25min    ✅ Completo            │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  [📥 Exportar para CSV]                                     │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Garden Page

```
┌─────────────────────────────────────────────────────────────┐
│ 🌿 Jardim                                   🌙      🏆       │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  🌱 42 Sementes  │  💎 15 Pedras  │  ⭐ Nível 5            │
│  ════════════════════════════════════════════════════════  │
│  ████████████████████░░░░  850/1000 XP (Nível 6)           │
│                                                             │
│  ╭───┬───┬───┬───┬───┬───┬───┬───┬───┬───╮
│  │   │   │ 🌱│   │   │ 🪨│   │   │ 🌸│   │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│  │   │ 🌱│ 🌱│   │   │   │   │ 🌲│   │   │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│  │   │   │ 🌲│ 🌲│   │   │   │   │   │ 🦋│
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│  │   │   │   │   │   │   │   │   │   │   │
│  ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┤
│  │   │   │   │   │ 🪨│   │   │   │   │   │
│  ╰───┴───┴───┴───┴───┴───┴───┴───┴───┴───╯
│                                                             │
│  Ferramentas:  [👆 Selecionar] [🌱 Plantar] [🪨 Colocar]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Achievements Modal
```
┌─────────────────────────────────────────────────────────────┐
│  🏆 Conquistas                                    X         │
│─────────────────────────────────────────────────────────────│
│                                                             │
│   ┌────────────────────────────────────────────────────────┐
│   │ 🌱  Primeiros Passos     Completa sua primeira        │
│   │      ✅ Desbloqueado       sessão de foco              │
│   └────────────────────────────────────────────────────────┘
│   ┌────────────────────────────────────────────────────────┐
│   │ 🔥  Consistency         Mantenha uma sequência         │
│   │      ✅ Desbloqueado       de 3 dias                   │
│   └────────────────────────────────────────────────────────┘
│   ┌────────────────────────────────────────────────────────┐
│   │ 🌳  Mestre do Jardim     Plante 10 árvores            │
│   │      🔒 Bloqueado         floridas                      │
│   └────────────────────────────────────────────────────────┘
│   ┌────────────────────────────────────────────────────────┐
│   │ ⏱️  Foco Profundo         Complete 500 minutos          │
│   │      🔒 Bloqueado         de foco                       │
│   └────────────────────────────────────────────────────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Stats Page

```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Estatísticas                               🌙            │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │  Estatísticas Gerais                                    │ │
│  │  ───────────────────────────────────────────────────    │ │
│  │                                                         │ │
│  │   ⏱️ Tempo Total de Foco    24h 30m                   │ │
│  │   🍅 Total de Ciclos        42                          │ │
│  │   ✅ Taxa de Conclusão     87%                         │ │
│  │   🔥 Maior Sequência       14 dias                      │ │
│  │   ⭐ Nível Atual           5                             │ │
│  │   🎖️ Conquistas           8/15                         │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │  Esta Semana                                            │ │
│  │  ───────────────────────────────────────────────────    │ │
│  │                                                         │ │
│  │    Seg   Ter   Qua   Qui   Sex   Sáb   Dom             │ │
│  │    ██   ███   ██   ███   ██    ██    ██               │ │
│  │   2h   3h   2h   3h   2h   2h   1h                    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │  Listas Mais Usadas                                     │ │
│  │  ───────────────────────────────────────────────────    │ │
│  │                                                         │ │
│  │   📚 Estudo         ████████████░░░  65%              │ │
│  │   🍅 Pomodoro       ██████░░░░░░░░░░  25%              │ │
│  │   💼 Trabalho       ██░░░░░░░░░░░░░░  10%              │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 Blocked Page

```
┌─────────────────────────────────────────────────────────────┐
│  🚫 Site Bloqueado                                          │
│                                                             │
│                                                             │
│                    🌱                                      │
│                                                             │
│              Izy Focus                                     │
│                                                             │
│         Você está no modo Foco!                            │
│                                                             │
│    Este site está bloqueado para                          │
│    manter seu foco na tarefa.                              │
│                                                             │
│    ─────────────────────────────────                       │
│                                                             │
│    💡 Quer voltar? Complete sua sessão                    │
│       ou interrompa (perderá recompensas)                  │
│                                                             │
│    [🚫 Voltar ao Trabalho]  [⚠️ Interromper Sessão]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Animations

### 5.1 Transitions

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Card hover | translateY(-2px) + shadow | 200ms | ease |
| Button press | scale(0.98) | 100ms | ease |
| Modal open | fadeIn + scale(0.95→1) | 200ms | ease-out |
| Modal close | fadeOut + scale(1→0.95) | 150ms | ease-in |
| Tab switch | fade + slide | 200ms | ease |

### 5.2 Micro-interactions

- **Button click**: ripple effect
- **Toggle**: smooth slide with color change
- **Checkbox**: check animation with bounce
- **Input focus**: border glow pulse
- **Card hover**: subtle lift effect
- **Timer progress**: smooth ring fill
- **Plant growth**: gentle sway animation
- **Streak fire**: subtle flame flicker
- **Achievement unlock**: celebration burst (particles)

### 5.3 Loading States

- Skeleton screens for async content
- Spinner for actions in progress
- Progress bar for sync operations
- Pulse animation for waiting states

---

## 6. Accessibility

### 6.1 ARIA Labels

```html
<button aria-label="Abrir configurações">
  <icon-settings />
</button>

<input aria-label="Nome da lista de foco" />

<div role="progressbar" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" />
```

### 6.2 Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons
- **Escape**: Close modals
- **Arrow keys**: Navigate menus
- **Ctrl+Shift+F**: Global shortcut to start focus

### 6.3 Focus Indicators

```css
:focus-visible {
  outline: 2px solid #10B981;
  outline-offset: 2px;
}
```

---

## 7. Responsive Behavior

### 7.1 Popup Dimensions
- Width: 360px (fixed)
- Height: auto (min 400px, max 600px)

### 7.2 Options/Stats/History Pages
- Width: 100% (full page)
- Max content width: 800px
- Centered layout with padding

---

## 8. Implementation Notes

### 8.1 Icon Implementation
All icons implemented as inline SVG with `aria-hidden="true"` for screen readers.

### 8.2 Dark Mode
Toggle stored in chrome.storage.local. Classes toggled on `document.documentElement`.

### 8.3 Sound Files
- Use Web Audio API for better control
- Preload all sounds on extension load
- Implement fade in/out for ambient sounds
- Use compressed MP3 format (< 500KB each)

### 8.4 Google Drive Sync
- OAuth 2.0 flow with popup window
- Store tokens in chrome.storage.local
- Auto-sync every 5 minutes when connected
- Manual sync button always available
- Conflict resolution: last-write-wins with timestamp
