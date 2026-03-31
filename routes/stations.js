// routes/stations.js
// Full CRUD for EV Stations
// Firestore: 'evStations' collection  |  Model: EVStation.java
// Realtime DB: 'Stations/{stationId}' for live hardware relay
// Firebase Storage: evStations/{stationId}/photo_*.jpg

const express = require('express');
const router  = express.Router();
const { db, rtdb, storage } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const COLLECTION = 'Stations';

// ─────────────────────────────────────────
// GET /api/stations — list with live RT data
// ─────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, verified, limit = 50, lastDoc } = req.query;

    let query = db.collection(COLLECTION).orderBy('basicInfo.name');
    if (status)    query = query.where('status', '==', status);
    if (verified !== undefined)
      query = query.where('verification.is_verified', '==', verified === 'true');
    if (lastDoc) {
      const last = await db.collection(COLLECTION).doc(lastDoc).get();
      query = query.startAfter(last);
    }
    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const stations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Enrich with live Realtime DB data
    const enriched = await Promise.all(
      stations.map(async (station) => {
        try {
          const rtSnap = await rtdb.ref(`Stations/${station.id}`).once('value');
          const rtData = rtSnap.val() || {};
          return {
            ...station,
            live: {
              relay:           rtData.relay || 'UNKNOWN',
              current_percent: rtData.current_percent ?? null,
              energy_kwh:      rtData.energy_kwh ?? null,
              time_left_mins:  rtData.time_left_mins ?? null,
            },
          };
        } catch {
          return { ...station, live: null };
        }
      })
    );

    res.json({
      success: true,
      data: enriched,
      count: enriched.length,
      lastDoc: snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null,
    });
  } catch (error) {
    console.error('GET /stations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/stations/stats
// ─────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    const stations = snapshot.docs.map(d => d.data());
    const byConnector = {};
    stations.forEach(s => {
      const c = s.techSpecs?.connection_type || 'Unknown';
      byConnector[c] = (byConnector[c] || 0) + 1;
    });
    res.json({
      success: true,
      data: {
        total:       stations.length,
        verified:    stations.filter(s => s.verification?.is_verified).length,
        unverified:  stations.filter(s => !s.verification?.is_verified).length,
        byConnector,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// GET /api/stations/:id
// ─────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists)
      return res.status(404).json({ success: false, message: 'Station not found' });

    const rtSnap   = await rtdb.ref(`Stations/${req.params.id}`).once('value');
    const liveData = rtSnap.val() || {};

    res.json({ success: true, data: { id: doc.id, ...doc.data(), live: liveData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// POST /api/stations — create station
// Body matches EVStation.java exactly
// ─────────────────────────────────────────
router.post('/', verifyToken, async (req, res) => {
  try {
    const { basicInfo, techSpecs, financial, verification } = req.body;

    if (!basicInfo?.name || !basicInfo?.address)
      return res.status(400).json({ success: false, message: 'Station name and address are required' });
    if (!techSpecs?.hardware_id)
      return res.status(400).json({ success: false, message: 'hardware_id is required' });
    if (!financial?.price_pre_kwh)
      return res.status(400).json({ success: false, message: 'price_pre_kwh is required' });

    // Check hardware_id uniqueness
    const existingHW = await db.collection(COLLECTION)
      .where('techSpecs.hardware_id', '==', techSpecs.hardware_id).limit(1).get();
    if (!existingHW.empty)
      return res.status(409).json({ success: false, message: 'hardware_id already exists' });

    const stationData = {
      basicInfo: {
        name:      basicInfo.name,
        address:   basicInfo.address,
        latitude:  basicInfo.latitude  || 0,
        longitude: basicInfo.longitude || 0,
        owner_id:  basicInfo.owner_id  || '',
        phone:     basicInfo.phone     || '',
      },
      techSpecs: {
        hardware_id:      techSpecs.hardware_id,
        connection_type:  techSpecs.connection_type || 'Type 2',
        power_output_kw:  techSpecs.power_output_kw || 7.4,
        ports:            techSpecs.ports           || 1,
      },
      financial: {
        price_pre_kwh:       financial.price_pre_kwh,
        payhere_merchant_id: financial.payhere_merchant_id || '',
      },
      verification: {
        is_verified: verification?.is_verified || false,
        photo_url:   verification?.photo_url   || '',
      },
      status:    'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: req.user.uid,
    };

    const docRef = await db.collection(COLLECTION).add(stationData);

    // Initialize Realtime DB node
    await rtdb.ref(`Stations/${docRef.id}`).set({
      relay:           'OFF',
      current_percent: 0,
      energy_kwh:      0,
      time_left_mins:  0,
      target_percent:  100,
      capacity:        0,
    });

    res.status(201).json({
      success: true,
      message: 'Station created successfully',
      data:    { id: docRef.id, ...stationData },
    });
  } catch (error) {
    console.error('POST /stations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// PUT /api/stations/:id — update station
// ─────────────────────────────────────────
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const docRef = db.collection(COLLECTION).doc(req.params.id);
    const doc    = await docRef.get();
    if (!doc.exists)
      return res.status(404).json({ success: false, message: 'Station not found' });

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.createdAt;
    delete updates.createdBy;

    await docRef.update(updates);
    res.json({ success: true, message: 'Station updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// PATCH /api/stations/:id/verify
// ─────────────────────────────────────────
router.patch('/:id/verify', verifyToken, async (req, res) => {
  try {
    const { is_verified } = req.body;
    await db.collection(COLLECTION).doc(req.params.id).update({
      'verification.is_verified': Boolean(is_verified),
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: `Station ${is_verified ? 'verified' : 'unverified'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// PATCH /api/stations/:id/photo — update photo_url after upload
// Called from admin panel after Firebase Storage upload completes
// Body: { photo_url: "https://storage.googleapis.com/..." }
// ─────────────────────────────────────────
router.patch('/:id/photo', verifyToken, async (req, res) => {
  try {
    const { photo_url } = req.body;
    await db.collection(COLLECTION).doc(req.params.id).update({
      'verification.photo_url': photo_url || '',
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Station photo updated', photo_url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// POST /api/stations/:id/relay — hardware relay control
// Writes to Realtime DB: Stations/{id}/relay = "ON" | "OFF"
// ─────────────────────────────────────────
router.post('/:id/relay', verifyToken, async (req, res) => {
  try {
    const { command } = req.body;
    if (!['ON', 'OFF'].includes(command))
      return res.status(400).json({ success: false, message: 'command must be "ON" or "OFF"' });

    await rtdb.ref(`Stations/${req.params.id}/relay`).set(command);

    res.json({
      success: true,
      message: `Relay ${command} command sent to station ${req.params.id}`,
      stationId: req.params.id,
      relay: command,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────
// DELETE /api/stations/:id
// ─────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await db.collection(COLLECTION).doc(req.params.id).delete();
    await rtdb.ref(`Stations/${req.params.id}`).remove();
    res.json({ success: true, message: 'Station deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
