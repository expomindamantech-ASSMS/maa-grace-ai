// cloud/functions/subscriptions.js
const subRepo = require('../repositories/subscriptionRepo');
const { requireUser } = require('../utils/validators');

Parse.Cloud.define('getPlans', async (request) => {
  requireUser(request);
  const plans = await subRepo.getPlans();
  return plans.map(p => ({
    id: p.id,
    slug: p.get('slug'),
    name: p.get('name'),
    price: p.get('price'),
    currency: p.get('currency') || 'GHS',
    features: p.get('features') || [],
    popular: p.get('popular') || false,
  }));
});

// Seed default plans (run once from admin)
Parse.Cloud.define('seedPlans', async (request) => {
  if (!request.master) throw new Parse.Error(403, 'Master key required');
  const Plan = Parse.Object.extend('SubscriptionPlan');
  const plans = [
    { slug: 'free',    name: 'Free',    price: 0,  currency: 'GHS', order: 0, active: true, popular: false,
      features: ['10 messages/day','3 image generations','10 image searches'] },
    { slug: 'basic',   name: 'Basic',   price: 15, currency: 'GHS', order: 1, active: true, popular: false,
      features: ['100 messages/day','30 image generations','100 image searches','PDF/DOCX export'] },
    { slug: 'pro',     name: 'Pro',     price: 35, currency: 'GHS', order: 2, active: true, popular: true,
      features: ['500 messages/day','100 image generations','500 image searches','All exports','Voice transcription'] },
    { slug: 'premium', name: 'Premium', price: 80, currency: 'GHS', order: 3, active: true, popular: false,
      features: ['Unlimited messages','Unlimited image gen','Unlimited search','Priority AI','All features'] },
  ];
  for (const p of plans) {
    const obj = new Plan();
    Object.entries(p).forEach(([k, v]) => obj.set(k, v));
    await obj.save(null, { useMasterKey: true });
  }
  return { success: true, count: plans.length };
});
