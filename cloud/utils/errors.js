// cloud/utils/errors.js
const AppError = {
  UNAUTHORIZED:    { code: 401, message: 'You must be logged in.' },
  FORBIDDEN:       { code: 403, message: 'Access denied.' },
  LIMIT_EXCEEDED:  { code: 429, message: 'Usage limit exceeded. Please upgrade your plan.' },
  INVALID_INPUT:   { code: 400, message: 'Invalid input provided.' },
  NOT_FOUND:       { code: 404, message: 'Resource not found.' },
  PAYMENT_FAILED:  { code: 402, message: 'Payment verification failed.' },
  AI_ERROR:        { code: 500, message: 'AI service error. Please try again.' },
};

function throwError(type, detail) {
  const e = AppError[type] || AppError.INVALID_INPUT;
  throw new Parse.Error(e.code, detail || e.message);
}

module.exports = { AppError, throwError };
