// cloud/functions/ai.js
const aiService   = require('../services/aiService');
const imageService= require('../services/imageService');
const chatRepo    = require('../repositories/chatRepo');
const usageService= require('../services/usageService');
const { requireUser, validateImages, validatePrompt } = require('../utils/validators');
const { throwError } = require('../utils/errors');

// Submit AI prompt (text + optional images)
Parse.Cloud.define('submitAiPrompt', async (request) => {
  const user    = requireUser(request);
  const { prompt, images, threadId, history } = request.params;
  const cleanPrompt = validatePrompt(prompt);
  const cleanImages = validateImages(images || []);

  await usageService.checkAndIncrement(user, 'message');

  // Get or create thread
  let thread;
  if (threadId) {
    thread = await chatRepo.getThread(threadId, user);
  } else {
    const title = await aiService.generateTitle(cleanPrompt);
    thread = await chatRepo.createThread(user, title);
  }

  // Save user message
  const userMsg = await chatRepo.saveMessage(thread, user, 'user', cleanPrompt, null,
    cleanImages.length ? { imageCount: cleanImages.length } : null);

  // Generate AI response
  const aiText = await aiService.generateText(cleanPrompt, cleanImages, history || []);

  // Save assistant message
  const aiMsg = await chatRepo.saveMessage(thread, user, 'assistant', aiText);

  return {
    threadId: thread.id,
    threadTitle: thread.get('title'),
    userMessageId: userMsg.id,
    assistantMessageId: aiMsg.id,
    response: aiText,
  };
});

// Generate AI image
Parse.Cloud.define('generateAiImage', async (request) => {
  const user   = requireUser(request);
  const { prompt, threadId } = request.params;
  const cleanPrompt = validatePrompt(prompt);

  await usageService.checkAndIncrement(user, 'imageGen');

  let thread;
  if (threadId) {
    thread = await chatRepo.getThread(threadId, user);
  } else {
    thread = await chatRepo.createThread(user, 'Image Generation');
  }

  // Save user message
  await chatRepo.saveMessage(thread, user, 'user', `Generate image: ${cleanPrompt}`);

  // Generate image
  const imageData = await aiService.generateImage(cleanPrompt);

  // Save as Parse.File
  const b64 = imageData.split(',')[1];
  const mime = imageData.split(';')[0].split(':')[1];
  const ext  = mime === 'image/png' ? 'png' : 'jpg';
  const file  = new Parse.File(`ai-gen-${Date.now()}.${ext}`, { base64: b64 }, mime);
  await file.save({ useMasterKey: true });

  const imageUrl = file.url();
  await chatRepo.saveMessage(thread, user, 'image', cleanPrompt, imageUrl);

  return { threadId: thread.id, imageUrl, prompt: cleanPrompt };
});

// Transcribe voice
Parse.Cloud.define('transcribeVoice', async (request) => {
  const user = requireUser(request);
  const { audioBase64, mimeType } = request.params;
  if (!audioBase64) throwError('INVALID_INPUT', 'Audio data required.');
  await usageService.checkAndIncrement(user, 'message');
  const transcript = await aiService.transcribeAudio(audioBase64, mimeType);
  return { transcript };
});

// Search Pexels images
Parse.Cloud.define('searchImages', async (request) => {
  const user  = requireUser(request);
  const { query, perPage } = request.params;
  if (!query) throwError('INVALID_INPUT', 'Search query required.');
  await usageService.checkAndIncrement(user, 'imageSearch');
  const photos = await imageService.searchPexels(query, perPage || 20);
  return { photos };
});

// Get threads list
Parse.Cloud.define('getThreads', async (request) => {
  const user = requireUser(request);
  const threads = await chatRepo.getThreads(user);
  return threads.map(t => ({
    id: t.id,
    title: t.get('title'),
    lastMessage: t.get('lastMessage'),
    lastMessageAt: t.get('lastMessageAt'),
    messageCount: t.get('messageCount') || 0,
  }));
});

// Get messages for a thread
Parse.Cloud.define('getMessages', async (request) => {
  const user = requireUser(request);
  const { threadId, limit, skip } = request.params;
  if (!threadId) throwError('INVALID_INPUT', 'threadId required.');
  const messages = await chatRepo.getMessages(threadId, user, limit, skip);
  return messages.map(m => ({
    id: m.id,
    role: m.get('role'),
    content: m.get('content'),
    imageUrl: m.get('imageUrl'),
    metadata: m.get('metadata'),
    createdAt: m.createdAt,
  }));
});

// Create new thread
Parse.Cloud.define('createThread', async (request) => {
  const user = requireUser(request);
  const { title } = request.params;
  const thread = await chatRepo.createThread(user, title || 'New Chat');
  return { id: thread.id, title: thread.get('title') };
});

// Rename thread
Parse.Cloud.define('renameThread', async (request) => {
  const user = requireUser(request);
  const { threadId, title } = request.params;
  if (!threadId || !title) throwError('INVALID_INPUT', 'threadId and title required.');
  await chatRepo.updateThread(threadId, { title: title.trim().substring(0, 80) }, user);
  return { success: true };
});

// Delete thread
Parse.Cloud.define('deleteThread', async (request) => {
  const user = requireUser(request);
  const { threadId } = request.params;
  if (!threadId) throwError('INVALID_INPUT', 'threadId required.');
  await chatRepo.deleteThread(threadId, user);
  return { success: true };
});

// Get usage summary
Parse.Cloud.define('getUsage', async (request) => {
  const user = requireUser(request);
  return await usageService.getUsageSummary(user);
});
