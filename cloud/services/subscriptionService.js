'use strict';
const subRepo = require('../repositories/subscriptionRepo');

async function getActiveSubscription(user) {
  const sub = await subRepo.getUserSubscription(user);
  if (!sub) return { plan: 'free', status: 'active' };
  if (sub.get('expiresAt') < new Date()) {
    sub.set('status', 'expired');
    await sub.save(null, { useMasterKey: true });
    return { plan: 'free', status: 'expired' };
  }
  return {
    plan: sub.get('plan'),
    status: sub.get('status'),
    expiresAt: sub.get('expiresAt'),
    objectId: sub.id,
  };
}

async function activateSubscription(user, plan, reference) {
  return subRepo.createSubscription(user, plan, reference);
}

async function listAvailablePlans() {
  const plans = await subRepo.listPlans();
  return plans.map(p => ({
    id: p.id,
    name: p.get('name'),
    price: p.get('price'),
    currency: p.get('currency') || 'GHS',
    features: p.get('features') || [],
  }));
}

module.exports = { getActiveSubscription, activateSubscription, listAvailablePlans };
