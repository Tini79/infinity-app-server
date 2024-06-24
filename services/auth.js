const jwt = require('jsonwebtoken')

const generateAccessToken = ((user) => {
  const payload = {
    username: user.username,
  }
  const secret = process.env.SECRET_KEY
  // TODO: nanti ubah ke 7 hari, ini buat testing di production
  const options = { expiresIn: '1d' }
  return jwt.sign(payload, secret, options)
})

const verifyAccessToken = ((res, token) => {
  const secret = process.env.SECRET_KEY
  try {
    jwt.verify(token, secret)
    // console.log("Access granted:", decoded);
  } catch (error) {
    return err = {
      statusCode: 401,
      name: 'TokenExpiredError',
      message: 'jwt expired',
    }
  }
})

module.exports = {
  generateAccessToken,
  verifyAccessToken
}