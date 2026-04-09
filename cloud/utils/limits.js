// cloud/utils/limits.js
const PLAN_LIMITS = {
  free:    { dailyMessages: 10,  monthlyMessages: 100,  imageGen: 3,  imageSearch: 10 },
  basic:   { dailyMessages: 100, monthlyMessages: 1000, imageGen: 30, imageSearch: 100 },
  pro:     { dailyMessages: 500, monthlyMessages: 5000, imageGen: 100,imageSearch: 500 },
  premium: { dailyMessages: -1,  monthlyMessages: -1,   imageGen: -1, imageSearch: -1 },
};

function getLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

function isUnlimited(val) {
  return val === -1;
}

module.exports = { PLAN_LIMITS, getLimits, isUnlimited };
