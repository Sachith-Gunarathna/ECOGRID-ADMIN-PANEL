const express = require('express');
const router = express.Router();
const { db, rtdb } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const [usersSnap, stationsSnap, invoicesSnap, vehiclesSnap, rtSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('Stations').get(),
      db.collection('invoices').get(),
      db.collection('vehicles').get(),
      rtdb.ref('stations').once('value'),
    ]);
    const invoices = invoicesSnap.docs.map(d => d.data());
    const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalEnergy = invoices.reduce((s, i) => s + parseFloat(i.energy_kWh || 0), 0);
    let rtData = rtSnap.val();
    if (!rtData) {
      const fallbackSnap = await rtdb.ref('Stations').once('value');
      rtData = fallbackSnap.val() || {};
    }
    const activeSessions = Object.values(rtData).filter(s => {
      const cs = s.current_session;
      const relay = cs?.relay || s.relay;
      const status = cs?.status || s.status;
      return relay === 'ON' || status === 'CHARGING';
    }).length;
    const monthlyRevenue = {};
    const monthlyEnergy = {};
    invoices.forEach(inv => {
      const month = inv.createdAt ? inv.createdAt.substring(0, 7) : null;
      if (month) {
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (inv.amount || 0);
        monthlyEnergy[month] = (monthlyEnergy[month] || 0) + parseFloat(inv.energy_kWh || 0);
      }
    });
    const months = Object.keys(monthlyRevenue).sort().slice(-12);
    const revenueChart = months.map(m => ({ month: m, revenue: Math.round(monthlyRevenue[m] * 100) / 100 }));
    const energyChart = months.map(m => ({ month: m, energy: Math.round(monthlyEnergy[m] * 100) / 100 }));
    const stations = stationsSnap.docs.map(d => d.data());
    const recentSnap = await db.collection('invoices').orderBy('createdAt', 'desc').limit(10).get();
    const recent = recentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({
      success: true,
      data: {
        kpis: {
          totalUsers: usersSnap.size,
          totalStations: stationsSnap.size,
          verifiedStations: stations.filter(s => s.verification?.is_verified).length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalEnergyKwh: Math.round(totalEnergy * 100) / 100,
          totalSessions: invoicesSnap.size,
          totalVehicles: vehiclesSnap.size,
          activeSessions,
          co2SavedKg: Math.round(totalEnergy * 0.85 * 100) / 100,
          avgRevenuePerSession: invoicesSnap.size > 0
            ? Math.round((totalRevenue / invoicesSnap.size) * 100) / 100
            : 0,
        },
        charts: { revenueChart, energyChart },
        recentTransactions: recent,
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
