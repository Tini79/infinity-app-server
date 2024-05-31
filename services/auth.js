const response = require('./response')
const jwt = require('jsonwebtoken')

const generateAccessToken = ((user) => {
  const payload = {
    username: user.username,
  }
  const secret = process.env.SECRET_KEY
  const options = { expiresIn: '7d' }
  return jwt.sign(payload, secret, options)
})

const verifyAccessToken = ((res, token) => {
  const secret = process.env.SECRET_KEY
  try {
    const decoded = jwt.verify(token, secret)
    console.log("Access granted:", decoded);
    // response(200, decoded, "Access granted!", res)
  } catch (error) {
    return err = {
      statusCode: 401,
      name: 'TokenExpiredError',
      message: 'jwt expired',
    }
    // response(401, "", error.message, res)
  }
})

module.exports = {
  generateAccessToken,
  verifyAccessToken
}