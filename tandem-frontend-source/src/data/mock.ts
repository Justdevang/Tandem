export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: string
  stockQty: number
  reorderThreshold: number
  avgPrepMinutes?: number
  currentlyThrottled?: boolean
}

export const menuItems: MenuItem[] = [
  // Starters
  { id: 'm1', name: 'Samosa (2 pcs)', description: 'Crispy golden fried pastry stuffed with spiced potatoes & green peas', price: 60, category: 'Starters', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 8 },
  { id: 'm2', name: 'Paneer Tikka', description: 'Charred cottage cheese cubes marinated in spiced yogurt & mint', price: 220, category: 'Starters', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 12 },
  { id: 'm3', name: 'Chicken 65', description: 'Deep-fried chicken morsels tossed in red chili, curry leaves & lemon', price: 240, category: 'Starters', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 12 },
  { id: 'm4', name: 'Aloo Tikki (2 pcs)', description: 'Pan-fried spiced potato croquettes served with mint & tamarind chutney', price: 80, category: 'Starters', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 8 },
  { id: 'm5', name: 'Onion Bhaji / Pakora', description: 'Crispy onion fritters seasoned with carom seeds & coriander', price: 120, category: 'Starters', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 8 },
  { id: 'm6', name: 'Seekh Kebab', description: 'Charcoal-grilled minced mutton kebabs infused with aromatic herbs', price: 260, category: 'Starters', stockQty: 18, reorderThreshold: 5, avgPrepMinutes: 15 },
  { id: 'm7', name: 'Chicken Tikka', description: 'Tandoor roasted boneless chicken marinated in degi mirch & yogurt', price: 280, category: 'Starters', stockQty: 22, reorderThreshold: 5, avgPrepMinutes: 14 },
  { id: 'm8', name: 'Hara Bhara Kebab', description: 'Spinach, green pea & cottage cheese patties served with mint dip', price: 180, category: 'Starters', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 10 },

  // Soups
  { id: 'm9', name: 'Tomato Shorba', description: 'Flavorful Indian style tomato soup tempered with cumin & coriander stem', price: 110, category: 'Soups', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 7 },
  { id: 'm10', name: 'Sweet Corn Soup', description: 'Comforting creamy soup packed with sweet corn kernels & garden veg', price: 120, category: 'Soups', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 7 },
  { id: 'm11', name: 'Mulligatawny Soup', description: 'Traditional spiced lentil soup delicately flavored with coconut & curry powder', price: 130, category: 'Soups', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 8 },

  // Mains
  { id: 'm12', name: 'Paneer Butter Masala', description: 'Rich cottage cheese in velvet smooth cashew & tomato gravy', price: 260, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 14 },
  { id: 'm13', name: 'Dal Makhani', description: 'Overnight slow-cooked black lentils finished with cream & white butter', price: 220, category: 'Mains', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 12 },
  { id: 'm14', name: 'Chana Masala', description: 'North Indian chickpeas simmered in spicy onion-tomato masala', price: 190, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 12 },
  { id: 'm15', name: 'Palak Paneer', description: 'Fresh cottage cheese cubes simmered in creamy spinach puree', price: 240, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 12 },
  { id: 'm16', name: 'Malai Kofta', description: 'Melt-in-mouth cottage cheese dumplings in rich saffron gravy', price: 250, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 15 },
  { id: 'm17', name: 'Baingan Bharta', description: 'Smoky fire-roasted eggplant mashed with garlic, green chilies & tomatoes', price: 200, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 12 },
  { id: 'm18', name: 'Mixed Vegetable Curry', description: 'Assorted seasonal vegetables tossed in aromatic homestyle gravy', price: 190, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 12 },
  { id: 'm19', name: 'Kadai Paneer', description: 'Cottage cheese & crunchy bell peppers cooked in freshly ground kadai spices', price: 250, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 14 },
  { id: 'm20', name: 'Aloo Gobi', description: 'Dry roasted potato & cauliflower florets with cumin, ginger & turmeric', price: 180, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 10 },
  { id: 'm21', name: 'Butter Chicken', description: 'Tandoor roasted chicken in smooth butter & tomato reduction sauce', price: 320, category: 'Mains', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 15 },
  { id: 'm22', name: 'Chicken Curry', description: 'Classic rustic Indian chicken curry cooked with ground spices', price: 280, category: 'Mains', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 14 },
  { id: 'm23', name: 'Mutton Rogan Josh', description: 'Tender Kashmiri lamb braised in aromatic red chili & fennel gravy', price: 380, category: 'Mains', stockQty: 18, reorderThreshold: 4, avgPrepMinutes: 18 },
  { id: 'm24', name: 'Fish Curry', description: 'Coastal style fish fillets cooked in coconut milk, kokum & mustard seeds', price: 340, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 15 },
  { id: 'm25', name: 'Chicken Chettinad', description: 'Fiery South Indian chicken curry made with fresh roasted spices & coconut', price: 300, category: 'Mains', stockQty: 22, reorderThreshold: 5, avgPrepMinutes: 15 },
  { id: 'm26', name: 'Egg Curry', description: 'Hard-boiled eggs simmered in thick onion-tomato gravy with curry leaves', price: 180, category: 'Mains', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 10 },
  { id: 'm27', name: 'Prawn Masala', description: 'Fresh succulent prawns tossed in tangy spicy onion tomato gravy', price: 360, category: 'Mains', stockQty: 16, reorderThreshold: 4, avgPrepMinutes: 15 },
  { id: 'm28', name: 'Chicken Korma', description: 'Mild chicken curry cooked in almond & cashew cream sauce', price: 300, category: 'Mains', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 15 },

  // Rice & Biryani
  { id: 'm29', name: 'Vegetable Biryani', description: 'Aromatic basmati rice cooked with garden veg, saffron & whole spices', price: 220, category: 'Rice & Biryani', stockQty: 30, reorderThreshold: 6, avgPrepMinutes: 15 },
  { id: 'm30', name: 'Chicken Biryani', description: 'Hyderabadi dum biryani layered with marinated chicken & fried onions', price: 280, category: 'Rice & Biryani', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 16 },
  { id: 'm31', name: 'Mutton Biryani', description: 'Slow cooked tender lamb layered with fragrant long grain basmati rice', price: 350, category: 'Rice & Biryani', stockQty: 20, reorderThreshold: 5, avgPrepMinutes: 18 },
  { id: 'm32', name: 'Jeera Rice', description: 'Fluffy basmati rice tempered with cumin seeds & pure ghee', price: 150, category: 'Rice & Biryani', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 8 },
  { id: 'm33', name: 'Steamed Rice', description: 'Steamed long grain basmati rice', price: 120, category: 'Rice & Biryani', stockQty: 50, reorderThreshold: 12, avgPrepMinutes: 6 },
  { id: 'm34', name: 'Curd Rice', description: 'Cooling South Indian rice mixed with tempered yogurt, mustard & pomegranate', price: 150, category: 'Rice & Biryani', stockQty: 25, reorderThreshold: 5, avgPrepMinutes: 6 },

  // Breads
  { id: 'm35', name: 'Naan (Plain)', description: 'Traditional soft tandoori flatbread', price: 50, category: 'Breads', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 5 },
  { id: 'm36', name: 'Butter/Garlic Naan', description: 'Clay tandoor baked naan brushed with garlic butter & fresh cilantro', price: 65, category: 'Breads', stockQty: 45, reorderThreshold: 15, avgPrepMinutes: 5 },
  { id: 'm37', name: 'Tandoori Roti', description: 'Whole wheat flatbread baked in charcoal clay oven', price: 40, category: 'Breads', stockQty: 60, reorderThreshold: 20, avgPrepMinutes: 4 },
  { id: 'm38', name: 'Paratha (Plain/Aloo)', description: 'Flaky whole wheat bread stuffed with seasoned potato filling', price: 60, category: 'Breads', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 6 },
  { id: 'm39', name: 'Kulcha', description: 'Soft leavened bread baked in tandoor with onion seed topping', price: 55, category: 'Breads', stockQty: 35, reorderThreshold: 10, avgPrepMinutes: 6 },
  { id: 'm40', name: 'Puri (2 pcs)', description: 'Puffed golden whole wheat deep-fried bread', price: 50, category: 'Breads', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 5 },

  // South Indian
  { id: 'm41', name: 'Masala Dosa', description: 'Crispy rice & lentil crepe stuffed with spiced potato masala', price: 150, category: 'South Indian', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 10 },
  { id: 'm42', name: 'Idli Sambar (2 pcs)', description: 'Steamed rice cakes served with hot lentil sambar & coconut chutney', price: 110, category: 'South Indian', stockQty: 35, reorderThreshold: 8, avgPrepMinutes: 6 },
  { id: 'm43', name: 'Vada (2 pcs)', description: 'Crispy savory black gram donuts served with sambar & coconut chutney', price: 100, category: 'South Indian', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 6 },
  { id: 'm44', name: 'Uttapam', description: 'Thick savory rice pancake topped with onions, tomatoes & green chilies', price: 150, category: 'South Indian', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 10 },
  { id: 'm45', name: 'Rava Dosa', description: 'Lacy crispy semolina crepe seasoned with black pepper & curry leaves', price: 160, category: 'South Indian', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 10 },

  // Accompaniments
  { id: 'm46', name: 'Raita', description: 'Cooling whipped yogurt with cucumber, roasted cumin & chili powder', price: 80, category: 'Accompaniments', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 3 },
  { id: 'm47', name: 'Papad', description: 'Crispy roasted lentil wafers served with green chutney', price: 40, category: 'Accompaniments', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 2 },
  { id: 'm48', name: 'Pickle', description: 'Tangy Indian green chili & raw mango pickle', price: 30, category: 'Accompaniments', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 1 },
  { id: 'm49', name: 'Green Chutney', description: 'Fresh mint, coriander, lime juice & green chili dip', price: 30, category: 'Accompaniments', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 1 },

  // Desserts
  { id: 'm50', name: 'Gulab Jamun (2 pcs)', description: 'Warm milk solid dumplings in cardamom flavored sugar syrup', price: 90, category: 'Desserts', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 4 },
  { id: 'm51', name: 'Rasmalai (2 pcs)', description: 'Soft cottage cheese discs soaked in saffron & pistachio milk', price: 120, category: 'Desserts', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 4 },
  { id: 'm52', name: 'Kheer', description: 'Rich rice pudding simmered with milk, cardamom & silvered almonds', price: 100, category: 'Desserts', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 4 },
  { id: 'm53', name: 'Jalebi', description: 'Crispy fried funnel spirals soaked in hot saffron sugar syrup', price: 90, category: 'Desserts', stockQty: 25, reorderThreshold: 6, avgPrepMinutes: 5 },
  { id: 'm54', name: 'Kulfi', description: 'Traditional dense Indian pistachio & malai ice cream on a stick', price: 100, category: 'Desserts', stockQty: 30, reorderThreshold: 8, avgPrepMinutes: 3 },

  // Beverages
  { id: 'm55', name: 'Masala Chai', description: 'Spiced Indian tea brewed with Assam leaves, ginger & cardamom', price: 40, category: 'Beverages', stockQty: 60, reorderThreshold: 20, avgPrepMinutes: 3 },
  { id: 'm56', name: 'Lassi (Sweet/Salted/Mango)', description: 'Traditional churned yogurt smoothie served chilled', price: 90, category: 'Beverages', stockQty: 40, reorderThreshold: 10, avgPrepMinutes: 4 },
  { id: 'm57', name: 'Buttermilk (Chaas)', description: 'Light spiced yogurt drink with roasted cumin & fresh coriander', price: 50, category: 'Beverages', stockQty: 45, reorderThreshold: 10, avgPrepMinutes: 3 },
  { id: 'm58', name: 'Fresh Lime Soda', description: 'Refreshing sparkling lime juice with sweet or salted syrup', price: 60, category: 'Beverages', stockQty: 50, reorderThreshold: 15, avgPrepMinutes: 3 },
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

export const tickets: Ticket[] = []

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
