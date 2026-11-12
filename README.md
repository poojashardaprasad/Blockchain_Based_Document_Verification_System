# 🔐 Blockchain-Based Document Verification System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.x-363636?logo=solidity&logoColor=white)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.x-FFF100?logo=hardhat&logoColor=black)](https://hardhat.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)
[![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)]()

> A tamper-proof, full-stack document verification system that anchors SHA-256 document hashes on an Ethereum-compatible blockchain — ensuring institution-level trust, immutability, and instant fraud detection.

---

## 📋 Table of contents

- [Overview](#overview)
- [Core features](#core-features)
- [Tech stack](#tech-stack)
- [System architecture](#system-architecture)
- [Data flow](#data-flow)
- [Folder structure](#folder-structure)
- [Database schema](#database-schema)
- [Smart contract overview](#smart-contract-overview)
- [Quick start](#quick-start)
- [Installation guide](#installation-guide)
  - [Prerequisites](#prerequisites)
  - [1 · Database setup](#1--database-setup)
  - [2 · Ganache setup](#2--ganache-setup)
  - [3 · Smart contract deployment](#3--smart-contract-deployment)
  - [4 · Backend setup](#4--backend-setup)
  - [5 · Frontend setup](#5--frontend-setup)
- [Environment variables](#environment-variables)
- [Docker setup](#docker-setup)
- [Usage walkthrough](#usage-walkthrough)
- [Verification flow](#verification-flow)
- [Role-based dashboards](#role-based-dashboards)
- [API endpoints](#api-endpoints)
- [Security features](#security-features)
- [Screenshots](#screenshots)
- [Testing & validation](#testing--validation)
- [Troubleshooting](#troubleshooting)
- [Future enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Authors](#authors)

---

## Overview

Traditional document verification depends on centralized databases that can be compromised, manipulated, or taken offline. This system solves that problem by combining **cryptographic hashing** with **blockchain immutability**.

When a document is uploaded, its SHA-256 hash is computed client-side and then anchored to an Ethereum smart contract. The original file is never stored on-chain — only its fingerprint. Any attempt to alter the document produces a different hash, triggering an instant **INVALID** result during verification.

The platform supports three distinct roles — **Admin**, **Institution (Uploader)**, and **Verifier** — each with tailored dashboards, access controls, and workflows.

---

## Core features

| Feature | Description |
|---|---|
| 🔗 Blockchain anchoring | Document hashes stored immutably on Ethereum via Solidity smart contract |
| 🔑 SHA-256 hashing | Cryptographic fingerprinting — any file modification changes the hash |
| 🏛️ Institution workflow | Institutions register, request approval, then upload and manage documents |
| 👤 Role-based access | Three roles: Admin, Uploader (Institution), Verifier — each with isolated dashboards |
| ✅ Instant verification | Upload a file, compare its hash against the blockchain — VALID or INVALID in seconds |
| 🔒 JWT authentication | Stateless, token-based auth with role claims encoded in the payload |
| 📊 Analytics dashboards | Per-institution stats: total uploads, verification counts, blockchain tx history |
| 🗂️ Audit logging | Every upload, verification, and admin action is timestamped and logged |
| 🚫 Document revocation | Admins can revoke documents; revoked hashes return REVOKED on verification |
| 🐳 Docker support | Full stack runs with a single `docker-compose up --build` |

---

## Tech stack

### Frontend

| Technology | Purpose |
|---|---|
| React.js 18 | UI framework |
| Tailwind CSS | Utility-first styling |
| React Router v6 | Client-side routing |
| Axios | HTTP client for API calls |
| Ethers.js | Blockchain interaction from the browser |

### Backend

| Technology | Purpose |
|---|---|
| Node.js 18+ | Runtime |
| Express.js | REST API framework |
| JWT (jsonwebtoken) | Authentication and authorization |
| Multer | Multipart file upload handling |
| mysql2 | MySQL driver with promise support |
| Ethers.js | Smart contract interaction |

### Blockchain

| Technology | Purpose |
|---|---|
| Solidity 0.8.x | Smart contract language |
| Hardhat | Development environment, testing, deployment |
| Ethers.js | Contract ABI interaction |
| Ganache | Local Ethereum blockchain for development |

### Database

| Technology | Purpose |
|---|---|
| MySQL 8.0 | Relational database for users, institutions, documents, audit logs |

---

## System architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                         │
│          Tailwind CSS · React Router · Axios · Ethers.js            │
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST API (HTTP/JSON)
                             │ JWT Bearer tokens
┌────────────────────────────▼────────────────────────────────────────┐
│                     Node.js / Express Backend                        │
│                                                                      │
│   Auth middleware (JWT)   │   Role guard middleware                  │
│   Multer (file uploads)   │   SHA-256 hash computation               │
│   Ethers.js (Web3)        │   Audit log writer                       │
└──────────┬────────────────┬──────────────────────────────────────────┘
           │                │
  ┌────────▼──────┐  ┌──────▼──────────────────────────────────────┐
  │  MySQL 8.0    │  │          Ethereum Node (Ganache / Testnet)   │
  │               │  │                                              │
  │  users        │  │  DocumentRegistry.sol                        │
  │  institutions │  │  ┌─────────────────────────────────────────┐ │
  │  documents    │  │  │ storeHash(bytes32 hash)                  │ │
  │  verifications│  │  │ verifyHash(bytes32 hash) → bool          │ │
  │  audit_logs   │  │  │ revokeHash(bytes32 hash)                 │ │
  └───────────────┘  │  └─────────────────────────────────────────┘ │
                     └──────────────────────────────────────────────┘
```

---

## Data flow

### Upload flow (Institution)

```
1. Institution uploads a file via the React frontend
2. Frontend computes SHA-256 hash of the file (browser-side, file never leaves)
3. POST /api/documents/upload — hash + metadata sent to Express backend
4. Backend verifies JWT and institution approval status
5. Backend calls DocumentRegistry.storeHash(hash) on the smart contract
6. Transaction is mined on Ganache; tx hash returned
7. Backend saves document record + tx hash to MySQL
8. Audit log entry written
9. Frontend shows success with blockchain tx hash
```

### Verification flow (Verifier)

```
1. Verifier uploads the document to be checked
2. Frontend computes SHA-256 hash of the uploaded file
3. POST /api/verify — hash sent to backend
4. Backend calls DocumentRegistry.verifyHash(hash) on the smart contract
5. Smart contract returns true (exists) or false (not found)
6. Backend additionally checks revocation status in MySQL
7. Backend returns: VALID / INVALID / REVOKED
8. Verification record + audit log written
9. Frontend displays color-coded result with blockchain tx reference
```

---

## Folder structure

```
Blockchain-Based-Document-Verification-System/
├── blockchain/                  # Hardhat project
│   ├── contracts/
│   │   └── DocumentRegistry.sol # Core smart contract
│   ├── scripts/
│   │   └── deploy.js            # Deployment script
│   ├── test/
│   │   └── DocumentRegistry.js  # Contract unit tests
│   └── hardhat.config.js
│
├── server/                      # Express.js backend
│   ├── config/
│   │   └── db.js                # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js              # JWT verification middleware
│   │   └── roleGuard.js         # Role-based access control
│   ├── routes/
│   │   ├── auth.js              # Login / register endpoints
│   │   ├── documents.js         # Upload / fetch / revoke
│   │   ├── verify.js            # Verification endpoint
│   │   ├── institutions.js      # Institution approval workflow
│   │   └── admin.js             # Admin analytics + audit logs
│   ├── utils/
│   │   ├── hash.js              # SHA-256 helper
│   │   └── blockchain.js        # Ethers.js contract wrapper
│   ├── uploads/                 # Temp file storage (Multer)
│   ├── .env.example
│   └── index.js
│
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── components/          # Shared UI components
│   │   ├── pages/
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── uploader/        # Institution pages
│   │   │   └── verifier/        # Verifier pages
│   │   ├── context/             # Auth context / JWT storage
│   │   ├── utils/
│   │   │   └── hash.js          # Browser SHA-256 computation
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
│
├── database/
│   ├── schema.sql               # Table definitions
│   └── seed.sql                 # Demo data
│
├── certificates/                # Sample test documents
├── docker-compose.yml
├── .dockerignore
└── README.md
```

---

## Database schema

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `name` | VARCHAR(100) | Full name |
| `email` | VARCHAR(150) UNIQUE | Login email |
| `password_hash` | VARCHAR(255) | Bcrypt-hashed password |
| `role` | ENUM('admin','uploader','verifier') | Access role |
| `created_at` | TIMESTAMP | Registration timestamp |

### `institutions`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `user_id` | INT FK → users.id | Associated uploader account |
| `name` | VARCHAR(200) | Institution display name |
| `status` | ENUM('pending','approved','rejected') | Admin approval status |
| `requested_at` | TIMESTAMP | Approval request timestamp |
| `approved_at` | TIMESTAMP NULL | Admin approval timestamp |

### `documents`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `institution_id` | INT FK → institutions.id | Uploading institution |
| `file_name` | VARCHAR(255) | Original filename |
| `sha256_hash` | CHAR(64) UNIQUE | Hex-encoded SHA-256 hash |
| `tx_hash` | VARCHAR(66) | Blockchain transaction hash |
| `block_number` | BIGINT | Block number of the tx |
| `is_revoked` | BOOLEAN DEFAULT FALSE | Revocation flag |
| `uploaded_at` | TIMESTAMP | Upload timestamp |

### `verifications`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `verifier_id` | INT FK → users.id | User who ran the check |
| `sha256_hash` | CHAR(64) | Hash of the submitted file |
| `result` | ENUM('valid','invalid','revoked') | Verification outcome |
| `verified_at` | TIMESTAMP | Verification timestamp |

### `audit_logs`

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Auto-increment primary key |
| `user_id` | INT FK → users.id | Acting user |
| `action` | VARCHAR(100) | e.g. `document.upload`, `document.revoke` |
| `target_id` | INT NULL | Related document or institution ID |
| `metadata` | JSON NULL | Extra context (IP address, tx hash, etc.) |
| `created_at` | TIMESTAMP | Log timestamp |

**Key relationships:** `documents` → `institutions` → `users`. Every action produces an `audit_logs` row. Verification records are independent of documents (a verifier may check a document that doesn't exist in the system).

---

## Smart contract overview

**File:** `blockchain/contracts/DocumentRegistry.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentRegistry {

    // Mapping: SHA-256 hash (bytes32) → block timestamp of registration
    mapping(bytes32 => uint256) private documentTimestamps;

    // Mapping: SHA-256 hash → revocation status
    mapping(bytes32 => bool) private revokedDocuments;

    // Address of the contract deployer (backend wallet)
    address public owner;

    event DocumentStored(bytes32 indexed hash, uint256 timestamp);
    event DocumentRevoked(bytes32 indexed hash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Anchor a document hash on-chain
    function storeHash(bytes32 _hash) external onlyOwner {
        require(documentTimestamps[_hash] == 0, "Hash already registered");
        documentTimestamps[_hash] = block.timestamp;
        emit DocumentStored(_hash, block.timestamp);
    }

    /// @notice Check whether a hash exists and is not revoked
    function verifyHash(bytes32 _hash) external view returns (bool) {
        return documentTimestamps[_hash] != 0 && !revokedDocuments[_hash];
    }

    /// @notice Revoke a previously registered hash
    function revokeHash(bytes32 _hash) external onlyOwner {
        require(documentTimestamps[_hash] != 0, "Hash not found");
        revokedDocuments[_hash] = true;
        emit DocumentRevoked(_hash, block.timestamp);
    }

    /// @notice Get the timestamp when a hash was registered
    function getTimestamp(bytes32 _hash) external view returns (uint256) {
        return documentTimestamps[_hash];
    }
}
```

**Key design decisions:**
- Only the **owner** (backend wallet) can store or revoke hashes — preventing unauthorized anchoring
- `verifyHash` is a `view` function — costs no gas for the caller
- `storeHash` rejects duplicate registrations — every document hash is unique on-chain
- Events (`DocumentStored`, `DocumentRevoked`) provide an immutable on-chain audit trail

---

## Quick start

**Fastest way to run the full stack locally:**

```bash
git clone https://github.com/Shreyas-R-Gowda/Blockchain-Based-Document-Verification-System.git
cd Blockchain-Based-Document-Verification-System

# Copy and fill in environment variables
cp server/.env.example server/.env

# Start Ganache, deploy contract, then:
docker-compose up --build
```

Services:

| Service | URL |
|---|---|
| Frontend (React) | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| MySQL | localhost:3306 |

> **Note:** Docker Compose does not start Ganache or deploy the contract automatically. Follow the [Ganache setup](#2--ganache-setup) and [Smart contract deployment](#3--smart-contract-deployment) steps first, then update `CONTRACT_ADDRESS` in `server/.env` before running Docker.

---

## Installation guide

### Prerequisites

Ensure the following are installed on your machine:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | bundled with Node.js |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| Ganache | 2.7+ (GUI) or `ganache` CLI | https://trufflesuite.com/ganache/ |
| Git | Any | https://git-scm.com |

Clone the repository:

```bash
git clone https://github.com/Shreyas-R-Gowda/Blockchain-Based-Document-Verification-System.git
cd Blockchain-Based-Document-Verification-System
```

---

### 1 · Database setup

Open MySQL Workbench or your MySQL client and run:

```sql
CREATE DATABASE doc_verify_db;
USE doc_verify_db;
```

Import the schema and seed data:

```bash
mysql -u root -p doc_verify_db < database/schema.sql
mysql -u root -p doc_verify_db < database/seed.sql
```

Verify the tables were created:

```sql
SHOW TABLES;
-- Expected: users, institutions, documents, verifications, audit_logs
```

---

### 2 · Ganache setup

**Option A — Ganache GUI (recommended for beginners)**

1. Download and open Ganache: https://trufflesuite.com/ganache/
2. Click **New Workspace → Ethereum**
3. Set the port to **7545**
4. Click **Save Workspace**
5. Ganache will display 10 pre-funded accounts — note the **first account's private key** (click the key icon)

**Option B — Ganache CLI**

```bash
npm install -g ganache
ganache --port 7545 --deterministic
```

The `--deterministic` flag always generates the same accounts from the same mnemonic, making development reproducible.

---

### 3 · Smart contract deployment

```bash
cd blockchain
npm install
```

Configure the network in `hardhat.config.js` (already set for Ganache on port 7545):

```javascript
networks: {
  localhost: {
    url: "http://127.0.0.1:7545",
    chainId: 1337,
  }
}
```

Deploy the contract:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Expected output:

```
Deploying DocumentRegistry...
DocumentRegistry deployed to: 0xYourContractAddressHere
```

**Copy the contract address** — you will need it for the backend `.env` in the next step.

---

### 4 · Backend setup

```bash
cd ../server
npm install
cp .env.example .env
```

Edit `server/.env` with your values (see [Environment variables](#environment-variables) for full reference):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=doc_verify_db

JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=24h

BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545
CONTRACT_ADDRESS=0xYourContractAddressHere
DEPLOYER_PRIVATE_KEY=0xGanacheAccount0PrivateKey

PORT=5000
```

Start the server:

```bash
npm start
# or for development with hot reload:
npm run dev
```

The API will be running at **http://localhost:5000**.

---

### 5 · Frontend setup

```bash
cd ../client
npm install
```

Create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the development server:

```bash
npm run dev
```

The React app will be available at **http://localhost:5173** (Vite default) or **http://localhost:3000** if configured.

---

## Environment variables

Full reference for `server/.env`:

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | ✅ | MySQL host (e.g. `localhost`) |
| `DB_PORT` | ✅ | MySQL port (default `3306`) |
| `DB_USER` | ✅ | MySQL username |
| `DB_PASSWORD` | ✅ | MySQL password |
| `DB_NAME` | ✅ | Database name (`doc_verify_db`) |
| `JWT_SECRET` | ✅ | Secret key for signing JWTs — use a long random string |
| `JWT_EXPIRES_IN` | ✅ | Token expiry (e.g. `24h`, `7d`) |
| `BLOCKCHAIN_RPC_URL` | ✅ | RPC endpoint of your Ethereum node (Ganache: `http://127.0.0.1:7545`) |
| `CONTRACT_ADDRESS` | ✅ | Deployed `DocumentRegistry` contract address |
| `DEPLOYER_PRIVATE_KEY` | ✅ | Private key of the Ganache account that deployed the contract |
| `PORT` | ✅ | Express server port (default `5000`) |
| `UPLOAD_DIR` | ❌ | Directory for temporary file uploads (default `./uploads`) |
| `NODE_ENV` | ❌ | `development` or `production` |

> **Security warning:** Never commit `.env` to version control. The `.gitignore` already excludes it — verify before pushing.

---

## Docker setup

To run the full stack without installing MySQL separately:

```bash
# From the project root
docker-compose up --build
```

Services started:

| Container | Exposed port | Notes |
|---|---|---|
| `client` | 3000 | React frontend (Nginx) |
| `server` | 5000 | Express backend |
| `db` | 3306 | MySQL 8.0 |

Seed the database inside the running container:

```bash
docker exec -i $(docker-compose ps -q db) \
  mysql -u root -prootpassword doc_verify_db < database/seed.sql
```

Stop and clean up:

```bash
docker-compose down        # stop containers, preserve volumes
docker-compose down -v     # stop containers and delete volumes (resets DB)
```

> **Note:** The Ganache blockchain and smart contract still need to be running and deployed separately on your host machine. Update `CONTRACT_ADDRESS` and `BLOCKCHAIN_RPC_URL` in the server environment to point to your host's Ganache instance (`host.docker.internal:7545` on Mac/Windows, `172.17.0.1:7545` on Linux).

---

## Usage walkthrough

### Admin

1. Log in with admin credentials
2. Navigate to **Institutions** → review pending institution requests
3. Click **Approve** or **Reject** for each request
4. Navigate to **Documents** to view all uploaded documents across all institutions
5. Click **Revoke** on any document to invalidate it on-chain
6. Navigate to **Audit Logs** for a full timestamped activity history
7. Navigate to **Analytics** for system-wide stats

### Institution (Uploader)

1. Register a new account with role `uploader`
2. Fill in your institution details and submit for admin approval
3. After approval, navigate to **Upload Document**
4. Select a file — the SHA-256 hash is computed in the browser
5. Click **Anchor on Blockchain** — the hash is stored on-chain via the smart contract
6. View your **Document History** — each entry shows filename, hash, blockchain tx hash, and timestamp
7. View **Analytics** for your institution's upload and verification stats

### Verifier

1. Register a new account with role `verifier`
2. Navigate to **Verify Document**
3. Upload the document you wish to verify
4. The system computes its SHA-256 hash and queries the blockchain
5. Result is displayed:
   - ✅ **VALID** — hash found on-chain and not revoked
   - ❌ **INVALID** — hash not found (document was never registered, or has been modified)
   - 🚫 **REVOKED** — hash was found but has been revoked by an admin

---

## Verification flow

```
Verifier uploads file
        │
        ▼
Browser computes SHA-256 hash
        │
        ▼
POST /api/verify  { hash: "abc123..." }
        │
        ▼
Backend: DocumentRegistry.verifyHash(hash)
        │
   ┌────┴────┐
   │         │
false       true
   │         │
   ▼         ▼
INVALID   Check MySQL: is_revoked?
              │
         ┌────┴────┐
         │         │
        true      false
         │         │
         ▼         ▼
      REVOKED    VALID
```

### Verification scenarios

| Scenario | What happened | Result |
|---|---|---|
| Unmodified original document | Hash matches on-chain record exactly | ✅ VALID |
| Document content changed (even 1 byte) | SHA-256 produces a different hash | ❌ INVALID |
| Document never uploaded to this system | Hash not found on-chain | ❌ INVALID |
| Document uploaded then revoked by admin | Hash exists but revocation flag is set | 🚫 REVOKED |
| Re-upload of already-registered document | Duplicate hash — stored once, still verifies as VALID | ✅ VALID |

---

## Role-based dashboards

### Admin dashboard

| Panel | Description |
|---|---|
| Overview | Total users, institutions, documents, and verifications system-wide |
| Institution management | Approve / reject pending institution requests; view all institutions |
| Document management | View all documents across institutions; revoke documents |
| Audit logs | Full timestamped log of all user actions |
| Analytics | Upload trends over time, verification success rate, active institutions |

### Institution (Uploader) dashboard

| Panel | Description |
|---|---|
| Overview | Total documents uploaded, successful verifications, failed verifications |
| Upload | File picker with browser-side hash computation and blockchain anchoring |
| Document history | List of all uploads with filename, hash (truncated), tx hash, timestamp |
| Blockchain transactions | Direct links to Ganache / Etherscan for each transaction |

### Verifier dashboard

| Panel | Description |
|---|---|
| Verify | File upload area with real-time VALID / INVALID / REVOKED result |
| History | Log of all previous verification attempts with results |

---

## API endpoints

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Register a new user |
| `POST` | `/auth/login` | None | Login and receive JWT |

### Institutions

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/institutions/request` | JWT | uploader | Submit an institution approval request |
| `GET` | `/institutions` | JWT | admin | List all institutions with status |
| `PATCH` | `/institutions/:id/approve` | JWT | admin | Approve an institution |
| `PATCH` | `/institutions/:id/reject` | JWT | admin | Reject an institution |

### Documents

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/documents/upload` | JWT | uploader (approved) | Upload document and anchor hash on-chain |
| `GET` | `/documents` | JWT | uploader | Get documents for the authenticated institution |
| `GET` | `/documents/all` | JWT | admin | Get all documents across all institutions |
| `PATCH` | `/documents/:id/revoke` | JWT | admin | Revoke a document |

### Verification

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/verify` | JWT | verifier | Verify a document hash against the blockchain |
| `GET` | `/verify/history` | JWT | verifier | Get verification history for the authenticated user |

### Admin

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/admin/analytics` | JWT | admin | System-wide analytics summary |
| `GET` | `/admin/audit-logs` | JWT | admin | Paginated audit log |
| `GET` | `/admin/users` | JWT | admin | List all registered users |

---

## Security features

### SHA-256 hashing

The SHA-256 algorithm produces a 256-bit (64 hex character) digest of any input file. A single changed byte in the document produces a completely different hash (avalanche effect). The probability of two different documents sharing a hash (collision) is cryptographically negligible — approximately 1 in 2¹²⁸.

### Blockchain immutability

Once a hash is anchored by `storeHash()`, the Ethereum blockchain guarantees it cannot be removed, altered, or back-dated. Even if the application server is compromised, the on-chain record persists independently.

### Privacy preservation

Only hashes — never the documents themselves — are stored on-chain. A hash cannot be reverse-engineered back into the original document, so confidential files are never exposed.

### JWT authentication

All protected routes require a valid JWT in the `Authorization: Bearer <token>` header. Tokens expire after the configured duration (`JWT_EXPIRES_IN`). Role claims inside the token are verified server-side on every request.

### Role-based access control (RBAC)

| Action | Admin | Uploader | Verifier |
|---|---|---|---|
| Approve institutions | ✅ | ❌ | ❌ |
| Upload documents | ❌ | ✅ (if approved) | ❌ |
| Verify documents | ❌ | ❌ | ✅ |
| Revoke documents | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |
| View all documents | ✅ | Own only | ❌ |

### Smart contract owner guard

The `onlyOwner` modifier on `storeHash` and `revokeHash` ensures only the backend's deployer wallet can write to the contract. No third party can anchor arbitrary hashes.

---

## Screenshots

```markdown
![Admin dashboard](./screenshots/admin-dashboard.png)
![Institution approval workflow](./screenshots/institution-approval.png)
![Document upload with hash](./screenshots/document-upload.png)
![Verification result – valid](./screenshots/verify-valid.png)
![Verification result – invalid](./screenshots/verify-invalid.png)
![Analytics dashboard](./screenshots/analytics.png)
![Audit log](./screenshots/audit-log.png)
```

> Add your actual screenshots to a `/screenshots` folder at the root of the repository and update the paths above.

---

## Testing & validation

### Smart contract tests

```bash
cd blockchain
npx hardhat test
```

Key test cases:

- `storeHash` anchors a hash and emits `DocumentStored`
- `verifyHash` returns `true` for a stored, non-revoked hash
- `verifyHash` returns `false` for an unregistered hash
- `revokeHash` sets the revocation flag and emits `DocumentRevoked`
- `verifyHash` returns `false` after revocation
- `storeHash` reverts on duplicate hash submission
- `storeHash` and `revokeHash` revert when called by non-owner

### Backend API testing with curl

**Register a verifier:**

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Verifier","email":"verifier@test.com","password":"Test@1234","role":"verifier"}'
```

**Login:**

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"verifier@test.com","password":"Test@1234"}'
```

**Verify a document (replace TOKEN and FILE_PATH):**

```bash
curl -X POST http://localhost:5000/api/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "document=@/path/to/your/file.pdf"
```

### Manual verification test

1. Upload any file as an institution — note the SHA-256 hash displayed
2. As a verifier, submit the **same file** → expect **VALID**
3. Open the file in a text editor, add a space, save
4. Submit the modified file as a verifier → expect **INVALID**
5. As admin, revoke the original document
6. Resubmit the original unmodified file → expect **REVOKED**

---

## Demo credentials

After running `database/seed.sql`, the following accounts are available for testing:

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | Admin@1234 |
| Institution | institution@demo.com | Institution@1234 |
| Verifier | verifier@demo.com | Verifier@1234 |

> Change these credentials immediately if deploying to a public environment.

---

## Troubleshooting

### `Error: connect ECONNREFUSED 127.0.0.1:7545`

Ganache is not running. Start Ganache GUI or run `ganache --port 7545`.

### `Error: Cannot find module 'mysql2'`

```bash
cd server && npm install
```

### `Invalid or missing CONTRACT_ADDRESS`

You forgot to copy the deployed contract address into `server/.env`. Re-run the Hardhat deploy script and update the `.env`.

### `Transaction reverted: Hash already registered`

You are trying to upload a document whose hash is already on-chain. This is expected behavior — the blockchain rejects duplicate entries.

### `JWT malformed` or `invalid signature`

The `JWT_SECRET` in `.env` does not match the one used to sign the token. Ensure the server has been restarted after editing `.env`.

### `Access denied for user 'root'@'localhost'`

MySQL credentials in `.env` are incorrect. Verify with:

```bash
mysql -u root -p
```

### Docker: `server` container exits immediately

The backend starts before MySQL is ready. Wait 15–20 seconds and run:

```bash
docker-compose restart server
```

Or add a `depends_on` + `healthcheck` to the `server` service in `docker-compose.yml`.

### Port 3000 or 5000 already in use

```bash
# Find and kill the process on that port (Linux/Mac)
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

---

## Future enhancements

| Enhancement | Description |
|---|---|
| 🌐 IPFS document storage | Store encrypted documents on IPFS; anchor the CID + hash on-chain for full decentralization |
| 🔏 Zero-knowledge proofs | Allow verification of document properties without revealing the document itself |
| 📱 Mobile app | React Native client for on-the-go verification via smartphone camera |
| ⛓️ Multi-chain support | Deploy to Ethereum mainnet, Polygon, or other EVM chains for production use |
| 🔔 Email notifications | Notify institutions when their approval status changes or a document is revoked |
| 📦 Bulk upload | Upload and anchor multiple documents in a single batched blockchain transaction |
| 🔍 Public verification portal | Unauthenticated endpoint for public document verification without an account |
| 🏢 Multi-admin support | Tiered admin roles (super-admin, department admin) |
| 📜 Certificate generation | Auto-generate a signed PDF certificate for each successfully verified document |

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear, descriptive commit messages
4. Ensure all smart contract tests pass: `cd blockchain && npx hardhat test`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request describing your changes

Please follow the existing code style and add comments for any non-obvious logic.

---

## License

This project is licensed under the [MIT License](./LICENSE). You are free to use, modify, and distribute this software with attribution.

---

## Authors

| Name | Role | GitHub |
|---|---|---|
| Shreyas R Gowda | Frontend, blockchain integration, Docker setup | [@Shreyas-R-Gowda](https://github.com/Shreyas-R-Gowda) |
| Shreeram | Backend, smart contract, database design | [@shreeram675](https://github.com/shreeram675) |

*Built as an academic project at R.V. College of Engineering, Bengaluru.*

---

<div align="center">

**⭐ If this project helped you, please consider starring the repository.**

</div>
