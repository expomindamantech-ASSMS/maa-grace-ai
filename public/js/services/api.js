'use strict';

window.API = {
  async call(fnName, params) {
    try {
      return await Parse.Cloud.run(fnName, params || {});
    } catch (e) {
      const msg = e.message || String(e);
      console.error(`API [${fnName}]:`, msg);
      throw new Error(msg);
    }
  },

  // Threads
  createThread: (title)           => window.API.call('createThread', { title }),
  listThreads:  ()                => window.API.call('listThreads'),
  renameThread: (threadId, title) => window.API.call('renameThread', { threadId, title }),
  deleteThread: (threadId)        => window.API.call('deleteThread', { threadId }),
  getMessages:  (threadId)        => window.API.call('getMessages',  { threadId }),

  // AI
  submitPrompt:   (p) => window.API.call('submitAiPrompt',  p),
  generateImage:  (p) => window.API.call('generateAiImage', p),
  transcribeVoice:(p) => window.API.call('transcribeVoice', p),
  searchPexels:   (p) => window.API.call('searchPexels',    p),

  // Usage & subscriptions
  getUsage:       ()  => window.API.call('getUsage'),
  getSubscription:()  => window.API.call('getSubscription'),
  listPlans:      ()  => window.API.call('listPlans'),

  // Payments
  initializePayment:(p) => window.API.call('initializePayment', p),
  verifyPayment:   (p)  => window.API.call('verifyPayment',     p),
};
