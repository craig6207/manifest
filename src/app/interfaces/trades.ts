export interface Trades {
  id: number;
  name: string;
  slug: string;
}

export interface TradeSubcategories {
  id: number;
  tradeId: number;
  name: string;
  slug: string;
}
