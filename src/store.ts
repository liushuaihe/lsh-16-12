import { create } from "zustand"
import type { User, Card } from "../shared/types"
import { api } from "./api"

interface AppState {
  user: User | null
  cards: Card[]
  selectedCardId: string | null
  initialized: boolean
  login: (username: string) => Promise<void>
  fetchCards: () => Promise<void>
  selectCard: (cardId: string) => void
  refreshBalance: () => Promise<void>
  logout: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  cards: [],
  selectedCardId: null,
  initialized: false,

  login: async (username: string) => {
    const user = await api.login(username)
    set({ user, initialized: true })
    localStorage.setItem("userId", user.id)
    localStorage.setItem("username", user.username)
    await get().fetchCards()
  },

  fetchCards: async () => {
    const cards = await api.getCards()
    set({ cards, selectedCardId: cards.length > 0 ? cards[0].id : null })
  },

  selectCard: (cardId: string) => set({ selectedCardId: cardId }),

  refreshBalance: async () => {
    const user = get().user
    if (!user) return
    const assets = await api.getAssets(user.id)
    set({ user: { ...user, balance: assets.balance } })
  },

  logout: () => {
    set({ user: null, initialized: false })
    localStorage.removeItem("userId")
    localStorage.removeItem("username")
  },
}))
