// cloud/repositories/chatRepo.js
const ChatThread = Parse.Object.extend('ChatThread');
const ChatMessage = Parse.Object.extend('ChatMessage');

async function createThread(user, title) {
  const thread = new ChatThread();
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  thread.setACL(acl);
  thread.set('user', user);
  thread.set('title', title || 'New Chat');
  thread.set('messageCount', 0);
  thread.set('lastMessage', '');
  thread.set('lastMessageAt', new Date());
  return await thread.save(null, { useMasterKey: true });
}

async function getThreads(user) {
  const q = new Parse.Query(ChatThread);
  q.equalTo('user', user);
  q.descending('lastMessageAt');
  q.limit(100);
  return await q.find({ useMasterKey: true });
}

async function getThread(threadId, user) {
  const q = new Parse.Query(ChatThread);
  q.equalTo('user', user);
  const thread = await q.get(threadId, { useMasterKey: true });
  return thread;
}

async function updateThread(threadId, updates, user) {
  const thread = await getThread(threadId, user);
  Object.entries(updates).forEach(([k, v]) => thread.set(k, v));
  return await thread.save(null, { useMasterKey: true });
}

async function deleteThread(threadId, user) {
  const thread = await getThread(threadId, user);
  // Delete all messages
  const q = new Parse.Query(ChatMessage);
  q.equalTo('thread', thread);
  const msgs = await q.find({ useMasterKey: true });
  await Parse.Object.destroyAll(msgs, { useMasterKey: true });
  return await thread.destroy({ useMasterKey: true });
}

async function saveMessage(thread, user, role, content, imageUrl, metadata) {
  const msg = new ChatMessage();
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  msg.setACL(acl);
  msg.set('thread', thread);
  msg.set('user', user);
  msg.set('role', role);
  msg.set('content', content || '');
  if (imageUrl) msg.set('imageUrl', imageUrl);
  if (metadata) msg.set('metadata', metadata);
  msg.set('createdAt', new Date());
  const saved = await msg.save(null, { useMasterKey: true });
  // Update thread
  thread.increment('messageCount');
  thread.set('lastMessage', role === 'image' ? '[Image]' : (content || '').substring(0, 100));
  thread.set('lastMessageAt', new Date());
  await thread.save(null, { useMasterKey: true });
  return saved;
}

async function getMessages(threadId, user, limit, skip) {
  const thread = await getThread(threadId, user);
  const q = new Parse.Query(ChatMessage);
  q.equalTo('thread', thread);
  q.ascending('createdAt');
  q.limit(limit || 100);
  if (skip) q.skip(skip);
  return await q.find({ useMasterKey: true });
}

module.exports = { createThread, getThreads, getThread, updateThread, deleteThread, saveMessage, getMessages };
