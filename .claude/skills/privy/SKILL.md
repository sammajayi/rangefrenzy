---
name: Privy
description: Use when building authentication systems, embedded wallets, or wallet infrastructure for web3 applications. Reach for Privy when you need to onboard users with wallets, manage transaction signing, enforce wallet policies, or integrate wallet functionality into your app.
metadata:
    mintlify-proj: privy
    version: "1.0"
---

# Privy Skill Reference

## Product summary

Privy is a wallet infrastructure and authentication platform that enables developers to build web3 applications with embedded wallets, user authentication, and transaction signing. Use Privy to onboard users with wallets, create self-custodial or application-controlled wallets, sign transactions, and enforce policies on wallet actions.

**Key entry points:**
- **Client SDKs**: `@privy-io/react-auth` (React), `@privy-io/node` (Node.js), plus Swift, Android, Flutter, Unity, Go, Java, Rust, Ruby
- **REST API**: Direct API access at `https://auth.privy.io/api/v1/`
- **Dashboard**: https://dashboard.privy.io for app configuration, credentials, and settings
- **Primary docs**: https://docs.privy.io

## When to use

Reach for Privy when you need to:
- **Authenticate users** with email, SMS, social login, passkeys, or wallet-based auth
- **Create embedded wallets** for users automatically or on-demand
- **Sign and send transactions** from wallets on Ethereum, Solana, or 50+ other blockchains
- **Control wallet access** with owners, signers, and policies
- **Manage user objects** with linked accounts and custom metadata
- **Enforce transaction rules** with policies (amount limits, recipient whitelists, time windows)
- **Build server-side wallet automation** with authorization keys and signers
- **Integrate external wallets** (MetaMask, Phantom) alongside embedded wallets

Do not use Privy for: non-blockchain authentication, non-custodial key management outside Privy's infrastructure, or applications that don't need wallet functionality.

## Quick reference

### SDK Installation

| Platform | Command | Package |
|----------|---------|---------|
| React/Next.js | `npm install @privy-io/react-auth@latest` | `@privy-io/react-auth` |
| Node.js | `npm install @privy-io/node@latest` | `@privy-io/node` |
| React Native | `npm install @privy-io/react-native@latest` | `@privy-io/react-native` |
| Swift | CocoaPods or SPM | `PrivySDK` |
| Android | Gradle | `io.privy:privy-android` |

### Core Configuration

**React Setup:**
```tsx
<PrivyProvider
  appId="your-app-id"
  clientId="your-client-id"
  config={{
    embeddedWallets: {
      ethereum: { createOnLogin: 'users-without-wallets' }
    }
  }}
>
  {children}
</PrivyProvider>
```

**Node.js Setup:**
```ts
import { PrivyClient } from '@privy-io/node';
const privy = new PrivyClient({
  appId: 'your-app-id',
  appSecret: 'your-app-secret'
});
```

### API Authentication

All REST API calls require:
- **Authorization header**: Basic Auth with `appId:appSecret` (base64 encoded)
- **privy-app-id header**: Your app ID as a string

Example:
```bash
curl -H "Authorization: Basic $(echo -n 'appId:appSecret' | base64)" \
     -H "privy-app-id: your-app-id" \
     https://auth.privy.io/api/v1/users
```

### Common Wallet Operations

| Task | React Hook | Node.js Method |
|------|-----------|-----------------|
| Create wallet | `useCreateWallet()` | `privy.wallets().createWallet()` |
| Get user wallet | `useWallets()` | `privy.users().get()` |
| Send transaction | `useSendTransaction()` | `privy.wallets().ethereum().sendTransaction()` |
| Sign message | `useSignMessage()` | `privy.wallets().ethereum().personalSign()` |
| Get balance | `useBalance()` | `privy.wallets().getBalance()` |

### Dashboard Credentials

Obtain from **Configuration > App settings > Basics**:
- **App ID**: Public identifier, safe to expose
- **App Secret**: Private key for server-side API calls, never expose
- **Client ID**: Optional, for app-specific configurations

## Decision guidance

### When to use embedded wallets vs external wallets

| Scenario | Embedded Wallets | External Wallets |
|----------|------------------|------------------|
| New users with no crypto experience | ✓ Best choice | ✗ Friction |
| Users with existing MetaMask/Phantom | ✗ Duplicate wallets | ✓ Best choice |
| Self-custodial user control required | ✓ Supported | ✓ Native |
| Server-side automation needed | ✓ Full control | ✗ Limited |
| Multi-chain support required | ✓ 50+ chains | ✓ Chain-dependent |

### When to use Privy auth vs custom auth

| Scenario | Privy Auth | Custom Auth + Privy Wallets |
|----------|-----------|---------------------------|
| Need email/SMS/social login | ✓ Built-in | ✗ Requires integration |
| Already have auth system | ✗ Duplicate | ✓ Integrate via JWT |
| Want single provider | ✓ Simpler | ✗ More complex |
| Need MFA for wallets | ✓ Supported | ✓ Supported |

### When to use policies vs signers

| Use Case | Policies | Additional Signers |
|----------|----------|-------------------|
| Limit transaction amounts | ✓ Primary tool | ✗ Not designed for this |
| Restrict recipient addresses | ✓ Primary tool | ✗ Not designed for this |
| Delegate specific actions | ✗ Not designed | ✓ Primary tool |
| Require multi-sig approval | ✗ Not designed | ✓ Primary tool |
| Time-based restrictions | ✓ Supported | ✗ Not designed |

## Workflow

### 1. Set up your Privy app

1. Create an app at https://dashboard.privy.io
2. Navigate to **Configuration > App settings > Basics**
3. Copy your **App ID** and **App Secret**
4. Add allowed domains under **Configuration > App settings > Domains**
5. Configure login methods under **Configuration > Authentication**

### 2. Initialize Privy in your client

1. Install the appropriate SDK (`@privy-io/react-auth`, etc.)
2. Wrap your app with `PrivyProvider` (React) or initialize `PrivyClient` (Node.js)
3. Pass your `appId` and `clientId` to the provider
4. Configure wallet creation behavior in the `config` object
5. Wait for `ready` state before using Privy hooks

### 3. Authenticate users

1. Use `useLogin()` hook (React) or your custom auth provider
2. Configure login methods in dashboard (email, SMS, social, wallet, passkey)
3. Access authenticated user via `usePrivy()` hook
4. Verify access tokens on your backend if needed

### 4. Create and manage wallets

1. Configure automatic wallet creation in `PrivyProvider` config or call `useCreateWallet()`
2. Access wallet via `useWallets()` hook (React) or `privy.users().get()` (Node.js)
3. Extract wallet address from user object's `linkedAccounts` array
4. Store wallet address in your database for future lookups

### 5. Sign and send transactions

1. Construct transaction object (to, data, value, etc.)
2. Call `useSendTransaction()` (React) or `privy.wallets().ethereum().sendTransaction()` (Node.js)
3. Handle signing UI (modal appears for user approval)
4. Receive transaction hash and monitor status via webhooks
5. Implement error handling for policy violations or insufficient funds

### 6. Enforce policies and controls

1. Create policies via REST API or dashboard
2. Attach policies to wallet owners or signers
3. Define rules: amount limits, recipient whitelists, contract interactions
4. Test policy enforcement by attempting transactions that violate rules
5. Monitor policy violations in transaction logs

## Common gotchas

- **Not waiting for `ready` state**: Always check `usePrivy().ready` before accessing wallet state. Privy initializes asynchronously.
- **Exposing app secret**: Never include `appSecret` in client-side code. Use only on your backend server.
- **Missing allowed domains**: Add all domains where your app runs to **Configuration > App settings > Domains** or requests will fail with `invalid_origin`.
- **Incorrect app client ID**: If using app clients, ensure the `clientId` in `PrivyProvider` matches the one in your dashboard.
- **Not handling policy violations**: Transactions that violate policies fail silently. Always wrap transaction calls in try/catch and check error codes.
- **Forgetting to configure login methods**: If no login methods are enabled in the dashboard, users cannot authenticate. Enable at least one method.
- **Using wrong wallet address format**: Ethereum addresses must be checksummed or lowercase. Solana addresses are base58-encoded.
- **Not setting up webhooks for production**: Webhooks require Enterprise plan. Use polling or manual status checks for development.
- **Mixing user and server signers incorrectly**: User signers require user authentication; server signers use authorization keys. Don't confuse the two.
- **Policies evaluated at request time**: Policies are checked when the transaction is submitted, not when it's signed. A transaction can be signed but rejected at broadcast.

## Verification checklist

Before submitting work with Privy:

- [ ] App ID and App Secret are correctly configured in environment variables
- [ ] All required domains are added to the Privy Dashboard allowed list
- [ ] `PrivyProvider` wraps the entire app and `ready` state is checked before using hooks
- [ ] Login methods are enabled in the dashboard for your authentication flow
- [ ] Wallet creation is configured (automatic or manual) and tested
- [ ] Transaction signing works end-to-end with proper error handling
- [ ] Policies are created and attached to wallets if needed
- [ ] Webhooks are configured for production (if using transaction monitoring)
- [ ] Error codes are handled with user-friendly messages
- [ ] Rate limits are respected (implement exponential backoff for retries)
- [ ] User objects are correctly queried and wallet addresses extracted
- [ ] Authorization signatures are properly signed and passed in request headers (if using server signers)

## Resources

- **Comprehensive navigation**: https://docs.privy.io/llms.txt
- **Key Concepts**: https://docs.privy.io/basics/key-concepts
- **React SDK Setup**: https://docs.privy.io/basics/react/setup
- **REST API Reference**: https://docs.privy.io/api-reference/introduction

---

> For additional documentation and navigation, see: https://docs.privy.io/llms.txt