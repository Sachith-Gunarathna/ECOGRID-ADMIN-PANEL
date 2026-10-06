const express = require('express');
const router = express.Router();
const { db, rtdb } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
router.get('/', verifyToken, async (req, res) => {
  try {
    let snapshot = await rtdb.ref('stations').once('value');
    let stationsData = snapshot.val();
    if (!stationsData) {
      snapshot = await rtdb.ref('Stations').once('value');
      stationsData = snapshot.val() || {};
    }
    const sessions = Object.entries(stationsData).map(([stationId, data]) => {
      const cs = data.current_session || {};
      const relay = cs.relay || data.relay || 'UNKNOWN';
      const status = cs.status || (relay === 'ON' ? 'CHARGING' : 'IDLE');
      return {
        stationId,
        relay,
        status,
        current_percent: cs.livePercentage ?? cs.current_percent ?? data.current_percent ?? 0,
        target_percent: parseFloat(cs.targetPercentage ?? cs.target_percent ?? data.target_percent ?? 100),
        energy_kwh: cs.energy_kwh ?? data.energy_kwh ?? 0,
        time_left_mins: cs.time_left_mins ?? data.time_left_mins ?? 0,
        capacity: cs.capacity ?? data.capacity ?? 0,
        isActive: relay === 'ON' || status === 'CHARGING',
      };
    });
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        try {
          const doc = await db.collection('Stations').doc(session.stationId).get();
          const stationInfo = doc.exists ? doc.data() : {};
          return {
            ...session,
            stationName: stationInfo.basicInfo?.name || session.stationId,
            stationAddress: stationInfo.basicInfo?.address || '',
            hardware_id: stationInfo.techSpecs?.hardware_id || session.stationId,
            photo_url: stationInfo.verification?.photo_url || '',
          };
        } catch {
          return session;
        }
      })
    );
    res.json({
      success: true,
      data: enriched,
      activeSessions: enriched.filter(s => s.isActive).length,
      totalStations: enriched.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/:stationId', verifyToken, async (req, res) => {
  try {
    const snapshot = await rtdb.ref(`Stations/${req.params.stationId}`).once('value');
    const data = snapshot.val();
    if (!data)
      return res.status(404).json({ success: false, message: 'No data for this station' });
    res.json({ success: true, data: { stationId: req.params.stationId, ...data } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get('/history/list', verifyToken, async (req, res) => {
  try {
    const { limit = 50, stationId, userId } = req.query;
    let query = db.collection('invoices').orderBy('createdAt', 'desc');
    if (stationId) query = query.where('evStation_id', '==', stationId);
    if (userId) query = query.where('uId', '==', userId);
    query = query.limit(parseInt(limit));
    const snapshot = await query.get();
    const invoices = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = { id: doc.id, ...doc.data() };
        try {
          const userDoc = await db.collection('users').doc(data.uId).get();
          if (userDoc.exists) data.userName = userDoc.data().name || data.uId;
        } catch { }
        try {
          const vDoc = await db.collection('vehicles').doc(data.vehicle_id).get();
          if (vDoc.exists) {
            const v = vDoc.data();
            data.vehicleName = `${v.brand} ${v.model}`;
          }
        } catch { }
        try {
          const sDoc = await db.collection('Stations').doc(data.evStation_id).get();
          if (sDoc.exists) data.stationName = sDoc.data().basicInfo?.name || data.evStation_id;
        } catch { }
        return data;
      })
    );
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.post('/:stationId/stop', verifyToken, async (req, res) => {
  try {
    await rtdb.ref(`Stations/${req.params.stationId}/relay`).set('OFF');
    res.json({
      success: true,
      message: `Charging stopped at station ${req.params.stationId}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
