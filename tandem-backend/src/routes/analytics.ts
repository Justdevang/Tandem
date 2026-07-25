import { Router, Request, Response } from 'express';
import { Order } from '../models/Order.js';
import { verifyToken, requireRole } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/analytics/summary
 * Revenue by day (last 7 days), top items, avg ticket, table turns.
 * All aggregated from real Order data.
 */
router.get('/summary', verifyToken, requireRole('staff', 'admin'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // ── Revenue by day ──────────────────────────────────────────
    const revenueByDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          status: { $in: ['served', 'billed'] },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'items.menuItemId',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: '$menuItem' },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          amount: { $sum: { $multiply: ['$menuItem.price', '$items.qty'] } },
          dayOfWeek: { $first: { $dayOfWeek: '$createdAt' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formattedRevenue = revenueByDay.map((d: any) => ({
      day: dayNames[d.dayOfWeek - 1] || d._id,
      amount: d.amount,
    }));

    // ── Top items ───────────────────────────────────────────────
    const topItems = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          orders: { $sum: '$items.qty' },
        },
      },
      { $sort: { orders: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: '$_id',
          orders: 1,
          _id: 0,
        },
      },
    ]);

    // ── Summary stats ───────────────────────────────────────────
    const totalOrders = await Order.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const weekTotal = formattedRevenue.reduce((sum: number, d: any) => sum + d.amount, 0);
    const avgTicket = totalOrders > 0 ? Math.round(weekTotal / totalOrders) : 0;

    // If no real data yet, return mock-shaped empty data
    if (formattedRevenue.length === 0) {
      res.json({
        revenueByDay: [],
        topItems: [],
        weekTotal: 0,
        totalOrders: 0,
        avgTicket: 0,
        tableTurns: '0x',
      });
      return;
    }

    res.json({
      revenueByDay: formattedRevenue,
      topItems,
      weekTotal,
      totalOrders,
      avgTicket,
      tableTurns: totalOrders > 0 ? `${(totalOrders / 12 / 7).toFixed(1)}x` : '0x',
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
