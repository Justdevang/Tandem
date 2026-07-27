# Tandem - Real-Time Smart Restaurant Management SaaS

> A real-time restaurant management platform connecting customer ordering, live kitchen load awareness, session-isolated table billing, inventory, and AI demand forecasting. Built for **VibeAthon 6.0**.

---

## Live Demo

* **Web App:** [Placeholder for Live Demo Link]
* **Demo Video:** [Placeholder for Walkthrough Video Link]

---

## Problem

Restaurant staff constantly struggle with disconnected operations during rush hours. Orders placed at busy tables get mixed with previous dining sessions, kitchen queues overflow without customer visibility, and inventory depletion causes silent dish outages. Traditional point of sale systems operate in silos, creating delay, billing confusion, and lost revenue during peak dining hours.

---

## Solution

Tandem closes the loop with an end-to-end, real-time data chain connecting customer ordering directly to kitchen queue depth, table session isolation, stock deduction, and billing. When kitchen load spikes, higher-prep dishes are dynamically flagged to guide customer selection toward faster items. Table sessions isolate customer bills by dining session IDs, ensuring past orders never pollute new bills, while AI forecasting predicts stock velocity before items run out.

---

## User Stories Completed

- [x] **Bronze Tier (User Story 1)**: Customer Live Menu, Order Placement, Dine-in/Takeaway toggling, and Category Filtering.
- [x] **Silver Tier (User Stories 1 to 3)**:
  - Live KDS Kitchen Ticket Rail with real-time status transitions (New -> Firing -> Ready -> Served) and ticket deletion/cancellation.
  - Interactive Table Floor Management with session-isolated billing and instant status updates.
- [x] **Gold Tier (User Stories 1 to 4)**: Real-time Inventory & Stock Tracking with 5-column side-by-side grid, search box, category/status filters, and multi-criteria sorting.
- [x] **Platinum Tier (User Stories 1 to 5)**: AI Demand Forecasting & AI Chatbot Assistant powered by Google Gemini for menu recommendations and predictive inventory reordering.
- [x] **Bonus Features**:
  - **Kitchen Load Awareness System**: Live 0-100 load scoring, automated dish prep warning badges, Manager Rush Mode toggle, and Demo Rush Spike simulator.
  - **Session-Based Table Isolation**: Unique `sessionId` tracking per table dining session to prevent cross-session bill mixing.
  - **Digital Itemized Invoice & Receipt Modal**: Shareable digital receipts with live payment confirmation.
  - **1-Click Render Deployment**: Automated `render.yaml` Blueprint configuration for production hosting.

---

## Tech Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide React Icons, Vite
* **Backend:** Node.js, Express, TypeScript, Socket.IO, Mongoose
* **Database & Auth:** MongoDB, Firebase Admin SDK / Authentication
* **AI & Intelligence:** Google Gemini AI API (`@google/generative-ai`)

---

## AI Usage

Google Gemini API is integrated for two distinct operational capabilities:
1. **Predictive Inventory Reordering (`/api/ai/forecast`)**: Analyzes past order velocity and current stock levels to generate recommended reorder quantities per menu item.
2. **Conversational Menu Assistant (`ChatAssistant.tsx`)**: Constrained AI assistant that answers customer dietary questions, recommends dishes based on live stock availability, and directly populates the customer cart upon user agreement.

---

## Team & Setup Instructions

**Team Name:** Tandem

### Prerequisites
* Node.js (v18 or higher)
* npm (v9 or higher)
* MongoDB database instance (local or MongoDB Atlas)

### 1. Clone the Repository
```bash
git clone https://github.com/Justdevang/Tandem.git
cd Tandem
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd tandem-backend
npm install

# Install frontend dependencies
cd ../tandem-frontend-source
npm install
```

### 3. Environment Setup

Create `.env` in `tandem-backend/`:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/tandem
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_key
```

Create `.env` in `tandem-frontend-source/`:
```env
VITE_API_URL=http://localhost:5001
```

### 4. Seed Database & Run Locally
```bash
# Seed initial menu and table data (in tandem-backend)
cd tandem-backend
npm run seed

# Start backend dev server (port 5001)
npm run dev

# In a new terminal, start frontend dev server (port 5173)
cd tandem-frontend-source
npm run dev
```

Open `http://localhost:5173` in your browser to access the application.

---

## Screenshots

| Customer Live Menu | Live KDS Ticket Rail | 5-Column Inventory |
| --- | --- | --- |
| ![Customer Menu](https://via.placeholder.com/600x350?text=Customer+Live+Menu) | ![Kitchen Ticket Rail](https://via.placeholder.com/600x350?text=KDS+Ticket+Rail) | ![Inventory Grid](https://via.placeholder.com/600x350?text=5-Column+Inventory) |

---

## What's Next

Future enhancements include multi-branch chain analytics, automated supplier purchase order dispatch, and QR-code table self-checkout integration.
