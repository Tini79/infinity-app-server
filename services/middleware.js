const { response } = require('./response')
const { verifyAccessToken } = require('./auth')

const authenticateToken = ((req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    // return response(401, "", "Unauthorized!", res)
  }

  const result = verifyAccessToken()
  if (!result.status == 200) {
    return response(403, "", "Forbidden", res)
  }

  req.user = result.data
  next()
})

module.exports = authenticateToken