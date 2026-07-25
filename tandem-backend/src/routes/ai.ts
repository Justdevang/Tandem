import { Router, Request, Response } from 'express';
import { MenuItem } from '../models/MenuItem.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { Forecast } from '../models/Forecast.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/ai/forecast
 * Generate demand forecasts using Gemini AI.
 * Reads InventoryLog history, builds a prompt, calls Gemini,
 * parses the response, writes Forecast documents.
 */
router.get('/forecast', verifyToken, requireRole('staff', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
      // Fallback: return existing forecasts or mock data
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

      // Generate basic heuristic forecasts if no Gemini key
      const items = await MenuItem.find();
      const forecasts = [];
      for (const item of items) {
        // Count recent orders for this item
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
      res.json(forecasts);
      return;
    }

    // ── Gemini-powered forecasting ─────────────────────────────
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
      res.status(500).json({ error: 'Failed to parse Gemini response' });
      return;
    }

    const predictions = JSON.parse(jsonMatch[0]);

    // Save forecasts to DB
    await Forecast.deleteMany({}); // Clear old forecasts
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
  } catch (error) {
    console.error('Error generating forecast:', error);
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

/**
 * POST /api/ai/assistant
 * Menu-constrained chat: pass the live menu as context,
 * instruct Gemini to only recommend dishes present in that list.
 */
router.post('/assistant', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Get live menu for context
    const menuItems = await MenuItem.find();
    const availableItems = menuItems.filter((item) => item.stockQty > 0);
    const menuContext = availableItems.map((item) => ({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      inStock: item.stockQty > 0,
    }));

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key-here') {
      // Fallback response without Gemini
      res.json({
        reply: `Here are some dishes I'd recommend from our menu today:\n\n${availableItems
          .slice(0, 3)
          .map((i) => `• **${i.name}** (₹${i.price}) — ${i.description}`)
          .join('\n')}\n\nWould you like to order any of these?`,
      });
      return;
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a friendly, knowledgeable restaurant assistant for "Tandem" restaurant. You help customers choose dishes from the menu.

CRITICAL RULES:
1. ONLY recommend dishes that are on the current menu below. NEVER invent or suggest dishes not on this list.
2. If an item is out of stock, mention it's currently unavailable.
3. Be warm, concise, and helpful. Use food descriptions to entice.
4. If asked about dietary preferences, filter from the menu below.
5. Keep responses under 150 words.

CURRENT MENU (only recommend from this list):
${JSON.stringify(menuContext, null, 2)}

Customer says: "${message}"`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('Error with assistant:', error);
    res.status(500).json({ error: 'Failed to get assistant response' });
  }
});

export default router;
