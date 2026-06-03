

## Rangefrenzy — Full Project Blueprint

### Core Concept
A range-based prediction market on Celo where users stake G$ on outcome ranges for crypto prices, sports, and local cultural/political events. Admin resolves manually.

---

### Smart Contract Architecture

**MarketFactory.sol**
- Creates new markets
- Stores all market addresses
- Only admin can create markets

**Market.sol** (one deployed per market)
```
- marketQuestion: string
- resolutionDeadline: timestamp
- minRange / maxRange: bounds for the outcome
- stakes: mapping(address => RangeStake)
- totalPool: uint256
- resolved: bool
- winningRange: stored on resolution
- claim(): distributes winnings proportionally
```

**RangeStake struct**
```
- lowerBound: uint256
- upperBound: uint256
- amount: uint256 (G$ staked)

struct Range {
    string label;     
    uint256 lowerBound;
    uint256 upperBound;
    uint256 totalStaked;
}

Range[] public ranges;
```

Winners = everyone whose range **contains** the actual outcome. Winnings split proportionally by stake size among winners.

---

### Tech Stack

| Layer | Choice |
|---|---|
| Smart Contracts | Solidity + Hardhat |
| Chain | Celo |
| Token | G$ (ERC20) |
| Frontend | Next.js + Tailwind |
| PWA | next-pwa |
| Wallet | web3auth for email & walletconnect|
| Contract interaction | wagmi + viem |
| Admin panel | Simple protected route |
| Hosting | Vercel |

---

### Pages / Features

**Public**
- Home — active markets list with category filter (Crypto / Sports / Local)
- Market page — place bet, set range, stake G$, see current pool and distribution
- My Bets — all your active and past positions
- Leaderboard — top earners
- Profile - transaction history - pnl - debit - credit - claim - account balace of holdings - celo & G$

**Admin (protected route)**
- Create market (question, category, deadline, range bounds)
- Resolve market (input actual outcome)
- View all markets and status

---

### MVP Cutlist (what to skip this week)
- ❌ Oracle integration
- ❌ Dispute mechanism
- ❌ Secondary market / trade positions
- ❌ Token rewards beyond G$
- ❌ Social features



