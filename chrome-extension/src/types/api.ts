export interface ApiResponse<T> {
  data: T;
  meta?: { total?: number; page?: number; limit?: number };
}

export interface ApiError {
  error: { code: string; message: string };
}

export interface Signal {
  id: number;
  category: string;
  title: string;
  intensity: number;
  confidence: number;
  direction: string | null;
  createdAt: string;
}

export interface Prediction {
  id: number;
  uuid: string;
  title: string;
  confidence: number;
  direction: string | null;
  outcome: string | null;
  score: number | null;
  deadline: string | null;
  createdAt: string;
}

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
}

export interface CreditBalance {
  creditsUsed: number;
  creditsGranted: number;
  unlimited: boolean;
}
