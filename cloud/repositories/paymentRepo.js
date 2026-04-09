// cloud/repositories/paymentRepo.js
const PaymentTransaction = Parse.Object.extend('PaymentTransaction');

async function createTransaction(user, ref, amount, plan, currency) {
  const tx = new PaymentTransaction();
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  tx.setACL(acl);
  tx.set('user', user);
  tx.set('reference', ref);
  tx.set('amount', amount);
  tx.set('plan', plan);
  tx.set('currency', currency || 'GHS');
  tx.set('status', 'pending');
  return await tx.save(null, { useMasterKey: true });
}

async function updateTransaction(ref, status, meta) {
  const q = new Parse.Query(PaymentTransaction);
  q.equalTo('reference', ref);
  const tx = await q.first({ useMasterKey: true });
  if (!tx) throw new Error('Transaction not found');
  tx.set('status', status);
  if (meta) tx.set('metadata', meta);
  return await tx.save(null, { useMasterKey: true });
}

async function getTransaction(ref) {
  const q = new Parse.Query(PaymentTransaction);
  q.equalTo('reference', ref);
  return await q.first({ useMasterKey: true });
}

module.exports = { createTransaction, updateTransaction, getTransaction };
