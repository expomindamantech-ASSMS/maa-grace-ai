// cloud/services/usageService.js
const subRepo = require('../repositories/subscriptionRepo');
const { getLimits, isUnlimited } = require('../utils/limits');
const { throwError } = require('../utils/errors');

async function getUserPlan(user) {
  const sub = await subRepo.getActiveSub(user);
  if (!sub) return 'free';
  const plan = sub.get('plan');
  return plan ? (plan.get('slug') || 'free') : 'free';
}

async function checkAndIncrement(user, type) {
  const plan = await getUserPlan(user);
  const limits = getLimits(plan);
  const limit = limits[type === 'message' ? 'dailyMessages' : type === 'imageGen' ? 'imageGen' : 'imageSearch'];

  if (!isUnlimited(limit)) {
    const used = await subRepo.getUsage(user, type);
    if (used >= limit) throwError('LIMIT_EXCEEDED', `Daily ${type} limit reached (${limit}). Upgrade your plan.`);
  }
  await subRepo.incrementUsage(user, type);
}

async function getUsageSummary(user) {
  const plan = await getUserPlan(user);
  const limits = getLimits(plan);
  const [messages, imageGen, imageSearch] = await Promise.all([
    subRepo.getUsage(user, 'message'),
    subRepo.getUsage(user, 'imageGen'),
    subRepo.getUsage(user, 'imageSearch'),
  ]);
  return {
    plan,
    messages: { used: messages, limit: limits.dailyMessages },
    imageGen: { used: imageGen, limit: limits.imageGen },
    imageSearch: { used: imageSearch, limit: limits.imageSearch },
  };
}

module.exports = { getUserPlan, checkAndIncrement, getUsageSummary };
