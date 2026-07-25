# Tandem — Restaurant OS

> A restaurant management SaaS where inventory, live menu availability, kitchen order tickets, and billing form one connected real-time system. When stock drops to zero, the item is automatically marked unavailable everywhere — customer menu, kitchen display, dashboard — via WebSocket push.

## Team
**Team Name:** Tandem  
**Hackathon:** VibeAthon 6.0

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **Auth** | Firebase Auth (email/password, Google OAuth) |
| **AI** | Google Gemini API (2.0 Flash) |
| **Deployment** | Vercel (frontend), Render (backend), MongoDB Atlas |

## User Stories Completed

### 🥉 Bronze — Core Functionality
- [x] Customer-facing live menu with category filtering
- [x] Staff dashboard with tabbed views (Tickets / Tables / Inventory / Analytics)
- [x] Order placement from customer menu
- [x] Kitchen ticket rail with kanban columns (New / Firing / Ready)
- [x] User authentication (email/password + Google OAuth)

### 🥈 Silver — Real-Time Connected System
- [x] **The Core Chain:** Order → stock decrement → auto-86 → ticket creation — all via WebSocket push
- [x] Real-time menu availability: items go 86'd the instant stock hits zero
- [x] Real-time ticket updates: staff see new orders appear instantly
- [x] Ticket status progression: New → Firing → Ready → Served
- [x] Real-time table status tracking

### 🥇 Gold — Full Restaurant Operations
- [x] Inventory management with stock levels and reorder thresholds
- [x] Restocking flow: restock an 86'd item → it reappears on customer menu in real-time
- [x] Billing system: generate bills from orders, mark as paid, free tables
- [x] Analytics dashboard: revenue by day, top items, average ticket, table turns
- [x] Role-based access control (customer / staff / admin)

### 🏆 Platinum — AI-Powered Features
- [x] **Gemini demand forecasting:** Analyzes order history and stock velocity to predict demand and suggest reorder quantities
- [x] **Gemini ordering assistant:** Menu-constrained chat that only recommends dishes currently available on the live menu

### ⭐ Bonus
- [x] Automatic table status management (occupied on order, billing on served, free on payment)
- [x] Inventory logging with full audit trail (order decrements, restocks, adjustments)

## AI Usage

### Gemini Demand Forecasting
The `GET /api/ai/forecast` endpoint reads `InventoryLog` history per menu item, calculates consumption velocity over the last 7 days, and sends this data to **Gemini 2.0 Flash** with a structured prompt requesting predicted demand and reorder quantities. Results are stored in a `Forecast` collection and displayed in the Inventory panel's "Reorder Suggestions · AI" section. Staff can one-click approve a suggestion to automatically restock.

### Gemini Ordering Assistant
The `POST /api/ai/assistant` endpoint passes the **live menu JSON** (with current availability) as context to Gemini, with strict instructions to only recommend dishes that are actually on the menu and in stock. This prevents the AI from inventing items. The assistant appears as a lightweight chat bubble on the customer menu screen.

**Both AI features include heuristic fallbacks** that work when no Gemini API key is configured, ensuring the app functions end-to-end regardless.

## Hosted Application

| Service | URL |
|---------|-----|
| **Frontend** | *deployed on Vercel — add URL* |
| **Backend** | *deployed on Render — add URL* |

## GitHub Repository
*Add your public GitHub repo URL here*

## Scalability — Multi-Tenancy

Tandem can scale to multiple restaurant tenants by adding a `restaurantId` field to every MongoDB collection (MenuItem, Order, Table, InventoryLog, Bill, Forecast, User). Each query would filter by `restaurantId`, and the API routes would extract the tenant from the authenticated user's profile. This is a field-level change — no architectural redesign needed. Combined with MongoDB Atlas's built-in sharding and replica sets, this approach supports hundreds of restaurant tenants on the same infrastructure, with each tenant's data fully isolated.
