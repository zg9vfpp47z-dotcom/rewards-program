# rewards-program
A production-ready TypeScript/Node.js rewards distribution service for token-based ecosystems.

## Features
- **Core rewards engine** with point-based calculation, configurable tiers, and multipliers
- **User management** for registration, activity tracking, balance state, and reward claims
- **Admin configuration** for reward rates/tier updates plus immutable in-memory audit logs
- **API integration** via REST endpoints with wallet/token distribution hooks
- **Real-time distribution tracking** through distribution status records and transaction hashes

## Stack
- Node.js + TypeScript
- Express (REST API)
- Zod (request validation)
- Vitest + Supertest (tests)

## Setup
```bash
npm install
npm run dev
```
Server starts at `http://localhost:3000`.

## Build & Run
```bash
npm run build
npm start
```

## Test
```bash
npm test
```

## API Documentation
### Health
- `GET /health`

### Users
- `POST /users`
  - body: `{ "walletAddress": "wallet-addr" }`
- `GET /users`
- `POST /users/:userId/activity`
  - body: `{ "pointsDelta": 100 }`
- `POST /users/:userId/claim`

### Rewards
- `GET /rewards/config`
- `GET /rewards/distributions`

### Admin
Admin routes require:
- `x-admin-id: <admin-actor-id>`
- `x-admin-token: <token matching ADMIN_API_TOKEN>`

- `PUT /admin/rewards/config`
  - headers: `x-admin-id`, `x-admin-token`
  - body:
    ```json
    {
      "baseRewardRate": 0.1,
      "tiers": [
        { "name": "Bronze", "minPoints": 0, "multiplier": 1 },
        { "name": "Gold", "minPoints": 500, "multiplier": 1.5 }
      ]
    }
    ```
- `GET /admin/audit-logs`

## Wallet / Token Distribution Interface
Claims call an internal token distribution hook (`TokenDistributor.sendReward(walletAddress, amount)`), returning a `txHash` for wallet ecosystem integration. Replace `InMemoryTokenDistributor` with a blockchain-specific implementation for production chains.

## Example Usage
```bash
# 1) Register user
curl -X POST http://localhost:3000/users \
  -H 'Content-Type: application/json' \
  -d '{"walletAddress":"wallet-test-123"}'

# 2) Track activity
curl -X POST http://localhost:3000/users/<USER_ID>/activity \
  -H 'Content-Type: application/json' \
  -d '{"pointsDelta":250}'

# 3) Claim rewards
curl -X POST http://localhost:3000/users/<USER_ID>/claim

# 4) View distributions and audit
curl http://localhost:3000/rewards/distributions
curl http://localhost:3000/admin/audit-logs
```

## Deployment Notes
- Set `PORT` environment variable as needed.
- Set `ADMIN_API_TOKEN` to protect admin endpoints.
- The current storage is in-memory for fast setup; move state to persistent storage (PostgreSQL/Redis) for horizontally scaled production deployments.
