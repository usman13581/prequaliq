const db = require('../models');
const { Op } = require('sequelize');
const { isAllowedEmail } = require('./emailValidation');

/**
 * Check a requested sign-in email change. Returns { changed: false } when the address is
 * the same, { error } when it is invalid or taken, otherwise { changed: true, email }.
 */
async function checkEmailChange(user, requested) {
  if (requested === undefined || requested === null) return { changed: false };
  const email = String(requested).trim().toLowerCase();
  if (!email || email === String(user.email || '').trim().toLowerCase()) return { changed: false };
  if (!isAllowedEmail(email)) return { error: 'Enter a valid email address.' };
  const taken = await db.User.count({ where: { email: { [Op.iLike]: email }, id: { [Op.ne]: user.id } } });
  if (taken) return { error: 'This email address is already in use.' };
  return { changed: true, email };
}

module.exports = { checkEmailChange };
