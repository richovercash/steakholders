# Steakholders Product Roadmap

> Last Updated: 2025-12-23

## Vision

Connect small farms with local processors and consumers, solving the butcher bottleneck while enabling direct farm-to-table sales.

---

## Strategic Overview

### The Two-Sided Opportunity

| Stakeholder | Pain Point | Our Solution |
|-------------|------------|--------------|
| **Processors** | Scheduling chaos, paper cut sheets, no-shows | Digital booking, waitlists, workflow tools |
| **Producers** | Can't get processing appointments, struggle to sell | Guaranteed slots, direct sales marketplace |
| **Consumers** | Want local meat, can't find it | Searchable inventory, direct purchasing |

### Go-to-Market Strategy

**Phase 1: Capture the Chokepoint (Processors)**
Processors are the bottleneck. Win them first, and producers will follow to get appointments.

**Phase 2: Empower Producers (Marketplace)**
Once we have processor relationships, enable producers to sell direct - putting money in struggling small farms' hands.

**Phase 3: Scale (Operations & Network Effects)**
Advanced processor tools, multi-region expansion, consumer subscriptions.

---

## Phase 1: Scheduling Platform (Current)

**Goal:** Become the essential booking tool for small/mid processors

**Target Users:** Processors (primary), Producers (secondary)

**Revenue:** Free during growth phase

### 1.1 Core Scheduling ✅ Complete
- [x] Processor calendar with capacity slots
- [x] Producer booking flow
- [x] Order management
- [x] Cut sheet builder
- [x] Messaging between parties
- [x] Notifications

### 1.2 Waitlist System 🔄 In Progress
- [ ] Join waitlist when slots full
- [ ] View/manage waitlist entries
- [ ] Notification when slot opens
- [ ] 24-hour claim window
- [ ] FIFO queue management

**Future Enhancements (post-MVP):**
- Waitlist spot trading between producers
- Per-producer waitlist limits
- Priority tiers for repeat customers

### 1.3 Order Enhancements 📋 Planned
- [ ] Batch animals per order (multiple livestock, same cut sheet)
- [ ] Segregate orders by animal type
- [ ] Apply saved cut sheet template to new orders
- [ ] Animal-type-aware cut sheet (only show relevant options)

### 1.4 Cut Sheet Templates 📋 Planned
- [ ] Processor-defined custom cut sheets
- [ ] Default templates per animal type
- [ ] Custom options/add-ons
- [ ] Pricing per cut option (for Phase 2 billing)

---

## Phase 2: Processor Operations

**Goal:** Make Steakholders indispensable for day-to-day processor operations

**Target Users:** Processors (staff, floor workers)

**Revenue:** Free for first 500 processors, then tiered pricing

### 2.1 Multi-User Accounts
- [ ] Multiple logins per organization
- [ ] Role-based permissions (admin, staff, floor worker)
- [ ] Activity logging per user

### 2.2 Workflow & Job Tracking
- [ ] Order status progression (received → in-progress → aging → packaged → ready)
- [ ] Tablet-friendly interface for floor use
- [ ] QR/barcode scanning for job lookup
- [ ] Stage timestamps and notes

### 2.3 Label Printing
- [ ] Generate QR codes / barcodes per order
- [ ] Label templates (package labels, box labels)
- [ ] Printer integration (thermal, standard)
- [ ] Batch print for orders

### 2.4 Billing & Payments (Processor → Producer)
- [ ] Processor fee schedules (kill fee, cut fees, packaging, storage)
- [ ] Invoice generation from orders
- [ ] Stripe Connect integration
- [ ] Producer payment portal
- [ ] Platform fee (1-5%)

### 2.5 Data Management
- [ ] CSV/XLSX export (orders, customers, revenue)
- [ ] PDF reports (invoices, summaries)
- [ ] Animal data import (from farm management software)
- [ ] Google Sheets sync (optional)

---

## Phase 3: Producer Marketplace

**Goal:** Enable direct sales from producers to consumers/restaurants

**Target Users:** Producers (sellers), Restaurants & Consumers (buyers)

**Revenue:** Transaction fee (1-5%), Restaurant subscriptions

### 3.1 Inventory System
- [ ] Product listings from processed orders
- [ ] Inventory tracking (available, reserved, sold)
- [ ] Product attributes:
  - Animal type, cut type
  - Weight, price per lb
  - Farm of origin, region
  - Feed type (grass/grain/mixed)
  - Age, breed
  - Processing date, processor
  - Certifications (organic, humane, etc.)

### 3.2 Third-Party Buyer Portal
- [ ] Separate login experience for buyers
- [ ] Search/filter inventory
- [ ] Farm/producer profiles
- [ ] Shopping cart
- [ ] Saved favorites

### 3.3 Producer Storefronts
- [ ] Public producer profile page
- [ ] Shareable link for marketing
- [ ] Custom branding options
- [ ] Embedded in producer's own website (optional)

### 3.4 Checkout & Payments
- [ ] Stripe checkout
- [ ] Split payments (producer gets funds, platform fee deducted)
- [ ] Shipping rate calculation
- [ ] Local pickup option
- [ ] Special handling (dry ice, refrigerated)

### 3.5 Shipping & Fulfillment
- [ ] Shipping label generation
- [ ] Carrier integration (UPS, FedEx, USPS)
- [ ] Tracking updates
- [ ] Ship from producer OR processor

### 3.6 Subscription/Recurring Orders
- [ ] CSA-style meat boxes
- [ ] Restaurant recurring orders
- [ ] Flexible scheduling

---

## Phase 4: Scale & Network Effects

**Goal:** Become the industry standard platform

### 4.1 Third-Party Processors
- [ ] Processor-to-processor subcontracting
- [ ] Overflow routing
- [ ] Specialized service referrals (smoking, curing, etc.)

### 4.2 Advanced Analytics
- [ ] Processor utilization dashboards
- [ ] Regional demand forecasting
- [ ] Producer sales analytics
- [ ] Market pricing trends

### 4.3 Mobile Apps
- [ ] iOS/Android for producers
- [ ] Processor floor app (tablet-optimized)
- [ ] Consumer marketplace app

### 4.4 API & Integrations
- [ ] Public API for farm management software
- [ ] QuickBooks/accounting integration
- [ ] POS system integration for processors

---

## Technical Architecture Evolution

### Current State (Phase 1)
```
┌─────────────┐     ┌─────────────┐
│  Producers  │────▶│  Processors │
└─────────────┘     └─────────────┘
       │                   │
       └───────┬───────────┘
               ▼
        ┌─────────────┐
        │  Supabase   │
        │  (Postgres) │
        └─────────────┘
```

### Phase 2 Additions
```
┌─────────────┐     ┌─────────────┐
│  Producers  │────▶│  Processors │
└─────────────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │ Floor Staff │
       │            │  (tablets)  │
       │            └──────┬──────┘
       └───────┬───────────┘
               ▼
        ┌─────────────┐     ┌─────────────┐
        │  Supabase   │────▶│   Stripe    │
        │  (Postgres) │     │  (Connect)  │
        └─────────────┘     └─────────────┘
```

### Phase 3 Additions
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Producers  │────▶│  Processors │     │   Buyers    │
└─────────────┘     └─────────────┘     │ (consumers, │
       │                   │            │ restaurants)│
       │                   │            └──────┬──────┘
       │                   │                   │
       └───────┬───────────┴───────────────────┘
               ▼
        ┌─────────────┐     ┌─────────────┐
        │  Supabase   │────▶│   Stripe    │
        │  + Storage  │     │  (Connect)  │
        └─────────────┘     └─────────────┘
               │
               ▼
        ┌─────────────┐
        │  Shipping   │
        │    APIs     │
        └─────────────┘
```

---

## Database Evolution

### Phase 1 (Current)
- `organizations` (producer | processor)
- `users`
- `calendar_slots`
- `processing_orders`
- `cut_sheet_data`
- `waitlist_entries`
- `messages`
- `notifications`

### Phase 2 Additions
- `organization_members` (multi-user with roles)
- `order_stages` (workflow tracking)
- `invoices`
- `invoice_line_items`
- `payments`
- `processor_fee_schedules`

### Phase 3 Additions
- `inventory_items`
- `product_listings`
- `buyer_profiles`
- `shopping_carts`
- `marketplace_orders`
- `shipments`
- `producer_storefronts`

---

## Pricing Model

| User Type | Phase 1 | Phase 2 | Phase 3 |
|-----------|---------|---------|---------|
| Producers | Free | Free | Free |
| Processors (1-500) | Free | Free | Free |
| Processors (500+) | - | Tiered | Tiered |
| Restaurants | - | - | Subscription |
| Consumers | - | - | Free |

**Transaction Fees:**
- Processor → Producer payments: 1-5% platform fee
- Marketplace sales: 1-5% platform fee

---

## Success Metrics

### Phase 1
- [ ] 10 active processors
- [ ] 50 active producers
- [ ] 100 orders processed through platform

### Phase 2
- [ ] 50 processors using workflow tools
- [ ] $100k in invoices processed
- [ ] 90% of orders use digital cut sheets

### Phase 3
- [ ] $500k in marketplace GMV
- [ ] 100 restaurant subscribers
- [ ] 1000 consumer accounts

---

## Current Sprint Focus

**Completing Phase 1.2: Waitlist System**

1. Server actions (CRUD for waitlist entries)
2. Producer waitlist page
3. "Join Waitlist" integration with booking
4. Processor waitlist visibility
5. Notification on slot availability

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-23 | Processors first, then marketplace | Processors are chokepoint; winning them brings producers |
| 2025-12-23 | Free for producers always | Lower barrier, producers are struggling |
| 2025-12-23 | Stripe Connect for payments | Industry standard, handles split payments |
| 2025-12-23 | Waitlist trading deferred | Core waitlist first, trading adds complexity |

---

## Open Questions

1. **Waitlist trading:** Direct transfer vs. open marketplace?
2. **Processor pricing tiers:** What features gate each tier?
3. **Restaurant subscriptions:** Monthly flat fee vs. transaction-based?
4. **Multi-region:** When to expand beyond initial region?
5. **Mobile apps:** PWA vs. native? When?

---

## Appendix: Feature Dependencies

```
Phase 1.2 Waitlist
    └── Phase 1.3 Order Enhancements (batch orders)
           └── Phase 1.4 Cut Sheet Templates
                  └── Phase 2.4 Billing (pricing per cut)
                         └── Phase 3.1 Inventory (processed orders → listings)
                                └── Phase 3.4 Checkout
```

Multi-user accounts (2.1) can be built in parallel.
Workflow tracking (2.2) depends on order status system.
Label printing (2.3) can be built standalone.
