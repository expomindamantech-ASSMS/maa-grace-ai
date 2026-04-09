// cloud/repositories/subscriptionRepo.js
const UserSubscription = Parse.Object.extend('UserSubscription');
const SubscriptionPlan = Parse.Object.extend('SubscriptionPlan');
const UsageLedger = Parse.Object.extend('UsageLedger');

async function getActiveSub(user) {
  const q = new Parse.Query(UserSubscription);
  q.equalTo('user', user);
  q.equalTo('status', 'active');
  q.greaterThan('expiresAt', new Date());
  q.include('plan');
  q.descending('createdAt');
  q.limit(1);
  const results = await q.find({ useMasterKey: true });
  return results[0] || null;
}

async function createSub(user, plan, expiresAt, paymentRef) {
  const sub = new UserSubscription();
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  sub.setACL(acl);
  sub.set('user', user);
  sub.set('plan', plan);
  sub.set('status', 'active');
  sub.set('expiresAt', expiresAt);
  sub.set('paymentRef', paymentRef);
  return await sub.save(null, { useMasterKey: true });
}

async function getOrCreateLedger(user, type) {
  const today = new Date().toISOString().split('T')[0];
  const q = new Parse.Query(UsageLedger);
  q.equalTo('user', user);
  q.equalTo('type', type);
  q.equalTo('date', today);
  let ledger = await q.first({ useMasterKey: true });
  if (!ledger) {
    ledger = new UsageLedger();
    const acl = new Parse.ACL(user);
    acl.setPublicReadAccess(false);
    ledger.setACL(acl);
    ledger.set('user', user);
    ledger.set('type', type);
    ledger.set('date', today);
    ledger.set('count', 0);
    await ledger.save(null, { useMasterKey: true });
  }
  return ledger;
}

async function incrementUsage(user, type) {
  const ledger = await getOrCreateLedger(user, type);
  ledger.increment('count');
  return await ledger.save(null, { useMasterKey: true });
}

async function getUsage(user, type) {
  const ledger = await getOrCreateLedger(user, type);
  return ledger.get('count') || 0;
}

async function getPlans() {
  const q = new Parse.Query(SubscriptionPlan);
  q.equalTo('active', true);
  q.ascending('order');
  return await q.find({ useMasterKey: true });
}

module.exports = { getActiveSub, createSub, getOrCreateLedger, incrementUsage, getUsage, getPlans };
