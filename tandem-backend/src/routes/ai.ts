import { Router, Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Forecast } from '../models/Forecast.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

// Helper to generate heuristic forecasts
async function generateHeuristicForecasts() {
  const items = await MenuItem.find();
  const forecasts = [];
  for (const item of items) {
    const recentLogs = await InventoryLog.find({
      menuItemId: item._id,
      reason: 'order',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const totalConsumed = recentLogs.reduce((sum, log) => sum + Math.abs(log.changeQty), 0);
    const dailyRate = totalConsumed / 7;
    const predictedDemand = Math.ceil(dailyRate * 2); // 48h forecast

    if (item.stockQty <= item.reorderThreshold || predictedDemand > item.stockQty) {
      const forecast = await Forecast.create({
        menuItemId: item._id,
        predictedDemand: predictedDemand || item.reorderThreshold,
        suggestedReorderQty: Math.max(predictedDemand, item.reorderThreshold) - item.stockQty + 5,
        model: 'heuristic',
      });
      forecasts.push({
        itemId: item._id.toString(),
        itemName: item.name,
        predictedDemand: forecast.predictedDemand,
        suggestedReorderQty: forecast.suggestedReorderQty,
        window: 'next 48h',
      });
    }
  }
  return forecasts;
}

/**
 * GET /api/ai/forecast
 * Generate demand forecasts using Gemini AI, with automatic heuristic fallback.
 */
router.get('/forecast', verifyToken, requireRole('staff', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
      const existing = await Forecast.find()
        .populate('menuItemId')
        .sort({ generatedAt: -1 });

      if (existing.length > 0) {
        const mapped = existing.map((f) => ({
          itemId: (f.menuItemId as any)?._id?.toString() || f.menuItemId.toString(),
          itemName: (f.menuItemId as any)?.name || 'Unknown',
          predictedDemand: f.predictedDemand,
          suggestedReorderQty: f.suggestedReorderQty,
          window: 'next 48h',
        }));
        res.json(mapped);
        return;
      }

      const fallbackData = await generateHeuristicForecasts();
      res.json(fallbackData);
      return;
    }

    // ── Gemini-powered forecasting with graceful fallback ─────────────
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const items = await MenuItem.find();
      const itemData = [];

      for (const item of items) {
        const logs = await InventoryLog.find({
          menuItemId: item._id,
          reason: 'order',
        })
          .sort({ createdAt: -1 })
          .limit(50);

        const totalConsumed = logs.reduce((sum, log) => sum + Math.abs(log.changeQty), 0);

        itemData.push({
          name: item.name,
          id: item._id.toString(),
          currentStock: item.stockQty,
          reorderThreshold: item.reorderThreshold,
          totalOrderedLast7d: totalConsumed,
          orderCount: logs.length,
        });
      }

      const prompt = `You are a restaurant inventory analyst. Based on the following consumption data, predict demand for the next 48 hours and suggest reorder quantities.

DATA:
${JSON.stringify(itemData, null, 2)}

Return a JSON array with objects for items that need attention (low stock or high demand). Each object should have:
- id: the item id string
- name: the item name
- predictedDemand: estimated units needed in next 48h (number)
- suggestedReorderQty: how many units to reorder (number)

Only include items where current stock is below the reorder threshold, OR predicted demand exceeds current stock. Return ONLY the JSON array, no other text.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON from Gemini response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON array from Gemini response');
      }

      const predictions = JSON.parse(jsonMatch[0]);

      // Save forecasts to DB
      await Forecast.deleteMany({});
      const savedForecasts = [];

      for (const pred of predictions) {
        const forecast = await Forecast.create({
          menuItemId: pred.id,
          predictedDemand: pred.predictedDemand,
          suggestedReorderQty: pred.suggestedReorderQty,
          model: 'gemini',
        });
        savedForecasts.push({
          itemId: pred.id,
          itemName: pred.name,
          predictedDemand: pred.predictedDemand,
          suggestedReorderQty: pred.suggestedReorderQty,
          window: 'next 48h',
        });
      }

      res.json(savedForecasts);
    } catch (geminiErr) {
      console.warn('Gemini forecast request failed. Falling back to heuristic model:', geminiErr);
      const fallbackData = await generateHeuristicForecasts();
      res.json(fallbackData);
    }
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

/**
 * Helper to build an intelligent fallback response when Gemini is unavailable.
 * Also parses ordering/add-to-cart intent locally.
 */
function buildSmartMenuFallback(message: string, availableItems: any[]): { reply: string; actionTag?: string } {
  if (!availableItems || availableItems.length === 0) {
    return { reply: "Our kitchen is currently updating the menu. Please check back in a moment!" };
  }

  const query = message.toLowerCase();

  // Check if customer wants to place order
  if (query.includes('place order') || query.includes('checkout') || query.includes('send order') || query.includes('confirm order')) {
    return {
      reply: "I'm submitting your order to the kitchen now!",
      actionTag: '[ACTION:PLACE_ORDER]',
    };
  }

  // Check if customer wants to add specific items to cart
  const addedItems: { name: string; qty: number }[] = [];
  for (const item of availableItems) {
    if (query.includes(item.name.toLowerCase())) {
      // Extract quantity if mentioned before or after item name (e.g., "2 butter chicken")
      const qtyMatch = query.match(new RegExp(`(\\d+)\\s*${item.name.toLowerCase()}`)) || query.match(new RegExp(`${item.name.toLowerCase()}\\s*(\\d+)`));
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
      addedItems.push({ name: item.name, qty });
    }
  }

  if (addedItems.length > 0) {
    const itemSummary = addedItems.map((i) => `${i.qty}x ${i.name}`).join(', ');
    const actionTag = `[ACTION:ADD_TO_CART: ${JSON.stringify(addedItems)}]`;
    return {
      reply: `Added ${itemSummary} to your cart! You can see your order summary at the bottom of the screen. Would you like to add anything else or place your order?`,
      actionTag,
    };
  }

  // Search by category, name, or description
  const matchingItems = availableItems.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(query);
    const descMatch = item.description.toLowerCase().includes(query);
    const catMatch = item.category.toLowerCase().includes(query);
    return nameMatch || descMatch || catMatch;
  });

  if (matchingItems.length > 0) {
    const list = matchingItems
      .slice(0, 4)
      .map((i) => `• ${i.name} (₹${i.price}) — ${i.description}`)
      .join('\n');
    return {
      reply: `Here are the matching items on our menu for "${message}":\n\n${list}\n\nTell me which ones you'd like to order!`,
    };
  }

  // General recommendation if no direct keyword match
  const recommendations = availableItems
    .slice(0, 3)
    .map((i) => `• ${i.name} (₹${i.price}) — ${i.description}`)
    .join('\n');

  return {
    reply: `I'm here to help! Here are some of our popular available dishes today:\n\n${recommendations}\n\nTell me what you'd like to order or ask about any category!`,
  };
}

/**
 * POST /api/ai/assistant
 * Menu-constrained chat with conversation history and automated ordering actions.
 */
router.post('/assistant', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();

    // Get live menu for context
    const menuItems = await MenuItem.find();
    const availableItems = menuItems.filter((item) => item.stockQty > 0);
    const fallbackRes = buildSmartMenuFallback(message, availableItems);
    const fallbackReply = fallbackRes.actionTag
      ? `${fallbackRes.reply}\n\n${fallbackRes.actionTag}`
      : fallbackRes.reply;

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
      res.json({ reply: fallbackReply });
      return;
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

      const menuContext = availableItems.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        inStock: item.stockQty > 0,
      }));

      const systemInstruction = `You are a friendly, knowledgeable restaurant assistant for "Tandem" restaurant. You help customers choose dishes and place orders.

CRITICAL RULES:
1. ONLY recommend dishes that are on the current menu below. NEVER invent or suggest dishes not on this list.
2. If an item is out of stock, mention it's currently unavailable.
3. Be warm, concise, and helpful. Use food descriptions to entice.
4. If asked about dietary preferences, filter from the menu below.
5. Keep responses concise (under 150 words).
6. ORDER ACTIONS:
   - When the customer wants to add items to their order/cart or says "I'll take X" / "Add X", confirm the items in text AND append at the very end:
     [ACTION:ADD_TO_CART: [{"name": "Exact Menu Item Name", "qty": 1}]]
   - When the customer asks to place/checkout their order (e.g. "place my order", "checkout", "send to kitchen"), confirm in text AND append at the very end:
     [ACTION:PLACE_ORDER]

CURRENT MENU (only recommend from this list):
${JSON.stringify(menuContext, null, 2)}`;

      const formattedHistory = (history || [])
        .slice(-10) // keep last 10 messages for memory efficiency
        .map((m: { role: string; text: string }) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

      let reply: string | undefined;

      // Try gemini-2.0-flash first, fallback to gemini-1.5-flash
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          systemInstruction,
        });
        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        reply = result.response.text();
      } catch (err20) {
        console.warn('gemini-2.0-flash chat failed, trying gemini-1.5-flash:', (err20 as Error).message);
        const model15 = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          systemInstruction,
        });
        const chat15 = model15.startChat({ history: formattedHistory });
        const result15 = await chat15.sendMessage(message);
        reply = result15.response.text();
      }

      if (reply) {
        res.json({ reply });
      } else {
        res.json({ reply: fallbackReply });
      }
    } catch (geminiErr) {
      console.warn('Gemini assistant chat request failed. Falling back to smart recommendation:', (geminiErr as Error).message);
      res.json({ reply: fallbackReply });
    }
  } catch (error) {
    console.error('Error with assistant:', error);
    res.status(500).json({ error: 'Failed to get assistant response' });
  }
});

export default router;
