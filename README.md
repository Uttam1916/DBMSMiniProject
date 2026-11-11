# Smart Campus Lost-and-Found Item Matching System
### DBMS Experiential Learning – Level 3 Final Project

**Course:** Database Management Systems (Experiential Learning Level 3)  
**Repository:** [https://github.com/Uttam1916/DBMSMiniProject](https://github.com/Uttam1916/DBMSMiniProject)  
**Database Paradigms:** Relational (PostgreSQL 16) + Vector Database (pgvector HNSW)  
**Web Framework:** Next.js 14 (App Router, TypeScript, Tailwind CSS)  
**Embeddings:** FastEmbed ONNX (`sentence-transformers/all-MiniLM-L6-v2`, 384 dimensions)  

---

 **Uttam K R**  *PES1UG22CS681* 
---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Web Client                   │
│   (Browse Items, My Activity, Review Claims,           │
│    Item Details with Potential Matches, Modals)        │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼────────────────────────────┐
│              Next.js Route Handlers (API)              │
│   /api/items, /api/claims, /api/search/semantic,       │
│   /api/queries/run, /api/meta, /api/demo/reset         │
└─────────────┬────────────────────────────┬─────────────┘
              │ Subprocess / CLI           │ Pool Client
┌─────────────▼─────────────┐   ┌──────────▼─────────────┐
│    FastEmbed ONNX CPU     │   │     PostgreSQL 16      │
│  all-MiniLM-L6-v2 (384-d) │   │     with pgvector      │
└───────────────────────────┘   │                        │
                                │ • Relational Tables    │
                                │ • HNSW Vector Index    │
                                │ • PL/pgSQL Triggers    │
                                │ • Database Views       │
                                │ • Stored Procedures    │
                                └────────────────────────┘
```

---

## 1. Quick Start: How to Run Everything

### Prerequisites
- Docker (for PostgreSQL 16 + pgvector)
- Node.js 18+ & npm
- Python 3.10+ (for FastEmbed CPU ONNX runner)

### Step 1: Start PostgreSQL with pgvector (Docker)
Ensure your PostgreSQL container is running:
```bash
docker start campus_postgres
```
*(If setting up a fresh container)*:
```bash
docker run -d --name campus_postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=campus_lost_found \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### Step 2: Initialize Database Schema & Seed Data
Execute the self-contained setup script. This creates all extensions, tables, constraints, indexes, triggers, views, stored functions, and pre-seeds all 10 baseline items with their 384-dimensional vector embeddings, matches, and claims:
```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found < campus_lost_found_setup.sql
```

### Step 3: Run the Next.js Web Application
Install dependencies and launch the development server:
```bash
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

To build and run for production:
```bash
npm run build
npm run start
```

---

## 2. Comprehensive Final Presentation & Live Demo Guide

Follow this step-by-step demonstration sequence during the final project evaluation with the TA / Instructor:

### Step 1: Institutional Header & Role Authentication
1. Point out the institutional top navigation header displaying system status and database paradigm (`PostgreSQL 16 + pgvector`).
2. Demonstrate the user session control in the top right:
   - Click the user profile button to view the active user and role badge.
   - Click **"Switch User"** to open the authentication modal.
   - Switch between **Demo Student** (`student@campus.edu`), **Demo Staff** (`staff@campus.edu`), and **Demo Admin** (`admin@campus.edu`).
   - Notice that navigation tabs and action permissions adapt dynamically (e.g., the **"Review Claims"** tab is visible to Staff and Admin).

### Step 2: Browse Items & Multi-Criteria Filtering
1. Open the **Browse Items** view.
2. Demonstrate real-time multi-predicate relational filtering:
   - Toggle between **All Items**, **Lost Only**, and **Found Only**.
   - Filter by **Category** (`Electronics`, `Bags`, `Stationery`, `Personal Items`).
   - Filter by **Location** (`Central Library`, `Campus Cafeteria`, `Academic Block A`).
   - Filter by **Date Reported** (`Any Date`, `Today`, `This Week`, `This Month`).
   - Filter by **Status** (`All Statuses`, `Open`, `Claimed`, `Resolved`).
   - Enter search keywords to filter across titles and descriptions in real time.
3. Note the count badges indicating items with candidate matches.

### Step 3: Item Details & Unconfirmed Potential Matches
1. Click on any lost item (e.g., *"Black stainless-steel bottle"*).
2. The item detail modal opens, showing complete item details: category, location, date, reporter email, and status.
3. Highlight the **Potential Matches** section:
   - Candidate found items are surfaced directly inside the lost item's details.
   - For each candidate, the UI displays the matching found item title, description, location, date, and a clean similarity score (e.g., `75% similarity`).
   - Suggestions are clearly labeled as **Potential Matches (Unconfirmed)** rather than automated assumptions.
   - A direct **"Claim this found item"** button allows immediate claim initiation.

### Step 4: Report Lost / Found Item with On-the-Fly Vectorization
1. Click the primary **"Report Item"** button in the header.
2. Select whether reporting a **Lost Item** or **Found Item**.
3. Fill in title, category, campus location, date, and detailed description.
4. Click **Submit Report**:
   - The Next.js backend generates a 384-dimensional dense vector via FastEmbed ONNX (`sentence-transformers/all-MiniLM-L6-v2`).
   - The item is inserted into PostgreSQL `item(embedding)` with the vector attribute.
   - Candidate pairings in `item_match` are automatically refreshed via `CROSS JOIN LATERAL find_matching_items(...)`.

### Step 5: Student Activity & Ownership Claims with Proof
1. Switch to the **Demo Student** account.
2. Click the **"My Activity"** tab.
3. Review personal records separated into:
   - **My Reported Items**: Shows all items reported by the logged-in student with live status badges.
   - **My Claims**: Shows all claims submitted by the student, along with the submitted proof of ownership, approval status, and claim collection instructions.
4. Click **"Submit a Claim"** on any open found item:
   - Provide verifiable proof of ownership (e.g., unique serial number, lock screen wallpaper, specific scratches or stickers).
   - Database trigger `validate_claim_item` ensures claims can only be submitted against open found items.

### Step 6: Staff Claims Review & ACID Trigger Synchronization
1. Switch to the **Demo Staff** or **Demo Admin** account.
2. Click the **"Review Claims"** tab (displays a pending count badge).
3. The queue displays all pending claims along with the claimant's identity, contact email, and detailed ownership proof.
4. On Claim #1, click **"Approve Claim"**:
   - An ACID transaction executes with row-level locking (`FOR UPDATE`).
   - PostgreSQL trigger `sync_item_status_after_claim` automatically mutates the item status from `OPEN` to `CLAIMED` in the same atomic transaction.
   - A live transaction commitment banner appears showing `item_status_before: OPEN` -> `item_status_after: CLAIMED`.
   - The database partial unique index `idx_one_approved_claim_per_item` ensures no conflicting claim can ever be approved for this item.

### Step 7: Database & System Tools Evaluation Modal
1. Click the discreet **"Database Tools"** link in the header.
2. This modal contains the technical evaluation instruments for examiners:
   - **Interactive SQL Console**: Execute all 11 Level 3 demonstration queries directly against live PostgreSQL with millisecond execution profiling. Run custom ad-hoc `SELECT` queries.
   - **Semantic vs Keyword Comparison**: Enter test queries (e.g., *"black water bottle with metal cap"*) to demonstrate how vector cosine similarity finds *"Dark metal water bottle"* (~0.75 score) where relational `ILIKE` returns 0 results due to vocabulary mismatch.
   - **ER & Relational Schemas**: High-resolution interactive view of the ER Diagram and 3NF Relational Schema.
   - **One-Click Demo Reset**: Restore the database to its pristine baseline state in 1 second.

---

## 3. Terminal Demonstration (CLI SQL Execution)

To execute the entire demonstration query suite directly from the command line:

```bash
docker exec -i campus_postgres psql -U postgres -d campus_lost_found < demo_queries.sql
```

---

## 4. Database Design & Data Dictionary

### Tables & Relationships

| Table | Primary Key | Foreign Keys & Cascade Rules | Domain Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`users`** | `user_id` | None | `email UNIQUE`, `CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))` | Campus accounts authorized to report items or file claims. Passwords hashed via pgcrypto. |
| **`category`** | `category_id` | None | `name UNIQUE` | Taxonomy (`Electronics`, `Bags`, `Stationery`, `Personal Items`). |
| **`location`** | `location_id` | `parent_location_id -> location(location_id) ON DELETE SET NULL` | `name UNIQUE` | Campus zones with recursive parent-child hierarchy (`Library`, `Cafeteria`, `Block A`, sub-zones). |
| **`item`** | `item_id` | `reported_by -> users`, `category_id -> category`, `location_id -> location` (`ON DELETE RESTRICT`) | `item_type CHECK ('LOST', 'FOUND')`, `status CHECK ('OPEN', 'CLAIMED', 'RESOLVED', 'CLOSED')`, `embedding VECTOR(384)` | Central inventory of belongings with 384-d dense vectors indexed via HNSW. |
| **`item_match`** | `(lost_item_id, found_item_id)` | `lost_item_id -> item(item_id) ON DELETE CASCADE`, `found_item_id -> item(item_id) ON DELETE CASCADE` | `similarity_score CHECK (-1 TO 1)`, `match_status CHECK ('SUGGESTED', 'ACCEPTED', 'REJECTED')`, `lost_item_id <> found_item_id` | Candidate lost-found pairings with cosine similarity scores. |
| **`claim`** | `claim_id` | `claimed_by -> users`, `item_id -> item` (`ON DELETE RESTRICT`) | `claim_status CHECK ('PENDING', 'APPROVED', 'REJECTED')`, Partial Unique Index `idx_one_approved_claim_per_item` | Ownership claims filed against found items backed by identifying proof. |

---

## 5. Advanced DBMS Concepts Demonstrated

1. **Relational Constraints & 3NF Normalization**: Primary keys, composite primary keys, foreign keys with restrict/cascade, domain check constraints, partial unique index.
2. **Database Views**:
   - `item_details_view`: Unified projection joining `item`, `users`, `category`, and `location`.
   - `pending_claims_view`: Pre-joined administrative review queue.
3. **PL/pgSQL Stored Function**:
   - `find_matching_items(lost_item_id, limit)`: Encapsulates vector similarity calculation using cosine distance `<=>`.
4. **PL/pgSQL Database Triggers**:
   - `sync_item_status_after_claim`: Mutates item status to `CLAIMED` when a claim is approved, or `OPEN` when revoked.
   - `validate_claim_item`: Guarantees claims can only be filed against `OPEN` `FOUND` items.
   - `validate_item_match_types`: Validates that match pairings strictly pair `LOST` items with `FOUND` items.
5. **ACID Concurrency & Transactions**:
   - Explicit `BEGIN ... COMMIT` blocks with `FOR UPDATE` row-level locking.
6. **Recursive Query (`WITH RECURSIVE`)**:
   - Hierarchical traversal of campus zone tree computing path strings, depth levels, and aggregate item distributions.
7. **Common Table Expression (CTE)**:
   - Multi-stage CTE categorizing items into `HIGH_CONFIDENCE`, `MEDIUM_CONFIDENCE`, and `LOW_CONFIDENCE` tiers.
8. **Subqueries**:
   - Nested subquery with `IN` and `HAVING`.
   - Correlated subquery with `EXISTS` and scalar subquery.
9. **Vector Database / Semantic Search**:
   - Dense text vectors (384-d) from FastEmbed ONNX model (`sentence-transformers/all-MiniLM-L6-v2`).
   - Hierarchical Navigable Small World (**HNSW**) vector index with `vector_cosine_ops`.
   - Cosine distance similarity operator `<=>`.
10. **Role-Based Access Control (RBAC)**:
    - Minimum 2 roles (3 implemented: Student, Staff, Admin) enforced both in the UI and via API Route Handlers.

---

## 6. Project Directory Structure

```
DBMSmini/
├── .env.example                         # Environment configuration template
├── .env.local                           # Local PostgreSQL connection parameters
├── .gitignore                           # Git ignore rules
├── campus_lost_found_setup.sql          # Master SQL setup (DDL, triggers, views, functions, data)
├── demo_queries.sql                     # All 15 demonstration & evaluation queries
├── next.config.mjs                      # Next.js configuration
├── package.json                         # Node dependencies & execution scripts
├── package-lock.json                    # Dependency lockfile
├── postcss.config.mjs                   # Tailwind CSS PostCSS plugin
├── PROJECT_REPORT.md                    # Formal Academic Level 3 Report (8 required sections)
├── public/
│   ├── lost_found_ER.png                # Public asset ER diagram
│   └── lost_found_relational_schema.png # Public asset Relational diagram
├── README.md                            # Complete setup guide & presentation manual
├── scripts/
│   └── embed_query.py                   # FastEmbed ONNX 384-d vector generation helper
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics/route.ts       # Aggregated category metrics, trigger/view status
│   │   │   ├── claims/
│   │   │   │   ├── [id]/route.ts        # ACID claim approval/rejection with RBAC check
│   │   │   │   └── route.ts             # Claims catalog and submission with trigger check
│   │   │   ├── demo/reset/route.ts      # One-click demo database restoration
│   │   │   ├── items/
│   │   │   │   ├── [id]/route.ts        # Single item details, cascade delete, status update
│   │   │   │   └── route.ts             # Filtered items list & auto-vectorized item insert
│   │   │   ├── matches/route.ts         # Suggested pairings from item_match & lateral refresh
│   │   │   ├── meta/route.ts            # Categories, locations hierarchy, and demo users
│   │   │   ├── queries/run/route.ts     # Pre-packaged evaluation queries + custom runner
│   │   │   └── search/semantic/route.ts # Live side-by-side vector vs keyword search
│   │   ├── globals.css                  # Custom styling and typography
│   │   ├── layout.tsx                   # Root HTML structure and metadata
│   │   └── page.tsx                     # Main client page, session management, and routing
│   ├── components/
│   │   ├── BrowseView.tsx               # Central catalog with multi-column filters & search
│   │   ├── MyActivityView.tsx           # Student/Staff view of their reported items & claims
│   │   ├── ClaimsReviewView.tsx         # Staff/Admin claim review queue with proof inspection
│   │   ├── Header.tsx                   # Top navigation with profile switcher & action button
│   │   ├── ItemDetailModal.tsx          # Item deep inspector with unconfirmed potential matches
│   │   ├── ReportItemModal.tsx          # Item submission modal with FastEmbed vectorization
│   │   ├── FileClaimModal.tsx           # Claim filing modal with trigger validation
│   │   ├── SignInModal.tsx              # Campus authentication and account switcher
│   │   └── SystemToolsModal.tsx         # Evaluation console with SQL runner, schema, and reset
│   ├── lib/
│   │   ├── db.ts                        # Connection pool singleton (`pg`) with transaction helper
│   │   └── embed.ts                     # FastEmbed generation wrapper and match refresher
│   └── types/
│       └── index.ts                     # TypeScript data interfaces
├── tailwind.config.ts                   # Tailwind configuration
└── tsconfig.json                        # TypeScript compiler options
```

---

## 7. Evaluation Rubrics Summary (50 Marks)

| Evaluation Rubric | Marks | Status | Implementation Evidence |
| :--- | :---: | :---: | :--- |
| **ER diagram** | 2 | 100% | `public/lost_found_ER.png`, displayed in Schema tab. |
| **Relational schema with keys & constraints** | 3 | 100% | `public/lost_found_relational_schema.png`, 3NF normalized, PKs, FKs, CHECK. |
| **SQL database implementation - DDL** | 4 | 100% | `campus_lost_found_setup.sql`, `ALTER TABLE`, check constraints, HNSW index. |
| **NoSQL / Vector database creation** | 4 | 100% | `VECTOR(384)`, HNSW cosine index, pgvector extension. |
| **Technology justification** | 1 | 100% | Detailed in Section 3 of `PROJECT_REPORT.md` and README. |
| **DML operations** | 4 | 100% | `INSERT`, `UPDATE`, `DELETE ... RETURNING`, rich `SELECT` queries. |
| **Nested, correlated, Recursive & Join SQL queries** | 4 | 100% | 4-way join, nested subquery, correlated `EXISTS`, `WITH RECURSIVE`. |
| **Advanced SQL concepts (Proc/Trigger/CTE)** | 6 | 100% | Stored function `find_matching_items`, 3 triggers, multi-stage CTE, views. |
| **NoSQL / Vector feature, CRUD** | 7 | 100% | FastEmbed generation, cosine search (`<=>`), lateral join refresh, cascade delete. |
| **Next.js interface** | 3 | 100% | Next.js 14 App Router, responsive dashboard, tabs, modals, filters. |
| **Backend / API & DB integration** | 2 | 100% | Connection pool (`pg`), route handlers, parameterized queries, `.env.local`. |
| **Authentication & RBAC (>= 2 roles)** | 4 | 100% | 3 roles (Student, Staff, Admin), pgcrypto hashes, UI & API RBAC enforcement. |
| **Documentation, Git / GitHub** | 2 | 100% | Clean Git commits, structured README, comprehensive `PROJECT_REPORT.md`. |
| **Originality & Individual contribution** | 4 | 100% | Solves authentic vocabulary mismatch, clear division of responsibilities. |
| **Total** | **50** | **100%** | **All 14 rubrics fully addressed and demonstrated.** |
