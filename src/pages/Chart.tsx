import { useState, useEffect, useRef, useCallback } from "react"
import { useAppStore } from "@/store"
import { api } from "@/api"
import type { TimeRange, PricePoint, VolumePoint, DepthData, PriceAlert, AlertDirection } from "../../shared/types"
import { RARITY_COLORS } from "../../shared/types"
import { Bell, X, Trash2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react"

export default function Chart() {
  const { user, cards, selectedCardId, selectCard } = useAppStore()
  const [range, setRange] = useState<TimeRange>("1d")
  const [priceData, setPriceData] = useState<PricePoint[]>([])
  const [volumeData, setVolumeData] = useState<VolumePoint[]>([])
  const [depthData, setDepthData] = useState<DepthData | null>(null)
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [alertPrice, setAlertPrice] = useState("")
  const [alertDirection, setAlertDirection] = useState<AlertDirection>("above")
  const [creatingAlert, setCreatingAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    if (!selectedCardId || !user) return
    try {
      const [prices, volumes, depth, alertList] = await Promise.all([
        api.getPriceHistory(selectedCardId, range),
        api.getVolumeHistory(selectedCardId, range),
        api.getDepthData(selectedCardId),
        api.getAlerts(user.id, selectedCardId),
      ])
      setPriceData(prices)
      setVolumeData(volumes)
      setDepthData(depth)
      setAlerts(alertList)
    } catch {}
  }, [selectedCardId, range, user])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const selectedCard = cards.find((c) => c.id === selectedCardId)

  const handleCreateAlert = async () => {
    if (!user || !selectedCardId || !alertPrice) return
    setCreatingAlert(true)
    setAlertMessage(null)
    try {
      const price = Number(alertPrice) * 100
      await api.createAlert(user.id, selectedCardId, price, alertDirection)
      setAlertMessage({ type: "success", text: "预警创建成功！" })
      setAlertPrice("")
      fetchData()
    } catch (err) {
      setAlertMessage({ type: "error", text: err instanceof Error ? err.message : "创建失败" })
    } finally {
      setCreatingAlert(false)
    }
  }

  const handleCloseAlert = async (alertId: string) => {
    if (!user) return
    setAlertMessage(null)
    try {
      await api.closeAlert(alertId, user.id)
      setAlertMessage({ type: "success", text: "预警已关闭" })
      await fetchData()
    } catch (err) {
      setAlertMessage({ type: "error", text: err instanceof Error ? err.message : "关闭失败" })
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!user) return
    setAlertMessage(null)
    try {
      await api.deleteAlert(alertId, user.id)
      setAlertMessage({ type: "success", text: "预警已删除" })
      await fetchData()
    } catch (err) {
      setAlertMessage({ type: "error", text: err instanceof Error ? err.message : "删除失败" })
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-gold text-lg tracking-wider">MARKET CHART</h1>
        <div className="flex gap-2">
          {(["1h", "6h", "1d", "7d"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs transition-all ${
                range === r
                  ? "bg-gold text-primary font-bold"
                  : "bg-card text-muted hover:text-gold"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => selectCard(card.id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-all ${
              card.id === selectedCardId
                ? "border-gold bg-gold-dim text-gold"
                : "border-border bg-card text-muted hover:border-gold/30"
            }`}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
              style={{ backgroundColor: RARITY_COLORS[card.rarity] }}
            />
            {card.name}
          </button>
        ))}
      </div>

      {selectedCard && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-secondary rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="px-2 py-0.5 rounded text-xs font-bold"
                  style={{
                    backgroundColor: `rgba(${RARITY_COLORS[selectedCard.rarity] === "#f0b90b" ? "240,185,11" : RARITY_COLORS[selectedCard.rarity] === "#c850ff" ? "200,80,255" : RARITY_COLORS[selectedCard.rarity] === "#4a9eff" ? "74,158,255" : "139,139,139"},0.15)`,
                    color: RARITY_COLORS[selectedCard.rarity],
                  }}
                >
                  {selectedCard.rarity}
                </span>
                <span className="text-sm">{selectedCard.name}</span>
              </div>
              <PriceChart data={priceData} alerts={alerts} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-secondary rounded-xl border border-border p-4">
                <h3 className="text-xs text-muted mb-3">成交量</h3>
                <VolumeChart data={volumeData} />
              </div>

              <div className="bg-secondary rounded-xl border border-border p-4">
                <h3 className="text-xs text-muted mb-3">深度图</h3>
                {depthData ? (
                  <DepthChart data={depthData} />
                ) : (
                  <div className="h-40 flex items-center justify-center text-dimmed text-xs">
                    加载中...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-secondary rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-gold" />
                <h3 className="text-sm font-medium">价格预警</h3>
              </div>

              <div className="space-y-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => setAlertDirection("above")}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                      alertDirection === "above"
                        ? "bg-up text-white"
                        : "bg-card text-muted hover:text-up"
                    }`}
                  >
                    <TrendingUp size={12} className="inline mr-1" />
                    突破上方
                  </button>
                  <button
                    onClick={() => setAlertDirection("below")}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                      alertDirection === "below"
                        ? "bg-down text-white"
                        : "bg-card text-muted hover:text-down"
                    }`}
                  >
                    <TrendingDown size={12} className="inline mr-1" />
                    跌破下方
                  </button>
                </div>

                <div>
                  <label className="text-xs text-muted">预警价格 (G)</label>
                  <input
                    type="number"
                    value={alertPrice}
                    onChange={(e) => setAlertPrice(e.target.value)}
                    placeholder="输入目标价格"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-white mt-1 focus:outline-none focus:border-gold/50"
                  />
                </div>

                <button
                  onClick={handleCreateAlert}
                  disabled={creatingAlert || !alertPrice}
                  className="w-full py-2 rounded-lg text-sm font-bold bg-gold text-primary hover:bg-gold/90 transition-all disabled:opacity-50"
                >
                  {creatingAlert ? "创建中..." : "创建预警"}
                </button>

                {alertMessage && (
                  <p
                    className={`text-xs ${
                      alertMessage.type === "success" ? "text-up" : "text-down"
                    }`}
                  >
                    {alertMessage.text}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-secondary rounded-xl border border-border p-4">
              <h3 className="text-xs text-muted mb-3">预警列表</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {alerts.length === 0 && (
                  <p className="text-dimmed text-xs py-4 text-center">暂无预警</p>
                )}
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs ${
                      alert.status === "triggered"
                        ? "border-up/50 bg-up/5"
                        : alert.status === "closed"
                        ? "border-border bg-card/50 opacity-60"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {alert.status === "triggered" ? (
                          <AlertTriangle size={12} className="text-up" />
                        ) : alert.direction === "above" ? (
                          <TrendingUp size={12} className="text-up" />
                        ) : (
                          <TrendingDown size={12} className="text-down" />
                        )}
                        <span
                          className={`font-bold ${
                            alert.direction === "above" ? "text-up" : "text-down"
                          }`}
                        >
                          {alert.direction === "above" ? "≥" : "≤"} {(alert.thresholdPrice / 100).toFixed(0)} G
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {alert.status === "active" && (
                          <button
                            onClick={() => handleCloseAlert(alert.id)}
                            className="p-1 text-dimmed hover:text-gold transition-colors"
                            title="关闭预警"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1 text-dimmed hover:text-down transition-colors"
                          title="删除预警"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-dimmed">
                      <span>
                        {alert.status === "active" && "监控中"}
                        {alert.status === "triggered" && "已触发"}
                        {alert.status === "closed" && "已关闭"}
                      </span>
                      <span>
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {alert.triggeredAt && alert.triggeredPrice && (
                      <div className="mt-1 pt-1 border-t border-border/50 text-dimmed">
                        触发价: <span className="text-gold">{(alert.triggeredPrice / 100).toFixed(0)} G</span>
                        <span className="ml-2">
                          {new Date(alert.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PriceChart({ data, alerts }: { data: PricePoint[]; alerts: PriceAlert[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padding = { top: 20, right: 10, bottom: 25, left: 50 }

    ctx.clearRect(0, 0, w, h)

    const prices = data.map((d) => d.price)
    const activeAlertPrices = alerts
      .filter((a) => a.status === "active" || a.status === "triggered")
      .map((a) => a.thresholdPrice)
    const allRelevantPrices = [...prices, ...activeAlertPrices]
    const minP = Math.min(...allRelevantPrices)
    const maxP = Math.max(...allRelevantPrices)
    const range = maxP - minP || 1

    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    ctx.strokeStyle = "#2b3139"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(w - padding.right, y)
      ctx.stroke()

      const val = maxP - (range / 4) * i
      ctx.fillStyle = "#5e6673"
      ctx.font = "10px Orbitron"
      ctx.textAlign = "right"
      ctx.fillText((val / 100).toFixed(0), padding.left - 5, y + 3)
    }

    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom)
    gradient.addColorStop(0, "rgba(240, 185, 11, 0.2)")
    gradient.addColorStop(1, "rgba(240, 185, 11, 0)")

    ctx.beginPath()
    ctx.moveTo(padding.left, h - padding.bottom)
    data.forEach((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW
      const y = padding.top + (1 - (d.price - minP) / range) * chartH
      ctx.lineTo(x, y)
    })
    ctx.lineTo(padding.left + chartW, h - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = "#f0b90b"
    ctx.lineWidth = 2
    data.forEach((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartW
      const y = padding.top + (1 - (d.price - minP) / range) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    alerts.forEach((alert) => {
      const price = alert.thresholdPrice
      const y = padding.top + (1 - (price - minP) / range) * chartH

      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1

      if (alert.status === "active") {
        ctx.strokeStyle = alert.direction === "above" ? "rgba(0, 192, 135, 0.6)" : "rgba(246, 70, 93, 0.6)"
      } else if (alert.status === "triggered") {
        ctx.strokeStyle = "rgba(240, 185, 11, 0.8)"
      } else {
        ctx.strokeStyle = "rgba(94, 102, 115, 0.4)"
      }

      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(w - padding.right, y)
      ctx.stroke()
      ctx.setLineDash([])

      if (alert.status === "active" || alert.status === "triggered") {
        ctx.fillStyle = alert.status === "triggered" ? "#f0b90b" : alert.direction === "above" ? "#00c087" : "#f6465d"
        ctx.fillRect(padding.left, y - 8, 2, 16)

        ctx.font = "9px Orbitron"
        ctx.textAlign = "left"
        ctx.fillStyle = alert.status === "triggered" ? "#f0b90b" : alert.direction === "above" ? "#00c087" : "#f6465d"
        ctx.fillText((price / 100).toFixed(0), padding.left + 6, y + 3)
      }
    })

    alerts.forEach((alert) => {
      if (alert.status !== "triggered" || !alert.triggeredAt || !alert.triggeredPrice) return

      let x = padding.left
      if (data.length >= 2) {
        const triggeredTs = alert.triggeredAt
        let idx = 0
        for (let i = 1; i < data.length; i++) {
          if (data[i].timestamp > triggeredTs) break
          idx = i
        }
        const nextIdx = Math.min(idx + 1, data.length - 1)
        if (nextIdx > idx) {
          const ratio = (triggeredTs - data[idx].timestamp) / (data[nextIdx].timestamp - data[idx].timestamp)
          const interpIdx = idx + Math.max(0, Math.min(1, ratio))
          x = padding.left + (interpIdx / (data.length - 1)) * chartW
        } else {
          x = padding.left + (idx / (data.length - 1)) * chartW
        }
      }

      const y = padding.top + (1 - (alert.triggeredPrice - minP) / range) * chartH

      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(240, 185, 11, 0.3)"
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fillStyle = "#f0b90b"
      ctx.fill()
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 1
      ctx.stroke()
    })

    const last = data[data.length - 1]
    const lastX = padding.left + chartW
    const lastY = padding.top + (1 - (last.price - minP) / range) * chartH
    ctx.beginPath()
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2)
    ctx.fillStyle = "#f0b90b"
    ctx.fill()
    ctx.beginPath()
    ctx.arc(lastX, lastY, 7, 0, Math.PI * 2)
    ctx.strokeStyle = "rgba(240, 185, 11, 0.3)"
    ctx.lineWidth = 2
    ctx.stroke()
  }, [data, alerts])

  if (data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-dimmed text-xs">
        暂无价格数据
      </div>
    )
  }

  return <canvas ref={canvasRef} className="w-full h-52" />
}

function VolumeChart({ data }: { data: VolumePoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padding = { top: 10, right: 10, bottom: 20, left: 40 }

    ctx.clearRect(0, 0, w, h)

    const volumes = data.map((d) => d.volume)
    const maxV = Math.max(...volumes, 1)

    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom
    const barW = Math.max(2, chartW / data.length - 2)

    data.forEach((d, i) => {
      const x = padding.left + (i / data.length) * chartW
      const barH = (d.volume / maxV) * chartH
      const y = padding.top + chartH - barH

      ctx.fillStyle = "rgba(0, 192, 135, 0.5)"
      ctx.fillRect(x, y, barW, barH)
    })
  }, [data])

  if (data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-dimmed text-xs">
        暂无成交量数据
      </div>
    )
  }

  return <canvas ref={canvasRef} className="w-full h-36" />
}

function DepthChart({ data }: { data: DepthData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padding = { top: 10, right: 10, bottom: 20, left: 40 }

    ctx.clearRect(0, 0, w, h)

    const allPrices = [...data.buys, ...data.sells].map((d) => d.price)
    const minP = Math.min(...allPrices)
    const maxP = Math.max(...allPrices)
    const pRange = maxP - minP || 1
    const allQty = [...data.buys, ...data.sells].map((d) => d.quantity)
    const maxQ = Math.max(...allQty, 1)

    const chartW = w - padding.left - padding.right
    const chartH = h - padding.top - padding.bottom

    const midPrice = (minP + maxP) / 2
    const midX = padding.left + ((midPrice - minP) / pRange) * chartW

    const buyGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom)
    buyGrad.addColorStop(0, "rgba(0, 192, 135, 0.4)")
    buyGrad.addColorStop(1, "rgba(0, 192, 135, 0)")

    ctx.beginPath()
    ctx.moveTo(midX, h - padding.bottom)
    for (const b of data.buys) {
      const x = padding.left + ((b.price - minP) / pRange) * chartW
      const barH = (b.quantity / maxQ) * chartH
      ctx.lineTo(x, h - padding.bottom - barH)
    }
    ctx.lineTo(midX, h - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = buyGrad
    ctx.fill()

    const sellGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom)
    sellGrad.addColorStop(0, "rgba(246, 70, 93, 0.4)")
    sellGrad.addColorStop(1, "rgba(246, 70, 93, 0)")

    ctx.beginPath()
    ctx.moveTo(midX, h - padding.bottom)
    for (const s of data.sells) {
      const x = padding.left + ((s.price - minP) / pRange) * chartW
      const barH = (s.quantity / maxQ) * chartH
      ctx.lineTo(x, h - padding.bottom - barH)
    }
    ctx.lineTo(midX, h - padding.bottom)
    ctx.closePath()
    ctx.fillStyle = sellGrad
    ctx.fill()
  }, [data])

  if (data.buys.length === 0 && data.sells.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-dimmed text-xs">
        暂无深度数据
      </div>
    )
  }

  return <canvas ref={canvasRef} className="w-full h-36" />
}
