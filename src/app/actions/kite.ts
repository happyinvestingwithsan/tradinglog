"use server";

import { exchangeKiteToken, fetchKiteTrades, fetchKitePositions, fetchKiteMargins, fetchKiteGttTriggers, createKiteGttTrigger, KiteSession } from '@/lib/kite';
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

export async function validateAccessTokenAction(
  apiKey: string,
  accessToken: string
) {
  try {
    const response = await fetch('https://api.kite.trade/user/profile', {
      method: 'GET',
      headers: {
        'X-Kite-Version': '3',
        'Authorization': `token ${apiKey}:${accessToken}`,
      },
    });

    const json = await response.json();

    if (json.status !== 'success') {
      throw new Error(json.message || 'Invalid access token or session expired');
    }

    const session: KiteSession = {
      accessToken,
      publicToken: json.data.public_token || '',
      userId: json.data.user_id,
      userName: json.data.user_name,
      apiKey,
    };

    return { success: true, session };
  } catch (error: any) {
    console.error("Zerodha token validation error:", error);
    return { success: false, error: error.message || 'Failed to validate Access Token' };
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

    // Check if positions failed due to invalid token
    if (results[1].status === 'rejected') {
      const reason = results[1].reason?.message || '';
      console.error("Positions fetch failed:", reason);
      if (reason.toLowerCase().includes('token') || reason.toLowerCase().includes('session')) {
        return { 
          success: false, 
          isTokenExpired: true,
          error: 'Zerodha Kite session expired or token is invalid. Please reconnect today.' 
        };
      }
    }

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
