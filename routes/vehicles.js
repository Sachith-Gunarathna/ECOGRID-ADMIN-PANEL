// routes/vehicles.js
// Vehicle management — matches Vehicle.java
// Fields: vehicle_id, brand, model, plate_number, battery_capacity_kwh, user_id, added_date, vehicle_type, isActive

const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const COLLECTION = 'vehicles';
const TYPES      = ['EV CAR', 'EV BIKE', 'EV TUK-TUK', 'EV MINI SCOOTER'];

// GET /api/vehicles
router.get('/', verifyToken, async (req, res) => {
  try {
    const { userId, active, type, limit = 100 } = req.query;

    let query = db.collection(COLLECTION).orderBy('added_date', 'desc');
    if (userId) query = query.where('user_id',      '==', userId);
    if (active  !== undefined) query = query.where('isActive', '==', active === 'true');
    if (type)   query = query.where('vehicle_type', '==', type);
    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const vehicles  = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: vehicles, count: vehicles.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/vehicles/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const vehicles  = snapshot.docs.map(d => d.data());

    const byType  = {};
    const byBrand = {};
    TYPES.forEach(t => { byType[t] = 0; });

    vehicles.forEach(v => {
      byType[v.vehicle_type]  = (byType[v.vehicle_type]  || 0) + 1;
      byBrand[v.brand]        = (byBrand[v.brand]        || 0) + 1;
    });

    const avgBattery = vehicles.length > 0
      ? Math.round(vehicles.reduce((s, v) => s + (v.battery_capacity_kwh || 0), 0) / vehicles.length)
      : 0;
    const topBrand   = Object.entries(byBrand).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    res.json({
      success: true,
      data: { total: vehicles.length, active: vehicles.filter(v => v.isActive).length, byType, byBrand, avgBattery, topBrand },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/vehicles/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists)
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/vehicles/:id/deactivate
router.patch('/:id/deactivate', verifyToken, async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).update({
      isActive:  false,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Vehicle deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
