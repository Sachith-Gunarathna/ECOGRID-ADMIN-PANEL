// routes/notifications.js
// FCM Push Notification sender using Firebase Admin SDK

const express = require('express');
const router  = express.Router();
const { db, admin } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

// POST /api/notifications/send
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { title, body, target, data = {} } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body are required' });
    }

    // Fetch FCM tokens based on target
    let usersQuery = db.collection('users');
    if (target === 'verified') {
      usersQuery = usersQuery.where('isVerified', '==', true);
    }

    const usersSnap = await usersQuery.get();
    const tokens = [];

    usersSnap.forEach(doc => {
      const token = doc.data().fcmToken;
      if (token && typeof token === 'string' && token.length > 10) {
        tokens.push(token);
      }
    });

    if (tokens.length === 0) {
      return res.json({ success: true, message: 'No devices with FCM tokens found', sent: 0 });
    }

    // Send in batches of 500 (FCM limit)
    const BATCH_SIZE = 500;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);

      const message = {
        notification: { title, body },
        data: {
          title,
          body,
          type: 'admin_broadcast',
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        },
        tokens: batch,
        android: {
          priority: 'high',
          notification: {
            channelId: 'ecogrid_general',
            sound: 'default',
            color: '#00C853',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSent   += response.successCount;
      totalFailed += response.failureCount;

      // Clean up invalid tokens
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(batch[idx]);
          }
        }
      });

      // Remove invalid tokens from Firestore
      if (invalidTokens.length > 0) {
        const cleanupSnap = await db.collection('users')
          .where('fcmToken', 'in', invalidTokens.slice(0, 30)).get();
        const cleanBatch = db.batch();
        cleanupSnap.forEach(doc => {
          cleanBatch.update(doc.ref, { fcmToken: admin.firestore.FieldValue.delete() });
        });
        await cleanBatch.commit();
      }
    }

    // Save record to Firestore
    await db.collection('adminNotifications').add({
      title, body, target,
      sentTo: totalSent,
      failed: totalFailed,
      totalTokens: tokens.length,
      sentBy: req.user?.email || 'admin',
      createdAt: new Date().toISOString(),
      status: 'sent',
    });

    res.json({
      success: true,
      message: `Notification sent to ${totalSent} device(s)`,
      sent: totalSent,
      failed: totalFailed,
      total: tokens.length,
    });

  } catch (error) {
    console.error('FCM send error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/notifications/history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('adminNotifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
