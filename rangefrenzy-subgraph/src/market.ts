import {
  Staked as StakedEvent,
  BettingClosed as BettingClosedEvent,
  MarketResolved as MarketResolvedEvent,
  WinningsClaimed as WinningsClaimedEvent,
  StakeRefunded as StakeRefundedEvent,
  MarketCancelled as MarketCancelledEvent
} from "../generated/templates/RangeFrenzyMarket/RangeFrenzyMarket"
import { User, Market, MarketRange, Stake, Transaction } from "../generated/schema"
import { BigInt, BigDecimal, Address, log } from "@graphprotocol/graph-ts"

function bigIntToDecimal(amount: BigInt): BigDecimal {
  return amount.toBigDecimal()
}

function getOrCreateUser(address: string, timestamp: BigInt): User {
  let user = User.load(address)
  if (!user) {
    user = new User(address)
    user.address = Address.fromHexString(address)
    user.totalStaked = BigDecimal.zero()
    user.totalPayout = BigDecimal.zero()
    user.totalBets = 0
    user.wins = 0
    user.losses = 0
    user.createdAt = timestamp
    user.updatedAt = timestamp
    user.save()
  }
  return user
}

function isWinningRange(rangeIndex: BigInt, winningIndexes: BigInt[]): bool {
  for (let i = 0; i < winningIndexes.length; i++) {
    if (winningIndexes[i] == rangeIndex) {
      return true
    }
  }
  return false
}

export function handleStaked(event: StakedEvent): void {
  let marketId = event.address.toHexString()
  let userId = event.params.user.toHexString()
  let stakeId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()

  let user = getOrCreateUser(userId, event.block.timestamp)
  let market = Market.load(marketId)
  if (!market) {
    log.warning("Market not found for Staked event: {}", [marketId])
    return
  }

  let amountDecimal = bigIntToDecimal(event.params.amount)

  let stake = new Stake(stakeId)
  stake.transactionHash = event.transaction.hash
  stake.user = userId
  stake.market = marketId
  stake.rangeIndex = event.params.rangeIndex.toI32()
  stake.rangeLabel = ""
  stake.amount = amountDecimal
  stake.claimed = false
  stake.status = "OPEN"
  stake.createdAt = event.block.timestamp
  stake.save()

  let stakeIds = market.stakeIds
  stakeIds.push(stakeId)
  market.stakeIds = stakeIds
  market.pool = market.pool.plus(amountDecimal)
  market.totalStakers = market.totalStakers + 1
  market.save()

  let rangeId = marketId + "-range-" + event.params.rangeIndex.toString()
  let range = MarketRange.load(rangeId)
  if (range) {
    range.totalStaked = range.totalStaked.plus(amountDecimal)
    range.save()
  }

  user.totalStaked = user.totalStaked.plus(amountDecimal)
  user.totalBets = user.totalBets + 1
  user.updatedAt = event.block.timestamp
  user.save()

  let tx = new Transaction(stakeId + "-tx")
  tx.transactionHash = event.transaction.hash
  tx.user = userId
  tx.market = marketId
  tx.type = "STAKE"
  tx.amount = amountDecimal
  tx.timestamp = event.block.timestamp
  tx.blockNumber = event.block.number
  tx.save()
}

export function handleBettingClosed(event: BettingClosedEvent): void {
  let marketId = event.address.toHexString()
  let market = Market.load(marketId)
  if (!market) {
    log.warning("Market not found for BettingClosed: {}", [marketId])
    return
  }
  market.status = "CLOSED"
  market.closedAt = event.block.timestamp
  market.save()
}

export function handleMarketResolved(event: MarketResolvedEvent): void {
  let marketId = event.address.toHexString()
  let market = Market.load(marketId)
  if (!market) {
    log.warning("Market not found for MarketResolved: {}", [marketId])
    return
  }

  market.status = "RESOLVED"
  market.actualOutcome = event.params.actualOutcome
  market.winningRangeIndexes = event.params.winningRangeIndexes
  market.feePaid = bigIntToDecimal(event.params.feePaid)
  market.resolvedAt = event.block.timestamp
  market.save()

  let winningIndexes = event.params.winningRangeIndexes
  let stakeIds = market.stakeIds

  for (let i = 0; i < stakeIds.length; i++) {
    let stake = Stake.load(stakeIds[i])
    if (!stake) {
      log.warning("Stake not found during resolution: {}", [stakeIds[i]])
      continue
    }

    let rangeIndexBig = BigInt.fromI32(stake.rangeIndex)
    if (isWinningRange(rangeIndexBig, winningIndexes)) {
      stake.status = "WON"
      let user = getOrCreateUser(stake.user, event.block.timestamp)
      user.wins = user.wins + 1
      user.updatedAt = event.block.timestamp
      user.save()
    } else {
      stake.status = "LOST"
      let user = getOrCreateUser(stake.user, event.block.timestamp)
      user.losses = user.losses + 1
      user.updatedAt = event.block.timestamp
      user.save()
    }
    stake.save()
  }

  log.info("MarketResolved: {} winners={} totalStakes={}", [
    marketId,
    winningIndexes.length.toString(),
    stakeIds.length.toString()
  ])
}

export function handleWinningsClaimed(event: WinningsClaimedEvent): void {
  let marketId = event.address.toHexString()
  let userId = event.params.user.toHexString()
  let payoutDecimal = bigIntToDecimal(event.params.payout)

  let user = getOrCreateUser(userId, event.block.timestamp)

  let market = Market.load(marketId)
  if (!market) {
    log.warning("Market not found for WinningsClaimed: {}", [marketId])
    return
  }

  let stakeIds = market.stakeIds
  for (let i = 0; i < stakeIds.length; i++) {
    let stake = Stake.load(stakeIds[i])
    if (stake && stake.user == userId && !stake.claimed) {
      stake.claimed = true
      stake.payout = payoutDecimal
      stake.claimedAt = event.block.timestamp
      stake.save()
      break
    }
  }

  user.totalPayout = user.totalPayout.plus(payoutDecimal)
  user.updatedAt = event.block.timestamp
  user.save()

  let txId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  let tx = new Transaction(txId)
  tx.transactionHash = event.transaction.hash
  tx.user = userId
  tx.market = marketId
  tx.type = "CLAIM"
  tx.amount = payoutDecimal
  tx.timestamp = event.block.timestamp
  tx.blockNumber = event.block.number
  tx.save()
}

export function handleStakeRefunded(event: StakeRefundedEvent): void {
  let marketId = event.address.toHexString()
  let userId = event.params.user.toHexString()
  let amountDecimal = bigIntToDecimal(event.params.amount)

  let user = getOrCreateUser(userId, event.block.timestamp)

  let market = Market.load(marketId)
  if (!market) {
    log.warning("Market not found for StakeRefunded: {}", [marketId])
    return
  }

  let stakeIds = market.stakeIds
  for (let i = 0; i < stakeIds.length; i++) {
    let stake = Stake.load(stakeIds[i])
    if (stake && stake.user == userId && stake.status != "REFUNDED") {
      stake.status = "REFUNDED"
      stake.claimed = true
      stake.claimedAt = event.block.timestamp
      stake.save()
      break
    }
  }

  user.updatedAt = event.block.timestamp
  user.save()

  let txId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  let tx = new Transaction(txId)
  tx.transactionHash = event.transaction.hash
  tx.user = userId
  tx.market = marketId
  tx.type = "REFUND"
  tx.amount = amountDecimal
  tx.timestamp = event.block.timestamp
  tx.blockNumber = event.block.number
  tx.save()
}

export function handleMarketCancelled(event: MarketCancelledEvent): void {
  let marketId = event.address.toHexString()
  let market = Market.load(marketId)
  if (!market) {
    log.warning("Market not found for MarketCancelled: {}", [marketId])
    return
  }
  market.status = "CANCELLED"
  market.cancelledAt = event.block.timestamp
  market.cancelledReason = event.params.reason
  market.save()
}
