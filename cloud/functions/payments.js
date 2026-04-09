// cloud/functions/payments.js
const paymentService  = require('../services/paymentService');
const paymentRepo     = require('../repositories/paymentRepo');
const subRepo         = require('../repositories/subscriptionRepo');
const { requireUser } = require('../utils/validators');
const { throwError }  = require('../utils/errors');

const PLANS = {
  basic:   { price: 15,  days: 30,  name: 'Basic'   },
  pro:     { price: 35,  days: 30,  name: 'Pro'      },
  premium: { price: 80,  days: 30,  name: 'Premium'  },
};

Parse.Cloud.define('initPayment', async (request) => {
  const user = requireUser(request);
  const { planSlug, callbackUrl } = request.params;
  const plan = PLANS[planSlug];
  if (!plan) throwError('INVALID_INPUT', 'Invalid plan.');

  const ref = `MGR-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
  const email = user.get('email');
  const amount = plan.price;

  const metadata = { planSlug, planName: plan.name, userId: user.id, days: plan.days };
  const data = await paymentService.initializePayment(email, amount, ref, metadata,
    callbackUrl || 'https://your-app-url.back4app.app/app.html?payment=success');

  await paymentRepo.createTransaction(user, ref, amount, planSlug, 'GHS');

  return { authorizationUrl: data.authorization_url, reference: ref };
});

Parse.Cloud.define('verifyPayment', async (request) => {
  const user = requireUser(request);
  const { reference } = request.params;
  if (!reference) throwError('INVALID_INPUT', 'Payment reference required.');

  const data = await paymentService.verifyPayment(reference);

  if (data.status !== 'success') {
    await paymentRepo.updateTransaction(reference, 'failed', data);
    throwError('PAYMENT_FAILED', 'Payment was not successful.');
  }

  // Check not already applied
  const existing = await paymentRepo.getTransaction(reference);
  if (existing && existing.get('status') === 'completed') {
    return { success: true, message: 'Already activated.' };
  }

  await paymentRepo.updateTransaction(reference, 'completed', data);

  // Activate subscription
  const meta = data.metadata || {};
  const planSlug = meta.planSlug || 'basic';
  const days = PLANS[planSlug]?.days || 30;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  // Create plan pointer
  const PlanClass = Parse.Object.extend('SubscriptionPlan');
  const q = new Parse.Query(PlanClass);
  q.equalTo('slug', planSlug);
  const planObj = await q.first({ useMasterKey: true });

  await subRepo.createSub(user, planObj, expiresAt, reference);

  return { success: true, plan: planSlug, expiresAt };
});

Parse.Cloud.define('getSubscription', async (request) => {
  const user = requireUser(request);
  const sub  = await subRepo.getActiveSub(user);
  if (!sub) return { active: false, plan: 'free' };
  return {
    active: true,
    plan: sub.get('plan')?.get('slug') || 'free',
    expiresAt: sub.get('expiresAt'),
  };
});
