import { v4 as uuid } from "uuid"
import { query, run } from "../db.js"
import type { PriceAlert, AlertDirection, AlertStatus } from "../../shared/types.js"

export function createAlert(
  userId: string,
  cardId: string,
  thresholdPrice: number,
  direction: AlertDirection
): PriceAlert | { error: string } {
  if (!userId) return { error: "缺少用户ID" }
  if (!cardId) return { error: "缺少卡牌ID" }
  if (!thresholdPrice || thresholdPrice <= 0) return { error: "无效的阈值价格" }
  if (direction !== "above" && direction !== "below") return { error: "无效的预警方向" }

  const now = Date.now()
  const alertId = uuid()

  run(
    "INSERT INTO price_alerts (id, userId, cardId, thresholdPrice, direction, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [alertId, userId, cardId, thresholdPrice, direction, "active", now]
  )

  const alert = query<PriceAlert>("SELECT * FROM price_alerts WHERE id = ?", [alertId])[0]
  return alert
}

export function getUserAlerts(userId: string, cardId?: string): PriceAlert[] {
  if (cardId) {
    return query<PriceAlert>(
      "SELECT * FROM price_alerts WHERE userId = ? AND cardId = ? ORDER BY createdAt DESC",
      [userId, cardId]
    )
  }
  return query<PriceAlert>(
    "SELECT * FROM price_alerts WHERE userId = ? ORDER BY createdAt DESC",
    [userId]
  )
}

export function getActiveAlertsByCard(cardId: string): PriceAlert[] {
  return query<PriceAlert>(
    "SELECT * FROM price_alerts WHERE cardId = ? AND status = 'active'",
    [cardId]
  )
}

export function closeAlert(alertId: string, userId: string): { success: boolean; message: string } {
  const alerts = query<PriceAlert>("SELECT * FROM price_alerts WHERE id = ? AND userId = ?", [alertId, userId])
  if (alerts.length === 0) return { success: false, message: "预警不存在" }

  run("UPDATE price_alerts SET status = 'closed' WHERE id = ?", [alertId])
  return { success: true, message: "预警已关闭" }
}

export function deleteAlert(alertId: string, userId: string): { success: boolean; message: string } {
  const alerts = query<PriceAlert>("SELECT * FROM price_alerts WHERE id = ? AND userId = ?", [alertId, userId])
  if (alerts.length === 0) return { success: false, message: "预警不存在" }

  run("DELETE FROM price_alerts WHERE id = ?", [alertId])
  return { success: true, message: "预警已删除" }
}

export function checkAndTriggerAlerts(cardId: string, tradePrice: number, tradeId: string, tradeTime: number): PriceAlert[] {
  const activeAlerts = getActiveAlertsByCard(cardId)
  const triggeredAlerts: PriceAlert[] = []

  for (const alert of activeAlerts) {
    let shouldTrigger = false
    if (alert.direction === "above" && tradePrice >= alert.thresholdPrice) {
      shouldTrigger = true
    } else if (alert.direction === "below" && tradePrice <= alert.thresholdPrice) {
      shouldTrigger = true
    }

    if (shouldTrigger) {
      run(
        "UPDATE price_alerts SET status = 'triggered', triggeredAt = ?, triggeredPrice = ?, triggeredTradeId = ? WHERE id = ?",
        [tradeTime, tradePrice, tradeId, alert.id]
      )
      triggeredAlerts.push({
        ...alert,
        status: "triggered" as AlertStatus,
        triggeredAt: tradeTime,
        triggeredPrice: tradePrice,
        triggeredTradeId: tradeId,
      })
    }
  }

  return triggeredAlerts
}
