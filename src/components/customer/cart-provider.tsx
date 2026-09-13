'use client'

import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react'
import type { CustomerTableInfo, CustomerMenuCategory, ActiveOrder } from '../../services/customerTableService'
import { customerTableService } from '../../services/customerTableService'
import { getItemImageUrl } from '../../services/itemService'
import publicApi from '../../api/publicAxios'

export type CartLine = { itemId: number; qty: number; note?: string }
export type OrderStatus = 'idle' | 'placed' | 'preparing' | 'ready' | 'served'
export type WaiterRequestType = 'waiter' | 'water' | 'bill' | 'utensils'
export type WaiterRequest = {
  id: string
  type: WaiterRequestType
  time: number
  resolved: boolean
}

type RestaurantInfo = {
  name: string
  tagline?: string
  currency: string
  discountRate: number
}

type MenuItem = {
  id: number
  name: string
  name_ar: string
  code: string
  image?: string
  image_url?: string
  price: number
  department_id: number
  category_id: number
  category_name: string
}

type PlaceOrderResult = { success: boolean; message: string; data?: { order_id: number; order_number: string; is_update?: boolean } }

type CartContextValue = {
  tableInfo: CustomerTableInfo | null
  tableNumber: string
  categories: CustomerMenuCategory[]
  allItems: MenuItem[]
  restaurant: RestaurantInfo
  cart: CartLine[]
  placedItems: CartLine[]
  orderStatus: OrderStatus
  placedAt: number | null
  requests: WaiterRequest[]
  rating: number | null
  addToCart: (itemId: number, note?: string) => void
  removeLine: (itemId: number) => void
  setQty: (itemId: number, qty: number) => void
  cartCount: number
  cartTotal: number
  placeOrder: () => Promise<PlaceOrderResult | null>
  callWaiter: (type: WaiterRequestType) => void
  resolveRequest: (id: string) => void
  submitRating: (value: number) => void
  getItemById: (id: number) => MenuItem | undefined
  getItemImage: (item: MenuItem) => string
  billSummary: {
    subtotal: number
    discount: number
    total: number
  }
  activeOrderData: ActiveOrder | null
}

const CartContext = createContext<CartContextValue | null>(null)

type CartProviderProps = {
  children: ReactNode
  tableInfo: CustomerTableInfo | null
  categories: CustomerMenuCategory[]
  allItems: MenuItem[]
  restaurant: RestaurantInfo
  qrCode: string
}

export function CartProvider({ children, tableInfo, categories, allItems, restaurant, qrCode }: CartProviderProps) {
  const [cart, setCart] = useState<CartLine[]>([])
  const [placedItems, setPlacedItems] = useState<CartLine[]>([])
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle')
  const [placedAt, setPlacedAt] = useState<number | null>(null)
  const [requests, setRequests] = useState<WaiterRequest[]>([])
  const [rating, setRating] = useState<number | null>(null)

  const [activeOrderData, setActiveOrderData] = useState<ActiveOrder | null>(null)

  // جلب الطلب النشط من الداتا بيز عند تحميل الصفحة
  const fetchActiveOrder = useCallback(async () => {
    try {
      const activeOrder = await customerTableService.getActiveOrder(qrCode)
      if (activeOrder && activeOrder.items.length > 0) {
        // تحويل بيانات API إلى CartLine[]
        const lines: CartLine[] = activeOrder.items.map((item) => ({
          itemId: item.item_id,
          qty: item.quantity,
          note: item.notes ?? undefined,
        }))
        setPlacedItems(lines)
        setActiveOrderData(activeOrder)

        // تعيين حالة الطلب بناءً على status من الباك إند
        const statusMap: Record<string, OrderStatus> = {
          pending_confirmation: 'placed',
          pending: 'placed',
          preparing: 'preparing',
          ready: 'ready',
          served: 'served',
        }
        const mappedStatus = statusMap[activeOrder.status] || 'placed'
        setOrderStatus(mappedStatus)
        setPlacedAt(Date.now())
      }
    } catch {
      // إذا لم يكن هناك طلب نشط، نترك الحالة idle
    }
  }, [qrCode])

  useEffect(() => {
    fetchActiveOrder()
  }, [fetchActiveOrder])

  const getItemById = useCallback((id: number): MenuItem | undefined => {
    return allItems.find((item) => item.id === id)
  }, [allItems])

  const getItemImage = useCallback((item: MenuItem): string => {
    return getItemImageUrl({ image: item.image, image_url: item.image_url })
  }, [])

  const addToCart = useCallback((itemId: number, note?: string) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === itemId)
      if (existing) {
        return prev.map((l) =>
          l.itemId === itemId ? { ...l, qty: l.qty + 1, note: note ?? l.note } : l,
        )
      }
      return [...prev, { itemId, qty: 1, note }]
    })
  }, [])

  const removeLine = useCallback((itemId: number) => {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId))
  }, [])

  const setQty = useCallback((itemId: number, qty: number) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.itemId !== itemId)
        : prev.map((l) => (l.itemId === itemId ? { ...l, qty } : l)),
    )
  }, [])

  const cartCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart])

  const cartTotal = useMemo(
    () =>
      cart.reduce((s, l) => {
        const item = getItemById(l.itemId)
        return s + (item ? item.price * l.qty : 0)
      }, 0),
    [cart, getItemById],
  )

  const placeOrder = useCallback(async (): Promise<PlaceOrderResult | null> => {
    if (cart.length === 0) return null

    try {
      const items = cart.map((line) => ({
        item_id: line.itemId,
        quantity: line.qty,
        note: line.note ?? null,
      }))

      const res = await publicApi.post('/customer/orders', {
        qr_code: qrCode,
        items,
      })

      if (res.data.success) {
        // إفراغ السلة
        setCart([])

        // جلب الطلب المحدث من الباك إند (بدلاً من التعديل المحلي)
        await fetchActiveOrder()

        return {
          success: true,
          message: res.data.message,
          data: res.data.data,
        }
      }

      return { success: false, message: res.data.message || 'فشل إرسال الطلب' }
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'حدث خطأ أثناء إرسال الطلب',
      }
    }
  }, [cart, qrCode, fetchActiveOrder])

  const callWaiter = useCallback((type: WaiterRequestType) => {
    const req: WaiterRequest = {
      id: Math.random().toString(36).slice(2),
      type,
      time: Date.now(),
      resolved: false,
    }
    setRequests((prev) => [req, ...prev])
    setTimeout(() => {
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, resolved: true } : r)))
    }, 6000)
  }, [])

  const resolveRequest = useCallback((id: string) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, resolved: true } : r)))
  }, [])

  const submitRating = useCallback((value: number) => setRating(value), [])

  const billSummary = useMemo(() => {
    const subtotal = placedItems.reduce((s, l) => {
      const item = getItemById(l.itemId)
      return s + (item ? item.price * l.qty : 0)
    }, 0)
    const discount = subtotal * restaurant.discountRate
    return { subtotal, discount, total: subtotal - discount }
  }, [placedItems, getItemById, restaurant.discountRate])

  const value: CartContextValue = {
    tableInfo,
    tableNumber: tableInfo?.table_number ?? '',
    categories,
    allItems,
    restaurant,
    cart,
    placedItems,
    orderStatus,
    placedAt,
    requests,
    rating,
    addToCart,
    removeLine,
    setQty,
    cartCount,
    cartTotal,
    placeOrder,
    callWaiter,
    resolveRequest,
    submitRating,
    getItemById,
    getItemImage,
    billSummary,
    activeOrderData,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}