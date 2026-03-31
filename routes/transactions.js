// routes/transactions.js
// Invoices, payments, PayHere webhook
// Invoice.java: invoiceId, transactionId, amount, date, uId, evStation_id, vehicle_id, createdAt, energy_kWh
// Payment.java:  uid, amount, customerToken, status, orderId, timestamp, stationId, targetPercentage

const express = require('express');
const router  = express.Router();
const { db }  = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { sendInvoiceEmail } = require('../services/emailService');
const crypto = require('crypto');

// GET /api/transactions — invoices with pagination + filter
router.get('/', verifyToken, async (req, res) => {
  try {
    const { limit = 50, lastDoc, uid, stationId } = req.query;

    let query = db.collection('invoices').orderBy('createdAt', 'desc');
    if (uid)       query = query.where('uId', '==', uid);
    if (stationId) query = query.where('evStation_id', '==', stationId);
    if (lastDoc) {
      const last = await db.collection('invoices').doc(lastDoc).get();
      query = query.startAfter(last);
    }
    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: invoices, count: invoices.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transactions/stats — revenue analytics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection('invoices').get();
    const invoices  = snapshot.docs.map(d => d.data());

    const monthly   = {};
    const byStation = {};

    invoices.forEach(inv => {
      const month = inv.createdAt ? inv.createdAt.substring(0, 7) : 'unknown';
      if (!monthly[month]) monthly[month] = { count: 0, revenue: 0, energy: 0 };
      monthly[month].count++;
      monthly[month].revenue += inv.amount || 0;
      monthly[month].energy  += parseFloat(inv.energy_kWh || 0);

      const sid = inv.evStation_id || 'unknown';
      if (!byStation[sid]) byStation[sid] = { count: 0, revenue: 0, energy: 0 };
      byStation[sid].count++;
      byStation[sid].revenue += inv.amount || 0;
      byStation[sid].energy  += parseFloat(inv.energy_kWh || 0);
    });

    const totalRevenue = invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalEnergy  = invoices.reduce((s, i) => s + parseFloat(i.energy_kWh || 0), 0);

    res.json({
      success: true,
      data: {
        totalInvoices:    invoices.length,
        totalRevenue:     Math.round(totalRevenue * 100) / 100,
        totalEnergyKwh:   Math.round(totalEnergy  * 100) / 100,
        avgPerSession:    invoices.length > 0
          ? Math.round((totalRevenue / invoices.length) * 100) / 100
          : 0,
        monthly,
        byStation,
        co2SavedKg:       Math.round(totalEnergy * 0.85 * 100) / 100,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/transactions/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const doc = await db.collection('invoices').doc(req.params.id).get();
    if (!doc.exists)
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/transactions/send-invoice — email invoice to user
// Called from PaymentConfirmationActivity.java
router.post('/send-invoice', async (req, res) => {
  try {
    const { transactionId, amount, date, stationId, email, vehicle } = req.body;
    if (!email || !transactionId)
      return res.status(400).json({ success: false, message: 'email and transactionId are required' });

    await sendInvoiceEmail({ email, transactionId, amount, date, stationId, vehicle });
    res.json({ success: true, message: 'Invoice email sent' });
  } catch (error) {
    console.error('send-invoice error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/transactions/payhere-webhook — PayHere notify_url
// Set this URL in PayHere dashboard as notify_url
router.post('/payhere-webhook', async (req, res) => {
  try {
    const {
      merchant_id, order_id, payment_id,
      payhere_amount, payhere_currency,
      status_code, md5sig,
      custom1, // Firebase UID (set in AddCardActivity.java)
    } = req.body;

    // Verify MD5 signature
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
    const merchantId     = process.env.PAYHERE_MERCHANT_ID;

    if (merchantSecret) {
      const secretHash  = crypto.createHash('md5').update(merchantSecret.toUpperCase()).digest('hex').toUpperCase();
      const expectedSig = crypto.createHash('md5')
        .update(`${merchantId}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`)
        .digest('hex').toUpperCase();

      if (md5sig !== expectedSig) {
        console.warn('⚠️ PayHere signature mismatch');
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
    }

    console.log(`📲 PayHere webhook: order=${order_id} status=${status_code} payment=${payment_id}`);

    const isSuccess = status_code === '2' || status_code === 2;
    const isFailed  = ['-1', '-2', -1, -2].includes(status_code);

    // Update payment document by orderId
    const paymentsSnap = await db.collection('payments')
      .where('orderId', '==', order_id).limit(1).get();

    if (!paymentsSnap.empty) {
      await paymentsSnap.docs[0].ref.update({
        status:        isSuccess ? 'SUCCESS' : isFailed ? 'FAILED' : 'PENDING',
        transactionId: payment_id || null,
        payhereAmount: payhere_amount,
        updatedAt:     new Date().toISOString(),
      });
    }

    if (custom1 && isSuccess && order_id.startsWith('Setup-')) {
      console.log(`💳 Card setup successful for user: ${custom1}`);
    }

    res.status(200).send('OK'); // Always 200 to prevent PayHere retries
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK');
  }
});

// GET /api/transactions/payments/list
router.get('/payments/list', verifyToken, async (req, res) => {
  try {
    const { limit = 50, status } = req.query;
    let query = db.collection('payments').orderBy('timestamp', 'desc');
    if (status) query = query.where('status', '==', status);
    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    const payments  = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
