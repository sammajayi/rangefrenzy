"use client";

import { useState, useEffect } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createPublicClient, createWalletClient, custom, http, parseUnits, formatUnits } from "viem";
import { celo, celoAlfajores } from "viem/chains";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { MARKET_ABI, ERC20_ABI, G_TOKEN_ADDRESS, formatGD } from "@/lib/contracts";
import type { PredictionMarket, PredictionRange } from "@/lib/markets";

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? "44787");
const ACTIVE_CHAIN = CHAIN_ID === 42220 ? celo : celoAlfajores;
const RPC = CHAIN_ID === 42220 ? "https://forno.celo.org" : "https://alfajores-forno.celo-testnet.org";

type Step = "input" | "approving" | "staking" | "done" | "error";

interface Props {
  market: PredictionMarket & { contractAddress?: string; deadline: string };
  range: PredictionRange;
  address: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StakeModal({ market, range, address, onClose, onSuccess }: Props) {
  const { wallets } = useWallets();
  const [step, setStep] = useState<Step>("input");
  const [amount, setAmount] = useState("");
  const [gdBalance, setGdBalance] = useState("0.00");
  const [minStake, setMinStake] = useState("1.00");
  const [alreadyStaked, setAlreadyStaked] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const contractAddress = market.contractAddress as `0x${string}` | undefined;

  const publicClient = createPublicClient({ chain: ACTIVE_CHAIN, transport: http(RPC) });

  // Load G$ balance, min stake, and whether user already staked
  useEffect(() => {
    if (!address || !contractAddress) return;
    const addr = address as `0x${string}`;
    Promise.all([
      publicClient.readContract({ address: G_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
      publicClient.readContract({ address: contractAddress, abi: MARKET_ABI, functionName: "minStakeAmount" }),
      publicClient.readContract({ address: contractAddress, abi: MARKET_ABI, functionName: "hasStaked", args: [addr] }),
    ]).then(([bal, min, staked]) => {
      setGdBalance(formatGD(bal as bigint));
      setMinStake(formatGD(min as bigint));
      setAlreadyStaked(staked as boolean);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contractAddress]);

  const getWalletClient = async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({ account: address as `0x${string}`, chain: ACTIVE_CHAIN, transport: custom(provider) });
  };

  const handleStake = async () => {
    if (!contractAddress) { setErrorMsg("This market has no on-chain contract yet."); setStep("error"); return; }
    if (!amount || parseFloat(amount) <= 0) return;

    const amountWei = parseUnits(amount, 18);
    const addr = address as `0x${string}`;

    try {
      const walletClient = await getWalletClient();

      // 1. Check current allowance
      const allowance = await publicClient.readContract({ address: G_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: [addr, contractAddress] }) as bigint;

      // 2. Approve if needed
      if (allowance < amountWei) {
        setStep("approving");
        const approveTx = await walletClient.writeContract({ address: G_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [contractAddress, amountWei] });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // 3. Stake
      setStep("staking");
      const rangeIndex = BigInt(market.ranges.findIndex((r) => r.id === range.id));
      const stakeTx = await walletClient.writeContract({ address: contractAddress, abi: MARKET_ABI, functionName: "stake", args: [rangeIndex, amountWei] });
      await publicClient.waitForTransactionReceipt({ hash: stakeTx });
      setTxHash(stakeTx);

      // 4. Record in Supabase for leaderboard/history
      await supabase.from("stakes").insert({
        wallet_address: addr.toLowerCase(),
        market_id: market.id,
        range_index: Number(rangeIndex),
        range_label: range.label,
        amount_gd: amount,
        tx_hash: stakeTx,
        status: "open",
      });

      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed.");
      setStep("error");
    }
  };

  const rangeIdx = market.ranges.findIndex((r) => r.id === range.id);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">

        {step === "done" ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">🎉</div>
            <h3 className="font-display text-xl font-bold">Stake placed!</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{amount} G$</span> on <span className="font-semibold text-foreground">{range.label}</span>
            </p>
            {txHash && (
              <a href={`${CHAIN_ID === 42220 ? "https://celoscan.io" : "https://alfajores.celoscan.io"}/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-primary underline-offset-4 hover:underline">
                View on explorer ↗
              </a>
            )}
            <Button className="mt-6 w-full" onClick={onSuccess}>Done</Button>
          </div>
        ) : step === "error" ? (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-3xl">⚠️</div>
            <h3 className="font-display text-lg font-bold">Transaction failed</h3>
            <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
              <Button className="flex-1" onClick={() => setStep("input")}>Try again</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Stake G$</h3>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{market.title}</p>

            {/* Selected range */}
            <div className="mb-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your range</p>
              <p className="font-display text-base font-bold">{range.label}</p>
            </div>

            {alreadyStaked && (
              <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                You already have a stake in this market.
              </div>
            )}

            {!contractAddress && (
              <div className="mb-4 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                This market isn&apos;t deployed on-chain yet — staking coming soon.
              </div>
            )}

            {/* Amount input */}
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">Amount (G$)</label>
                <span className="text-xs text-muted-foreground">Balance: <span className="font-semibold text-foreground">{gdBalance} G$</span></span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={minStake}
                  step="0.01"
                  placeholder={`Min ${minStake}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!!alreadyStaked || !contractAddress || step !== "input"}
                  className="h-12 w-full rounded-xl border border-input bg-background px-4 pr-16 text-sm outline-none ring-2 ring-transparent focus:ring-primary/30 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setAmount(gdBalance)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition"
                >
                  MAX
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Min stake: {minStake} G$ · Range #{rangeIdx}</p>
            </div>

            <Button
              className="mt-5 w-full h-12 text-base font-semibold"
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) < parseFloat(minStake) ||
                parseFloat(amount) > parseFloat(gdBalance) ||
                alreadyStaked ||
                !contractAddress ||
                step !== "input"
              }
              onClick={handleStake}
            >
              {step === "approving" ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Approving G$…</span>
              ) : step === "staking" ? (
                <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Staking…</span>
              ) : (
                `Stake ${amount || "—"} G$`
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
