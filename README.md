# Tandem - Real-Time Smart Restaurant Management SaaS

> An end-to-end real-time operational engine connecting customer ordering, live kitchen queue depth, session-isolated table billing, 5-column stock inventory, and AI demand forecasting. Built for **VibeAthon 6.0 (Smart Restaurant Management System PS)**.

---

## Live Demo & Deployment

* **Hosted Web Application:** [https://tandem-frontend-wzka.onrender.com](https://tandem-frontend-wzka.onrender.com)
* **Team Name:** Tandem

---

## Problem & Solution Overview

### The Problem
During peak restaurant rush hours, disconnected operational tools cause chaos between customer ordering, kitchen preparation, table allocation, and inventory tracking. Orders placed at busy tables collide with previous dining session data, kitchen queues overflow without customer visibility, and sudden ingredient stockouts result in rejected orders. Traditional Point-of-Sale (POS) systems act as static record keepers rather than active, real-time operational hubs.

### The Solution
Tandem establishes a closed-loop real-time data pipeline. An order placed by a customer automatically triggers stock deduction, updates kitchen queue depth, calculates a queue-aware prep ETA, streams ticket data to the Kitchen Display System (KDS), updates table occupancy under an isolated session ID, and compiles an itemized digital invoice.

---

## Tech Stack (Verified against repository)

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS (v3.4), Lucide React Icons, Socket.IO Client, Firebase Web SDK (v11.2), Radix UI primitives, Sonner.
* **Backend:** Node.js, Express (v4.21), TypeScript, Socket.IO (v4.8), Mongoose (v8.9), Firebase Admin SDK (v13.0), `@google/generative-ai` (v0.21).
* **Databases:**
  * **MongoDB:** Primary store for relational application data (`MenuItem`, `Order`, `Table`, `Bill`, `InventoryLog`, `Forecast`).
  * **Firebase Firestore:** User account profiles (`users/{uid}`) and cloud authorization sync.
* **Authentication:** Firebase Authentication (Email/Password & Google OAuth) with server-side Role-Based Access Control (`verifyToken`, `requireRole`).

---

## User Stories Completed Breakdown

### Bronze Tier (UI/UX Foundation)
- [x] **Digitized Live Customer Menu**: Interactive category filtering, search, dish availability indicators, prep time badges, and responsive design.
- [x] **Dine-in & Takeaway Toggling**: Seamless switching between dine-in table ordering and takeaway orders with 4-digit pickup codes.
- [x] **Cart & Order Summary Drawer**: Slide-out cart drawer with live subtotal calculation and dish customization notes.

### Silver Tier (Core Workflows & Digital Operations)
- [x] **Live KDS Kitchen Ticket Rail**: Columnar ticket rail (`New` -> `Firing` -> `Ready` -> `Served`) with real-time status transitions, elapsed timers, item notes, and ticket cancellation.
- [x] **Interactive Table Floor Management**: Real-time table grid displaying table states (`free`, `occupied`, `billing`), capacity, active order counts, and session isolation.
- [x] **Session-Isolated Table Billing**: Unique `sessionId` tracking per dining session to prevent cross-session bill mixing upon table turnover.
- [x] **Digital Itemized Receipts & Invoices**: Shareable digital receipt modal (`InvoiceModal.tsx`) with 5% GST and 5% service charge breakdown, invoice numbers, and payment status.

### Gold Tier (Management Dashboard & Operations)
- [x] **5-Column Real-Time Inventory Grid**: Comprehensive stock table tracking `Item`, `Category`, `Current Stock`, `Threshold`, and `Status/Action` with search, filtering (`In Stock`, `Low Stock`, `86'd`), and 1-click restock with instant menu sync.
- [x] **Billing Audit Log & History**: Full record of paid/unpaid bills with search by invoice/table ID and payment settlement controls.
- [x] **Live Performance Analytics Dashboard**: 5 KPI stat cards (7-day revenue, total orders, average ticket size, table turn rate, kitchen prep velocity), weekly revenue bar chart, top 5 bestselling dishes ranking, and peak rush insights.

### Platinum Tier (Intelligent & Advanced Systems)
- [x] **AI Demand Forecasting (`/api/ai/forecast`)**: Powered by Google Gemini AI, analyzing order velocity and stock logs to predict 48-hour ingredient demand and suggest reorder quantities.
- [x] **AI Conversational Assistant (`ChatAssistant.tsx`)**: Constrained Gemini-powered menu assistant answering customer dietary questions, recommending dishes based on live stock, and parsing user actions (`[ACTION:ADD_TO_CART]`, `[ACTION:PLACE_ORDER]`).
- [x] **Kitchen Load & Rush Mode Engine**: Live 0-100% kitchen load calculation, automated high-load dish prep warning badges, Manager Rush Mode override, and Demo Rush Spike simulator.

---

## AI Integration Details

Google Gemini API (`@google/generative-ai`) is integrated into two primary capabilities:

1. **Predictive Inventory Reordering (`/api/ai/forecast`)**:
   - Analyzes recent `InventoryLog` consumption data and current stock levels.
   - Formulates structured prompt payloads sent to `gemini-2.0-flash`.
   - Returns predicted 48-hour demand numbers and recommended reorder quantities per menu item, storing results in the `Forecast` collection. Includes an automatic heuristic fallback model if the AI API key is omitted.

2. **Conversational Menu Assistant (`ChatAssistant.tsx` & `/api/ai/assistant`)**:
   - Menu-constrained AI assistant provided with live in-stock item context.
   - Answers guest questions regarding ingredients, spice levels, and dietary preferences.
   - Parses intent and appends executable action tokens (`[ACTION:ADD_TO_CART]`, `[ACTION:PLACE_ORDER]`) to automatically populate the customer cart or trigger checkout upon user agreement.

---

## Key Implemented Components

* **`CustomerMenu.tsx`**: Customer-facing live menu, filtering, dine-in/takeaway toggles, cart drawer, receipt modal.
* **`TicketRail.tsx`**: KDS kitchen ticket rail with `New`, `Firing`, and `Ready` columns and ticket actions.
* **`TablesFloor.tsx`**: Floor management map showing table capacity, occupancy states, and active session IDs.
* **`InventoryPanel.tsx`**: 5-column stock management grid with live low-stock warnings and 1-click restocking.
* **`BillingHistoryPanel.tsx`**: Audit trail of restaurant bills with search, status filters, and payment settlement.
* **`AnalyticsPanel.tsx`**: Performance charts, 7-day revenue trend bar chart, top-selling items ranking, and key operational metrics.
* **`ChatAssistant.tsx`**: Gemini AI interactive chat interface for customer dish recommendations and cart ordering.
* **`StaffDashboard.tsx`**: Tabbed staff hub containing kitchen load controls, live queue score badge, and manager Rush Mode toggle.

---

## Demo Credentials (Staff Access)

* **Email:** `staff@tandem.app`
* **Password:** `staff123`

*(These credentials grant instant access to the Staff Dashboard for testing and live evaluation.)*

---

## Local Setup & Installation

### 1. Prerequisites
* Node.js (v18 or higher)
* npm (v9 or higher)
* MongoDB instance (local or MongoDB Atlas)

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/Justdevang/Tandem.git
cd Tandem

# Install backend dependencies
cd tandem-backend
npm install

# Install frontend dependencies
cd ../tandem-frontend-source
npm install
```

### 3. Environment Variables

Create `.env` in `tandem-backend/`:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/tandem
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

Create `.env` in `tandem-frontend-source/`:
```env
VITE_API_URL=http://localhost:5001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
```

### 4. Seed Database & Run
```bash
# Seed initial menu and floor data (in tandem-backend)
cd tandem-backend
npm run seed

# Start backend server
npm run dev

# In a separate terminal, start frontend dev server
cd tandem-frontend-source
npm run dev
```
Open `http://localhost:5173` in your browser.
