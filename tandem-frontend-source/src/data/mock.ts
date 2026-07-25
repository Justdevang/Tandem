export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  stockQty: number
  reorderThreshold: number
}

export const menuItems: MenuItem[] = [
  { id: 'm1', name: 'Paneer Tikka Masala', description: 'Charred cottage cheese, tomato-cashew gravy, kasuri methi', price: 320, category: 'Mains', stockQty: 2, reorderThreshold: 5 },
  { id: 'm2', name: 'Butter Chicken', description: 'Tandoor-roasted chicken, tomato butter sauce', price: 380, category: 'Mains', stockQty: 14, reorderThreshold: 6 },
  { id: 'm3', name: 'Dal Tadka', description: 'Yellow lentils, cumin-garlic tempering, fresh coriander', price: 220, category: 'Mains', stockQty: 0, reorderThreshold: 5 },
  { id: 'm4', name: 'Malabar Fish Curry', description: 'Kingfish, coconut, kokum, curry leaf', price: 420, category: 'Mains', stockQty: 9, reorderThreshold: 4 },
  { id: 'm5', name: 'Tandoori Roti', description: 'Whole wheat, charcoal tandoor', price: 45, category: 'Breads', stockQty: 40, reorderThreshold: 15 },
  { id: 'm6', name: 'Garlic Naan', description: 'Maida, roasted garlic, coriander butter', price: 65, category: 'Breads', stockQty: 3, reorderThreshold: 10 },
  { id: 'm7', name: 'Hara Bhara Kebab', description: 'Spinach, green peas, potato, mint chutney', price: 240, category: 'Starters', stockQty: 11, reorderThreshold: 5 },
  { id: 'm8', name: 'Amritsari Fish Fry', description: 'Basa, carom seed batter, ajwain', price: 310, category: 'Starters', stockQty: 6, reorderThreshold: 4 },
  { id: 'm9', name: 'Gulab Jamun', description: 'Khoya dumplings, cardamom syrup, rabri', price: 140, category: 'Desserts', stockQty: 18, reorderThreshold: 8 },
  { id: 'm10', name: 'Masala Chai', description: 'Assam CTC, ginger, clove, star anise', price: 60, category: 'Beverages', stockQty: 50, reorderThreshold: 20 },
]

export const isAvailable = (item: MenuItem) => item.stockQty > 0

export type TicketStatus = 'new' | 'firing' | 'ready'

export type Ticket = {
  id: string
  table: number
  status: TicketStatus
  items: { name: string; qty: number; notes?: string }[]
  firedAt: string
  elapsedMin: number
}

export const tickets: Ticket[] = [
  {
    id: 'T-0231', table: 4, status: 'new', firedAt: '8:42 PM', elapsedMin: 1,
    items: [{ name: 'Butter Chicken', qty: 2 }, { name: 'Garlic Naan', qty: 3 }, { name: 'Masala Chai', qty: 2, notes: 'less sugar' }],
  },
  {
    id: 'T-0230', table: 7, status: 'new', firedAt: '8:40 PM', elapsedMin: 3,
    items: [{ name: 'Malabar Fish Curry', qty: 1 }, { name: 'Tandoori Roti', qty: 4 }],
  },
  {
    id: 'T-0228', table: 2, status: 'firing', firedAt: '8:31 PM', elapsedMin: 12,
    items: [{ name: 'Hara Bhara Kebab', qty: 2 }, { name: 'Amritsari Fish Fry', qty: 1, notes: 'extra spicy' }],
  },
  {
    id: 'T-0227', table: 9, status: 'firing', firedAt: '8:29 PM', elapsedMin: 14,
    items: [{ name: 'Butter Chicken', qty: 1 }, { name: 'Dal Tadka', qty: 1 }, { name: 'Tandoori Roti', qty: 2 }],
  },
  {
    id: 'T-0225', table: 1, status: 'ready', firedAt: '8:18 PM', elapsedMin: 24,
    items: [{ name: 'Gulab Jamun', qty: 2 }, { name: 'Masala Chai', qty: 1 }],
  },
]

export type Table = {
  id: number
  capacity: number
  status: 'free' | 'occupied' | 'billing'
}

export const tables: Table[] = [
  { id: 1, capacity: 2, status: 'billing' },
  { id: 2, capacity: 4, status: 'occupied' },
  { id: 3, capacity: 4, status: 'free' },
  { id: 4, capacity: 6, status: 'occupied' },
  { id: 5, capacity: 2, status: 'free' },
  { id: 6, capacity: 4, status: 'free' },
  { id: 7, capacity: 4, status: 'occupied' },
  { id: 8, capacity: 8, status: 'free' },
  { id: 9, capacity: 6, status: 'occupied' },
  { id: 10, capacity: 2, status: 'free' },
  { id: 11, capacity: 4, status: 'free' },
  { id: 12, capacity: 2, status: 'billing' },
]

export type Forecast = {
  itemId: string
  predictedDemand: number
  suggestedReorderQty: number
  window: string
}

export const forecasts: Forecast[] = [
  { itemId: 'm1', predictedDemand: 22, suggestedReorderQty: 25, window: 'next 48h' },
  { itemId: 'm3', predictedDemand: 18, suggestedReorderQty: 20, window: 'next 48h' },
  { itemId: 'm6', predictedDemand: 30, suggestedReorderQty: 35, window: 'weekend rush' },
]

export const topItems = [
  { name: 'Butter Chicken', orders: 142 },
  { name: 'Garlic Naan', orders: 118 },
  { name: 'Masala Chai', orders: 96 },
  { name: 'Paneer Tikka Masala', orders: 84 },
  { name: 'Gulab Jamun', orders: 61 },
]

export const revenueByDay = [
  { day: 'Mon', amount: 28400 },
  { day: 'Tue', amount: 24100 },
  { day: 'Wed', amount: 31200 },
  { day: 'Thu', amount: 29800 },
  { day: 'Fri', amount: 41600 },
  { day: 'Sat', amount: 52300 },
  { day: 'Sun', amount: 47900 },
]
