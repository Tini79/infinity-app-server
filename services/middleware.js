const response = require('./response')
const { verifyAccessToken } = require('./auth')

const authenticateToken = ((req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token) {
    const result = verifyAccessToken(res, token)
    if (result) {
      return response(result.statusCode, "", result.message, res)
    }
  }

  next()
})

module.exports = authenticateToken