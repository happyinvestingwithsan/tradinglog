"use server";

import { exchangeKiteToken, fetchKiteTrades, fetchKitePositions, fetchKiteMargins, fetchKiteGttTriggers, createKiteGttTrigger } from '@/lib/kite';
import { RawTrade } from '@/lib/tradeEngine';

export async function authenticateKiteAction(
  apiKey: string,
  apiSecret: string,
  requestToken: string
) {
  try {
    const session = await exchangeKiteToken(apiKey, apiSecret, requestToken);
    return { success: true, session };
  } catch (error: any) {
    console.error("Zerodha auth error:", error);
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

export async function fetchKiteDataAction(apiKey: string, accessToken: string) {
  try {
    const results = await Promise.allSettled([
      fetchKiteTrades(apiKey, accessToken),
      fetchKitePositions(apiKey, accessToken),
      fetchKiteMargins(apiKey, accessToken),
      fetchKiteGttTriggers(apiKey, accessToken),
    ]);

    const trades = results[0].status === 'fulfilled' ? results[0].value : [];
    const positions = results[1].status === 'fulfilled' ? results[1].value : [];
    const margins = results[2].status === 'fulfilled' ? results[2].value : null;
    const gttTriggers = results[3].status === 'fulfilled' ? results[3].value : [];

    // Log individual errors for visibility in server console
    if (results[0].status === 'rejected') console.error("Trades fetch failed:", results[0].reason);
    if (results[1].status === 'rejected') console.error("Positions fetch failed:", results[1].reason);
    if (results[2].status === 'rejected') console.error("Margins fetch failed:", results[2].reason);
    if (results[3].status === 'rejected') console.error("GTT Triggers fetch failed:", results[3].reason);

    return { 
      success: true, 
      trades, 
      positions, 
      margins, 
      gttTriggers 
    };
  } catch (error: any) {
    console.error("Zerodha fetch error:", error);
    return { success: false, error: error.message || 'Failed to fetch data from Kite Connect' };
  }
}

export async function createKiteGttAction(
  apiKey: string,
  accessToken: string,
  params: {
    symbol: string;
    quantity: number;
    ltp: number;
    triggerType: 'single' | 'two-leg';
    transactionType: 'BUY' | 'SELL';
    stopLoss?: {
      trigger: number;
      price: number;
    };
    target?: {
      trigger: number;
      price: number;
    };
  }
) {
  try {
    const res = await createKiteGttTrigger(apiKey, accessToken, params);
    return { success: true, data: res };
  } catch (error: any) {
    console.error("GTT placement action error:", error);
    return { success: false, error: error.message || 'Failed to place GTT order' };
  }
}
