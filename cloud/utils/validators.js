// cloud/utils/validators.js
const { throwError } = require('./errors');

function requireUser(request) {
  if (!request.user) throwError('UNAUTHORIZED');
  return request.user;
}

function requireParam(params, key) {
  if (!params[key]) throwError('INVALID_INPUT', `Missing required param: ${key}`);
  return params[key];
}

function validateImages(images) {
  if (!Array.isArray(images)) return [];
  if (images.length > 4) throwError('INVALID_INPUT', 'Max 4 images allowed.');
  images.forEach((img, i) => {
    if (typeof img !== 'string') throwError('INVALID_INPUT', `Image ${i} must be base64 string.`);
    const bytes = (img.length * 3) / 4;
    if (bytes > 5 * 1024 * 1024) throwError('INVALID_INPUT', `Image ${i} exceeds 5MB limit.`);
  });
  return images;
}

function validatePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') throwError('INVALID_INPUT', 'Prompt is required.');
  if (prompt.trim().length === 0) throwError('INVALID_INPUT', 'Prompt cannot be empty.');
  if (prompt.length > 10000) throwError('INVALID_INPUT', 'Prompt too long (max 10,000 chars).');
  return prompt.trim();
}

module.exports = { requireUser, requireParam, validateImages, validatePrompt };
