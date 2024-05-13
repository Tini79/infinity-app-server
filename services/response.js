const response = (statusCode, data, message, res) => {
  res.status(statusCode).json(
    { statusCode, data, message }
  )
}

module.exports = response