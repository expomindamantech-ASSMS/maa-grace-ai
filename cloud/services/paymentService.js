// cloud/services/paymentService.js
const https = require('https');

function paystackRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const key = process.env.PAYSTACK_SECRET_KEY;
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.paystack.co',
      path,
      method: method || 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch(e) { reject(new Error('Paystack response error')); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function initializePayment(email, amount, ref, metadata, callbackUrl) {
  const body = { email, amount: Math.round(amount * 100), reference: ref, metadata, callback_url: callbackUrl };
  const resp = await paystackRequest('/transaction/initialize', 'POST', body);
  if (!resp.status) throw new Error(resp.message || 'Payment initialization failed');
  return resp.data;
}

async function verifyPayment(ref) {
  const resp = await paystackRequest(`/transaction/verify/${encodeURIComponent(ref)}`, 'GET');
  if (!resp.status) throw new Error(resp.message || 'Payment verification failed');
  return resp.data;
}

module.exports = { initializePayment, verifyPayment };
