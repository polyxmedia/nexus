import "server-only";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export interface PreTradeWarning {
  code: string;
  message: string;
  severity: "block" | "warn";
}

export interface PreTradeResult {
  allowed: boolean;
  warnings: PreTradeWarning[];
  accountCash?: number;
  estimatedCost?: number;
  currentPrice?: number;
  positionPercent?: number;
}

/** T212 account cash response shape */
interface T212CashResponse {
  free?: number;
  total?: number;
  ppl?: number;
  result?: number;
  invested?: number;
  blocked?: number;
}

/** T212 position shape from /equity/portfolio */
interface T212Position {
  ticker: string;
  quantity: number;
  currentPrice: number;
  averagePrice?: number;
  ppl?: number;
}

function isT212CashResponse(data: unknown): data is T212CashResponse {
  return typeof data === "object" && data !== null && "free" in data;
}

function isT212PositionArray(data: unknown): data is T212Position[] {
  return Array.isArray(data) && data.every(
    (p) => typeof p === "object" && p !== null && "ticker" in p
  );
}

/**
 * Build a blocked-order JSON response from a failed risk check.
 * Shared by both T212 and Coinbase order routes.
 */
export function riskBlockResponse(riskCheck: PreTradeResult) {
  return NextResponse.json(
    {
      error: riskCheck.warnings.find((w) => w.severity === "block")?.message,
      warnings: riskCheck.warnings,
    },
    { status: 400 },
  );
}

/**
 * Pre-trade risk gate for Trading 212 orders.
 * Checks account cash, position concentration, sell-side holdings, max order size,
 * and solvency (Keynes warning: can you survive until your thesis plays out?).
 */
export async function preTradeCheckT212(
  client: { getAccountCash: () => Promise<unknown>; getPositions: () => Promise<unknown> },
  ticker: string,
  quantity: number,
  direction: "BUY" | "SELL",
  limitPrice?: number | null,
  currentMarketPrice?: number | null,
  predictionId?: number | null,
): Promise<PreTradeResult> {
  const warnings: PreTradeWarning[] = [];
  let accountCash: number | undefined;
  let estimatedCost: number | undefined;
  let positionPercent: number | undefined;

  // Resolve the best available price for cost estimation
  const estimatePrice = limitPrice ?? currentMarketPrice ?? null;

  // 1. Check account cash
  try {
    const cashData = await client.getAccountCash();
    if (isT212CashResponse(cashData)) {
      accountCash = cashData.free;
    }

    if (accountCash !== undefined && direction === "BUY" && estimatePrice) {
      estimatedCost = Math.abs(quantity) * estimatePrice;
      if (estimatedCost > accountCash) {
        warnings.push({
          code: "INSUFFICIENT_CASH",
          message: `Order estimated cost ${fmt(estimatedCost)} exceeds available cash ${fmt(accountCash)}`,
          severity: "block",
        });
      } else if (estimatedCost > accountCash * 0.9) {
        warnings.push({
          code: "LOW_CASH_AFTER",
          message: `Order would use ${((estimatedCost / accountCash) * 100).toFixed(1)}% of available cash`,
          severity: "warn",
        });
      }
    }
  } catch {
    warnings.push({
      code: "CASH_CHECK_FAILED",
      message: "Could not verify account balance. Proceeding with order.",
      severity: "warn",
    });
  }

  // 2. Check positions: concentration (BUY) and holdings (SELL)
  try {
    const rawPositions = await client.getPositions();
    if (isT212PositionArray(rawPositions) && rawPositions.length > 0) {
      const totalInvested = rawPositions.reduce((sum, p) => {
        return typeof p.currentPrice === "number" && typeof p.quantity === "number"
          ? sum + Math.abs(p.currentPrice * p.quantity)
          : sum;
      }, 0);

      const existingPosition = rawPositions.find(
        (p) => p.ticker.toUpperCase() === ticker.toUpperCase()
      );

      if (direction === "SELL") {
        // SELL: verify user holds enough to sell
        const heldQty = existingPosition ? Math.abs(existingPosition.quantity) : 0;
        if (quantity > heldQty) {
          warnings.push({
            code: "INSUFFICIENT_HOLDINGS",
            message: `Sell quantity ${quantity} exceeds held position of ${heldQty} ${ticker}`,
            severity: "block",
          });
        }
      }

      if (existingPosition && totalInvested > 0) {
        const existingValue = Math.abs(existingPosition.currentPrice * existingPosition.quantity);
        positionPercent = (existingValue / totalInvested) * 100;

        if (direction === "BUY" && positionPercent > 25) {
          warnings.push({
            code: "CONCENTRATION_HIGH",
            message: `${ticker} already represents ${positionPercent.toFixed(1)}% of portfolio. Adding more increases concentration risk.`,
            severity: "warn",
          });
        }
      }
    } else if (direction === "SELL") {
      // No positions at all but trying to sell
      warnings.push({
        code: "INSUFFICIENT_HOLDINGS",
        message: `No existing position in ${ticker} to sell`,
        severity: "block",
      });
    }
  } catch {
    // Position check is best-effort for BUY, but warn for SELL
    if (direction === "SELL") {
      warnings.push({
        code: "HOLDINGS_CHECK_FAILED",
        message: "Could not verify holdings for sell order. Proceeding with caution.",
        severity: "warn",
      });
    }
  }

  // 3. Check max order size from settings
  try {
    const maxSizeRows = await db.select().from(schema.settings)
      .where(eq(schema.settings.key, "max_order_size"));
    if (maxSizeRows.length > 0) {
      const maxSize = parseFloat(maxSizeRows[0].value);
      if (quantity > maxSize) {
        warnings.push({
          code: "MAX_SIZE_EXCEEDED",
          message: `Order quantity ${quantity} exceeds max order size of ${maxSize}`,
          severity: "block",
        });
      }
    }
  } catch {
    // Settings check is best-effort
  }

  // 4. Keynes solvency check: can you survive until the prediction deadline?
  // "Markets can remain irrational longer than you can remain solvent."
  if (predictionId && direction === "BUY" && accountCash && estimatedCost) {
    try {
      const predRows = await db.select().from(schema.predictions)
        .where(eq(schema.predictions.id, predictionId));
      if (predRows.length > 0) {
        const pred = predRows[0];
        const daysToDeadline = Math.ceil(
          (new Date(pred.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const cashAfterTrade = accountCash - estimatedCost;
        const portfolioExposure = estimatedCost / accountCash;

        // Warn if position is large relative to remaining cash and deadline is far out
        // Rule: if you'd need a >15% adverse move to wipe remaining cash, and deadline is 14+ days away
        if (daysToDeadline > 14 && portfolioExposure > 0.3) {
          warnings.push({
            code: "SOLVENCY_TIMELINE",
            message: `Prediction deadline is ${daysToDeadline} days away. This trade uses ${(portfolioExposure * 100).toFixed(0)}% of cash, leaving ${fmt(cashAfterTrade)} buffer. Markets can move against you for weeks before your thesis plays out. Consider sizing down.`,
            severity: "warn",
          });
        }

        // Warn if deadline is very close but confidence is low
        if (daysToDeadline <= 3 && pred.confidence < 0.6) {
          warnings.push({
            code: "LOW_CONFIDENCE_NEAR_DEADLINE",
            message: `Only ${daysToDeadline} days to prediction deadline at ${(pred.confidence * 100).toFixed(0)}% confidence. Risk/reward is unfavorable this close to expiry.`,
            severity: "warn",
          });
        }
      }
    } catch {
      // Prediction check is best-effort
    }
  }

  const blocked = warnings.some((w) => w.severity === "block");

  return {
    allowed: !blocked,
    warnings,
    accountCash,
    estimatedCost,
    positionPercent,
  };
}

/**
 * Pre-trade risk gate for Coinbase crypto orders.
 * Checks available balance for the relevant currency.
 */
export async function preTradeCheckCoinbase(
  client: {
    getAccounts: () => Promise<Array<{ currency: { code: string }; available_balance: { value: string } }>>;
    getProduct: (productId: string) => Promise<{ price: string; base_currency_id: string; quote_currency_id: string }>;
  },
  productId: string,
  side: "BUY" | "SELL",
  amount: number,
): Promise<PreTradeResult> {
  const warnings: PreTradeWarning[] = [];
  let accountCash: number | undefined;
  let estimatedCost: number | undefined;
  let currentPrice: number | undefined;

  try {
    const [accounts, product] = await Promise.all([
      client.getAccounts(),
      client.getProduct(productId),
    ]);

    currentPrice = parseFloat(product.price);
    const baseCurrency = product.base_currency_id;
    const quoteCurrency = product.quote_currency_id;

    if (side === "BUY") {
      // BUY: amount is in quote currency (e.g. USD). Check quote balance.
      const quoteAccount = accounts.find((a) => a.currency.code === quoteCurrency);
      accountCash = quoteAccount ? parseFloat(quoteAccount.available_balance.value) : undefined;
      estimatedCost = amount; // amount IS the quote currency spend

      if (accountCash !== undefined && amount > accountCash) {
        warnings.push({
          code: "INSUFFICIENT_BALANCE",
          message: `Order amount ${fmt(amount)} ${quoteCurrency} exceeds available ${fmt(accountCash)} ${quoteCurrency}`,
          severity: "block",
        });
      }
    } else {
      // SELL: amount is in base currency (e.g. BTC). Check base balance.
      const baseAccount = accounts.find((a) => a.currency.code === baseCurrency);
      const available = baseAccount ? parseFloat(baseAccount.available_balance.value) : undefined;
      accountCash = available;

      if (available !== undefined && amount > available) {
        warnings.push({
          code: "INSUFFICIENT_BALANCE",
          message: `Sell amount ${amount} ${baseCurrency} exceeds available ${available} ${baseCurrency}`,
          severity: "block",
        });
      }

      estimatedCost = currentPrice ? amount * currentPrice : undefined;
    }
  } catch {
    warnings.push({
      code: "BALANCE_CHECK_FAILED",
      message: "Could not verify account balance. Proceeding with order.",
      severity: "warn",
    });
  }

  const blocked = warnings.some((w) => w.severity === "block");

  return {
    allowed: !blocked,
    warnings,
    accountCash,
    estimatedCost,
    currentPrice,
  };
}

const currencyFmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (value: number) => currencyFmt.format(value);
