import type { Card, OrderBook, Trade, PackSeries, DrawResult, PityCounter, UserAssets, User, PricePoint, VolumePoint, DepthData, TimeRange, Order, PriceAlert, AlertDirection } from "../shared/types"

const BASE = "/api"

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Network error" }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  login: (username: string) => request<User>("/assets/login", { method: "POST", body: JSON.stringify({ username }) }),

  getCards: () => request<Card[]>("/trading/cards"),

  getOrderBook: (cardId: string) => request<OrderBook>(`/trading/orders/book?cardId=${cardId}`),

  getRecentTrades: (cardId: string, limit = 20) => request<Trade[]>(`/trading/trades/recent?cardId=${cardId}&limit=${limit}`),

  createOrder: (userId: string, type: "buy" | "sell", cardId: string, price: number, quantity: number) =>
    request<{ order: Order; trades: Trade[] }>("/trading/orders", {
      method: "POST",
      body: JSON.stringify({ userId, type, cardId, price, quantity }),
    }),

  cancelOrder: (orderId: string, userId: string) =>
    request<{ success: boolean; message: string; cooldownRemaining?: number }>(`/trading/orders/${orderId}`, {
      method: "DELETE",
      body: JSON.stringify({ userId }),
    }),

  getPackSeries: () => request<PackSeries[]>("/packs"),

  drawPack: (userId: string, packId: string, count: 1 | 10) =>
    request<DrawResult>(`/packs/${packId}/draw`, {
      method: "POST",
      body: JSON.stringify({ userId, count }),
    }),

  getPity: (userId: string, packId: string) => request<PityCounter>(`/packs/${packId}/pity?userId=${userId}`),

  getAssets: (userId: string) => request<UserAssets>(`/assets?userId=${userId}`),

  deposit: (userId: string, amount: number) =>
    request<{ balance: number }>("/assets/deposit", { method: "POST", body: JSON.stringify({ userId, amount }) }),

  getPriceHistory: (cardId: string, range: TimeRange) =>
    request<PricePoint[]>(`/market/price?cardId=${cardId}&range=${range}`),

  getVolumeHistory: (cardId: string, range: TimeRange) =>
    request<VolumePoint[]>(`/market/volume?cardId=${cardId}&range=${range}`),

  getDepthData: (cardId: string) => request<DepthData>(`/market/depth?cardId=${cardId}`),

  createAlert: (userId: string, cardId: string, thresholdPrice: number, direction: AlertDirection) =>
    request<PriceAlert>("/alerts", {
      method: "POST",
      body: JSON.stringify({ userId, cardId, thresholdPrice, direction }),
    }),

  getAlerts: (userId: string, cardId?: string) =>
    request<PriceAlert[]>(`/alerts?userId=${userId}${cardId ? `&cardId=${cardId}` : ""}`),

  closeAlert: (alertId: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/alerts/${alertId}/close`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  deleteAlert: (alertId: string, userId: string) =>
    request<{ success: boolean; message: string }>(`/alerts/${alertId}?userId=${userId}`, {
      method: "DELETE",
    }),
}
