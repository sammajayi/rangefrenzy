import { gql } from "graphql-request";

export const LEADERBOARD_QUERY = gql`
  query Leaderboard {
    users(
      first: 50
      orderBy: totalStaked
      orderDirection: desc
      where: { totalBets_gt: 0 }
    ) {
      id
      address
      totalStaked
      totalPayout
      totalBets
      wins
      losses
      realizedPnl
    }
  }
`;

export const USER_PROFILE_QUERY = gql`
  query UserProfile($address: String!) {
    user(id: $address) {
      id
      address
      totalStaked
      totalPayout
      totalBets
      wins
      losses
      realizedPnl
    }
  }
`;

export const USER_STAKES_QUERY = gql`
  query UserStakes($address: String!) {
    stakes(
      where: { user: $address }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      transactionHash
      rangeIndex
      rangeLabel
      amount
      shares
      pricePaid
      claimed
      payout
      proceeds
      status
      createdAt
      claimedAt
      soldAt
      market {
        id
        address
        question
        category
        categoryLabel
        status
        winningRangeIndexes
        actualOutcome
        deadline
      }
    }
  }
`;

export const USER_TRANSACTIONS_QUERY = gql`
  query UserTransactions($address: String!) {
    transactions(
      where: { user: $address }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      transactionHash
      type
      amount
      timestamp
      blockNumber
      market {
        id
        question
      }
    }
  }
`;

export const MARKET_STAKES_QUERY = gql`
  query MarketStakes($marketId: String!) {
    stakes(
      where: { market: $marketId }
      orderBy: createdAt
      orderDirection: asc
      first: 1000
    ) {
      rangeIndex
      rangeLabel
      pricePaid
      createdAt
    }
  }
`;

export const USER_BY_WALLET_QUERY = gql`
  query UserByWallet($address: Bytes!) {
    users(where: { address: $address }) {
      id
      address
      totalStaked
      totalPayout
      totalBets
      wins
      losses
      realizedPnl
    }
  }
`;

export type SubgraphUser = {
  id: string;
  address: string;
  totalStaked: string;
  totalPayout: string;
  totalBets: number;
  wins: number;
  losses: number;
  realizedPnl: string;
};

export type StakeStatus = "OPEN" | "WON" | "LOST" | "REFUNDED" | "SOLD";

export type SubgraphStake = {
  id: string;
  transactionHash: string;
  rangeIndex: number;
  rangeLabel: string;
  amount: string;
  shares: string;
  pricePaid: string;
  claimed: boolean;
  payout: string | null;
  proceeds: string | null;
  status: StakeStatus;
  createdAt: string;
  claimedAt: string | null;
  soldAt: string | null;
  market: {
    id: string;
    address: string;
    question: string;
    category: number;
    categoryLabel: string;
    status: string;
    winningRangeIndexes: string[];
    actualOutcome: string | null;
    deadline: string;
  } | null;
};

export type SubgraphTransaction = {
  id: string;
  transactionHash: string;
  type: "STAKE" | "SELL" | "CLAIM" | "REFUND";
  amount: string;
  timestamp: string;
  blockNumber: string;
  market: { id: string; question: string } | null;
};

export type SubgraphMarketStakePoint = {
  rangeIndex: number;
  rangeLabel: string;
  pricePaid: string;
  createdAt: string;
};

export type SubgraphLeaderRow = {
  id: string;
  address: string;
  totalStaked: string;
  totalPayout: string;
  totalBets: number;
  wins: number;
  losses: number;
  realizedPnl: string;
};
