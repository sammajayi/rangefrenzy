import { MarketCreated as MarketCreatedEvent } from "../generated/MarketFactory/MarketFactory"
import { RangeFrenzyMarket as RangeFrenzyMarketContract } from "../generated/MarketFactory/RangeFrenzyMarket"
import { RangeFrenzyMarket } from "../generated/templates"
import { User, Market, MarketRange } from "../generated/schema"
import { BigInt, log } from "@graphprotocol/graph-ts"

const CATEGORY_LABELS: string[] = ["Crypto", "Sports", "Local"]

export function handleMarketCreated(event: MarketCreatedEvent): void {
  let market = new Market(event.params.marketProxy.toHexString())
  market.address = event.params.marketProxy
  market.question = event.params.question
  market.category = event.params.category
  market.categoryLabel = event.params.category < 3 ? CATEGORY_LABELS[event.params.category] : "Unknown"
  market.deadline = event.params.resolutionDeadline
  market.minStakeAmount = event.params.minStakeAmount
  market.status = "OPEN"
  market.pool = BigInt.zero().toBigDecimal()
  market.totalStakers = 0
  market.stakeIds = []
  market.winningRangeIndexes = []
  market.createdAt = event.params.createdAt
  market.save()

  let contract = RangeFrenzyMarketContract.bind(event.params.marketProxy)
  let rangesCountResult = contract.try_rangesCount()
  if (rangesCountResult.reverted) {
    log.warning("Failed to read rangesCount for market {}", [market.id])
    return
  }
  let rangesCount = rangesCountResult.value

  for (let i = 0; i < rangesCount.toI32(); i++) {
    let rangeResult = contract.try_ranges(BigInt.fromI32(i))
    if (rangeResult.reverted) {
      log.warning("Failed to read range {} for market {}", [i.toString(), market.id])
      continue
    }
    let rangeData = rangeResult.value
    let rangeEntity = new MarketRange(market.id + "-range-" + i.toString())
    rangeEntity.market = market.id
    rangeEntity.index = i
    rangeEntity.label = rangeData.getLabel()
    rangeEntity.lowerBound = rangeData.getLowerBound()
    rangeEntity.upperBound = rangeData.getUpperBound()
    rangeEntity.totalStaked = BigInt.zero().toBigDecimal()
    rangeEntity.save()
  }

  RangeFrenzyMarket.create(event.params.marketProxy)

  log.info("MarketCreated: {} question={}", [market.id, market.question])
}
