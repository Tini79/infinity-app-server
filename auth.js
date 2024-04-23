const { response } = require('express')
const jwt = require('jsonwebtoken')

const generateAccessToken = ((user) => {
  const payload = {
    username: user.username,
  }
  const secret = 'your-secret-key'
  const options = { expiresIn: '1h' }
  return jwt.sign(payload, secret, options)
})

const verifyAccessToken = ((token) => {
  const secret = 'your-secret-key'
  try {
    const decoded = jwt.verify(token, secret)
    response(200, decoded, "Successfully login!", res)
  } catch (error) {
    response(403, "", error.message, res)
  }
})

module.exports = {
  generateAccessToken,
  verifyAccessToken
}