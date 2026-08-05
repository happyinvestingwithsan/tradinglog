import crypto from 'crypto';
import { RawTrade } from './tradeEngine';

export interface KiteSession {
  accessToken: string;
  publicToken: string;
  userId: string;
  userName: string;
  apiKey: string;
}

export interface KitePosition {
  tradingsymbol: string;
  exchange: string;
  instrument_token: number;
  product: string;
  quantity: number; // Positive for long, negative for short
  overnight_quantity: number;
  multiplier: number;
  average_price: number;
  close_price: number;
  last_price: number;
  value: number;
  pnl: number;
  realised: number;
  unrealised: number;
}

export async function exchangeKiteToken(
  apiKey: string,
  apiSecret: string,
  requestToken: string
): Promise<KiteSession> {
  const hash = crypto.createHash('sha256');
  hash.update(apiKey + requestToken + apiSecret);
  const checksum = hash.digest('hex');

  const response = await fetch('https://api.kite.trade/session/token', {
    method: 'POST',
    headers: {
      'X-Kite-Version': '3',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      api_key: apiKey,
      request_token: requestToken,
      checksum: checksum,
    }).toString(),
  });

  const json = await response.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Failed to authenticate with Zerodha Kite');
  }

  return {
    accessToken: json.data.access_token,
    publicToken: json.data.public_token,
    userId: json.data.user_id,
    userName: json.data.user_name,
    apiKey,
  };
}

export async function fetchKiteTrades(
  apiKey: string,
  accessToken: string
): Promise<RawTrade[]> {
  const response = await fetch('https://api.kite.trade/trades', {
    method: 'GET',
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${apiKey}:${accessToken}`,
    },
  });

  const json = await response.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch trades from Kite');
  }

  // Map Kite API response to our RawTrade format
  return json.data.map((t: any) => ({
    symbol: t.tradingsymbol,
    tradeDate: t.fill_timestamp.split(' ')[0], // YYYY-MM-DD
    tradeType: t.transaction_type.toLowerCase() as 'buy' | 'sell',
    quantity: Math.abs(t.quantity),
    price: Number(t.price),
    tradeId: t.trade_id,
    orderId: t.order_id,
    executionTime: t.fill_timestamp.replace(' ', 'T'), // ISO format
    expiryDate: '', // Kite API doesn't return expiry date directly in trades list (it can be extracted from symbol)
  }));
}

export async function fetchKitePositions(
  apiKey: string,
  accessToken: string
): Promise<KitePosition[]> {
  const response = await fetch('https://api.kite.trade/portfolio/positions', {
    method: 'GET',
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${apiKey}:${accessToken}`,
    },
  });

  const json = await response.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch positions from Kite');
  }

  return json.data.net || [];
}

export interface KiteMargins {
  availableCash: number;
  collateral: number;
  utilised: number;
  net: number;
}

export async function fetchKiteMargins(
  apiKey: string,
  accessToken: string
): Promise<KiteMargins> {
  const response = await fetch('https://api.kite.trade/user/margins', {
    method: 'GET',
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${apiKey}:${accessToken}`,
    },
  });

  const json = await response.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch margins from Kite');
  }

  const equity = json.data.equity || {};
  const available = equity.available || {};
  const utilised = equity.utilised || {};
  
  return {
    availableCash: Number(available.cash || 0),
    collateral: Number(available.collateral || 0),
    utilised: Number(utilised.debits || utilised.span || 0),
    net: Number(equity.net || 0),
  };
}

export interface KiteGttTrigger {
  id: number;
  type: string;
  status: string;
  condition: {
    tradingsymbol: string;
    trigger_values: number[];
  };
  orders: {
    transaction_type: string;
    quantity: number;
    price: number;
  }[];
}

export async function fetchKiteGttTriggers(
  apiKey: string,
  accessToken: string
): Promise<KiteGttTrigger[]> {
  const response = await fetch('https://api.kite.trade/gtt/triggers', {
    method: 'GET',
    headers: {
      'X-Kite-Version': '3',
      'Authorization': `token ${apiKey}:${accessToken}`,
    },
  });

  const json = await response.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Failed to fetch GTT triggers from Kite');
  }

  return json.data || [];
}
