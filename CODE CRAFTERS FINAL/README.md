# MedicChain Logistics – Decentralized Healthcare Logistics Prototype

MedicChain Logistics is a **single‑page web prototype** that demonstrates a decentralized, blockchain‑inspired healthcare logistics network for critical medical supplies (vaccines, diagnostics, blood, biological samples, and emergency equipment).

The system models:

- **Blockchain‑based recording** of logistics events (shipments, bids, contracts, telemetry, proof‑of‑delivery)
- **Smart‑contract style flows** for bidding, provider selection, dispatch, and payout
- **Role‑based access control** for all major stakeholders
- **Real‑time style dashboards** and immutable audit trail visualizations

> This is a **front‑end only** academic prototype. The blockchain is simulated fully in the browser and persisted to `localStorage`; no wallet, tokens, or external blockchain network is required.

## 1. Features vs. Requirements

- **Blockchain recording of logistics transactions**  
  - `blockchain.js` implements a hash‑linked ledger (`MedicChainLedger`) storing each event as a block.
  - Blocks are persisted in `localStorage` and rendered in the **Blockchain Ledger** section.

- **Smart contracts for logistics agreements**  
  - Creating/updating shipments and providers, opening shipments for bids, accepting bids, dispatching drivers, and confirming deliveries all append new blocks with structured payloads.

- **Transport provider bidding & automated selection**  
  - Providers register in the **Transport Providers** section (CRUD).  
  - For shipments opened for bidding, providers submit bids with price, ETA, and vehicle features.  
  - A composite score (reliability + ETA) is calculated for each bid to assist automated selection.  
  - Accepting a bid simulates smart‑contract agreement & driver dispatch.

- **Driver dispatch & pickup / delivery verification**  
  - When a bid is accepted, the shipment status goes to `in_transit` and blocks `CONTRACT_ACCEPTED` and `DRIVER_DISPATCHED` are created.  
  - Status changes to `delivered` record `SHIPMENT_DELIVERED` and `PAYOUT_SETTLED` events, acting as **proof‑of‑delivery and auto‑settlement**.

- **Real‑time shipment tracking & monitoring**  
  - Dashboard shows **Active Shipments**, **On‑chain Events**, and simulated **Cold‑Chain Telemetry** (IoT‑style).  
  - Lifecycle view in **Bids & Contracts** displays per‑shipment on‑chain events as a timeline.

- **Role‑based access control**  
  - Role selector in the header with roles:
    - Pharmaceutical Manufacturer
    - Medical Distribution Center
    - Hospital / Healthcare Facility
    - Diagnostic Laboratory
    - Licensed Transport Provider
    - Healthcare Administrator
  - Each role has specific permissions (e.g. only Transport Providers can submit bids; only Hospital/Lab can confirm delivery; Admin can delete).

- **Secure proof‑of‑delivery & immutable audit trail**  
  - Delivery confirmation triggers dedicated blocks.  
  - All blocks are hash‑linked and validated in memory to illustrate immutability.

- **Dashboard for monitoring shipments & transactions**  
  - Modern dashboard UI shows KPIs, recent blockchain events, live‑style telemetry, and navigation into CRUD views.

## 2. Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript**
- No external build step is required; all files are directly loadable in the browser.
- Fonts and icons are loaded from public CDNs (Google Fonts, Font Awesome).
- Open‑source images are referenced from **Pexels/Unsplash** via HTTPS URLs.

## 3. Project Structure

- `index.html` – Main single‑page app shell, navigation, and sections.
- `styles.css` – Modern dark‑theme UI styling, responsive layout, and components.
- `blockchain.js` – Simple browser‑side blockchain/ledger implementation.
- `app.js` – Application state, CRUD logic, role‑based controls, and rendering.
- `package.json` – Minimal metadata so the project can be managed with Node if desired.

## 4. Running the Prototype

You can run the application in **two simple ways**:

### Option A – Open `index.html` directly

1. Navigate to the project directory:
   - `c:\Users\ajays\CODE CRAFTERS FINAL\`
2. Double‑click `index.html` or open it from your browser (Chrome / Edge):
   - Drag & drop `index.html` into the browser, or
   - Use `File → Open` in the browser.

> All data is stored in the browser's `localStorage`. Refreshing the page preserves your mock blockchain and entities until you clear site data.

### Option B – Run a lightweight static server (optional)

If you have Node.js installed:

```bash
cd "c:\Users\ajays\CODE CRAFTERS FINAL"
npx serve .
```

Open the printed `http://localhost:3000` (or similar) URL in your browser.

## 5. Typical Scenario Walkthrough

1. **Admin / Distribution Center**  
   - Choose `Medical Distribution Center` as role.  
   - Go to **Shipments** and create a new **vaccine transport** request.  
   - Click **Open for Bids** on the created shipment.

2. **Transport Provider**  
   - Switch role to `Licensed Transport Provider`.  
   - Go to **Transport Providers** and register your company.  
   - Go to **Bids & Contracts**, select an open shipment, and submit a bid (price, ETA, vehicle features).

3. **Hospital / Administrator**  
   - Switch role to `Hospital / Healthcare Facility` or `Healthcare Administrator`.  
   - From **Bids & Contracts**, review bids and click **Accept** on the best option.  
   - This sets shipment status to `In Transit` and adds on‑chain blocks for agreement & dispatch.

4. **Driver & Delivery Confirmation**  
   - As `Licensed Transport Provider`, mark the shipment **In Transit** (if needed).  
   - As `Hospital / Healthcare Facility`, mark the shipment **Delivered** in the **Shipments** tab, which creates **proof‑of‑delivery** and **payment settlement** entries on the blockchain.

5. **Audit & Monitoring**  
   - From the **Dashboard**, see key metrics and recent events.  
   - From **Blockchain Ledger**, inspect block details (hashes, payload, previous hash) for a complete immutable audit trail.

## 6. Notes & Limitations

- This is a **single‑browser simulation**; there is no real multi‑party network.
- Cryptographic hashing is simplified for clarity and educational purposes.
- Reliability score updates over time are illustrated conceptually through the UI; advanced scoring logic can be extended in `app.js`.

## 7. License / Attribution

- This prototype is intended for **academic and demonstration purposes** (coursework / project).  
- Image assets are taken from **Pexels** and **Unsplash** using their free‑to‑use URLs (see footer links in the UI).

