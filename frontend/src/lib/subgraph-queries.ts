import { gql } from "graphql-request";

export const LEADERBOARD_QUERY = gql`
  query Leaderboard {
    users(
      first: 20
      orderBy: totalBets
      orderDirection: desc
    ) {
      id
      address
      totalStaked
      totalBets
      wins
      losses
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
      claimed
      payout
      status
      createdAt
      claimedAt
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
};

export type SubgraphStake = {
  id: string;
  transactionHash: string;
  rangeIndex: number;
  rangeLabel: string;
  amount: string;
  claimed: boolean;
  payout: string | null;
  status: "OPEN" | "WON" | "LOST" | "REFUNDED";
  createdAt: string;
  claimedAt: string | null;
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
  type: "STAKE" | "CLAIM" | "REFUND";
  amount: string;
  timestamp: string;
  blockNumber: string;
  market: { id: string; question: string } | null;
};

export type SubgraphLeaderRow = {
  id: string;
  address: string;
  totalStaked: string;
  totalBets: number;
  wins: number;
  losses: number;
};
