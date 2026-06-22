import { Router, type Request, type Response } from "express"
import * as alerts from "../services/alerts.js"
import type { AlertDirection } from "../../shared/types.js"

const router = Router()

router.post("/", (req: Request, res: Response) => {
  const { userId, cardId, thresholdPrice, direction } = req.body
  if (!userId || !cardId || !thresholdPrice || !direction) {
    res.status(400).json({ error: "缺少必要参数" })
    return
  }
  const dir = direction as AlertDirection
  if (dir !== "above" && dir !== "below") {
    res.status(400).json({ error: "无效的预警方向" })
    return
  }
  const result = alerts.createAlert(userId, cardId, Number(thresholdPrice), dir)
  if ("error" in result) {
    res.status(400).json({ error: result.error })
  } else {
    res.json(result)
  }
})

router.get("/", (req: Request, res: Response) => {
  const { userId, cardId } = req.query
  if (!userId) {
    res.status(400).json({ error: "缺少用户ID" })
    return
  }
  const result = alerts.getUserAlerts(userId as string, cardId as string | undefined)
  res.json(result)
})

router.post("/:id/close", (req: Request, res: Response) => {
  const { id } = req.params
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ error: "缺少用户ID" })
    return
  }
  const result = alerts.closeAlert(id, userId)
  if (!result.success) {
    res.status(400).json({ error: result.message })
  } else {
    res.json(result)
  }
})

router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params
  const { userId } = req.body
  if (!userId) {
    res.status(400).json({ error: "缺少用户ID" })
    return
  }
  const result = alerts.deleteAlert(id, userId)
  if (!result.success) {
    res.status(400).json({ error: result.message })
  } else {
    res.json(result)
  }
})

export default router
