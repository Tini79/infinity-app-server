const express = require('express')
const cors = require('cors')
const con = require('../config/connection')
const response = require('../services/response')
const bcrypt = require('bcrypt')
const app = express()
const { generateAccessToken } = require('../services/auth')
const { body } = require('express-validator')
const { validationResult } = require('express-validator')
const port = process.env.PORT || 3001;
const verifyToken = require('../services/middleware.js')
const CC = require('currency-converter-lt')
const currSymbol = require('currency-symbol')
const corsOptions = {
  origin: ['http://localhost:8080', 'infinity-app-client-ochre.vercel.app'],
  methods: ['GET', 'POST'],
  allowHeaders: ['Content-Type'], // , 'application/javascript; charset=UTF-8'
  // additional by me on 5/12/24
  connection: "keep-alive"
  // optionsSuccessStatus: 200
}

app.use(cors(corsOptions))
app.use(express.json())

app.get('/api/v1/', (req, res) => {
  res.send("404 | Page not found")
})

// AUTHENTICATION
const registerValidator = [
  body('data.full_name').trim().notEmpty(),
  body('data.username').trim().notEmpty(),
  body('data.gender').trim().notEmpty(),
  body('data.country').trim().notEmpty(),
  body('data.country').trim().notEmpty(),
  body('data.email').trim().notEmpty().isEmail(),
  body('data.password').trim().notEmpty()
]

// TODO: nanti ganti ke string kosong as initialization
const loginValidator = [
  body('data.username').trim().notEmpty(),
  body('data.password').trim().notEmpty()
]

app.post('/api/v1/registration', registerValidator, (req, res) => {
  const err = validationResult(req)
  if (err.errors.length > 0) {
    return response(400, "", err.errors, res)
  }
  // initialize data
  const { full_name, username, gender, country, currency, email, password } = req.body.data
  const saltRounds = 11

  const sql = `SELECT * FROM users WHERE email = ? OR username = ?`
  con.query(sql, [email, username], (err, fields) => {
    if (err) {
      return response(400, null, err.message, res)
    }
    if (fields.length > 0) {
      return response(400, "", "User already exist!", res)
    }

    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) {
        return response(400, null, err.message, res)
      }
      bcrypt.hash(password, salt, (err, hashed) => {
        const sql = `INSERT INTO users (full_name, username, gender, country_code, currency_code, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)`
        con.query(sql, [full_name, username, gender, country, currency, email, hashed], (err, fields) => {
          if (err) {
            return response(400, null, err.message, res)
          }
          if (fields.affectedRows) response(200, `Inserted Id ${fields.insertId}`, "Successfully register new user!", res)
        })
      })
    })
  })
})

app.post('/api/v1/login', loginValidator, (req, res) => {
  const err = validationResult(req)
  if (err.errors.length > 0) {
    return response(400, "", err.errors, res)
  }

  const username = req.body.data.username
  const sql = `SELECT password, currency_code FROM users WHERE username = ?`
  con.query(sql, [username], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    }

    if (fields.length > 0) {
      bcrypt.compare(req.body.data.password, fields[0].password, (err, res2) => {
        if (err) {
          return response(400, null, err.message, res)
        }

        if (res2) {
          const accessToken = generateAccessToken(username)
          response(200, { username: username, currency_code: fields[0].currency_code, token: accessToken }, "User is available!", res)
        } else {
          response(400, null, "User is not found!", res)
        }
      })
    } else {
      response(400, null, "User is not found!", res)
    }
  })
})

// app.get('/api/v1/test', verifyToken, (req, res) => {
//   response(200, "", "Unauthorized, only necessary access granted!", res)
// })

// GENERAL API
app.get('/api/v1/countries', (req, res) => {
  const headers = new Headers()
  headers.append("X-CSCAPI-KEY", "Sjk4Q2N4dlBrNG1vclVtY01HRFZtelhvdGdXQ2xzVVFqT3g1NTFFVg==")
  const reqOptions = {
    method: "GET",
    headers: headers,
    redirect: "follow"
  }

  fetch("https://api.countrystatecity.in/v1/countries", reqOptions)
    .then(response => response.text())
    .then(resp => response(200, JSON.parse(resp), "Successfully retrieved country data!", res))
    .catch(err => response(400, "", err, res))
})

app.get('/api/v1/categories', verifyToken, (req, res) => {
  const sql = 'SELECT * FROM categories'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      response(200, fields, "Successfully retrieved category data!", res)
    }
  })
})

app.get('/api/v1/slugs', (req, res) => {
  const sql = 'SELECT slug, created_at FROM categories'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      response(200, fields, "Successfully retrieved category data!", res)
    }
  })
})

app.get('/api/v1/slug/:slug', verifyToken, (req, res) => {
  const sql = 'SELECT slug, name, path, desc1 FROM categories WHERE slug = ?'
  con.query(sql, [req.params.slug], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      response(200, fields, "Successfully retrieved category data!", res)
    }
  })
})

app.get('/api/v1/popular-categories', verifyToken, (req, res) => {
  const sql = 'SELECT c.id,' +
    ' c.name,' +
    ' c.slug,' +
    ' c.path,' +
    ' SUM(t.rate) AS total_rate,' +
    ' p.path AS pop_path' +
    ' FROM categories c' +
    ' LEFT JOIN testimonials t ON c.id = t.product_category_id' +
    ' LEFT JOIN pop_categories p ON c.id = p.category_id' +
    ' GROUP BY c.id, p.path' +
    ' ORDER BY total_rate DESC'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      response(200, fields, "Successfully retrieved popular category data!", res)
    }
  })
})

app.get('/api/v1/testimonials', verifyToken, (req, res) => {
  const sql = 'SELECT testimonials.id,' +
    ' testimonials.customer_name,' +
    ' testimonials.path,' +
    ' testimonials.testimonial,' +
    ' testimonials.rate,' +
    ' categories.name,' +
    ' categories.slug' +
    ' FROM testimonials' +
    ' LEFT JOIN categories' +
    ' ON testimonials.product_category_id = categories.id' +
    ' ORDER BY date ASC; '
  con.query(sql, ((err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      response(200, fields, "Successfully retrieved testimonial data!", res)
    }
  }))
})

app.get('/api/v1/category', verifyToken, (req, res) => {
  const sql = `SELECT * FROM categories WHERE slug = ?`
  con.query(sql, [req.query.slug], (err, fields1) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      if (fields1.length > 0) {
        const sql = 'SELECT products.id,' +
          ' products.code,' +
          ' products.name,' +
          ' products.path,' +
          ' products.original_price,' +
          ' products.description,' +
          ' SUM(testimonials.rate) AS total_rate' +
          ' FROM products LEFT JOIN testimonials' +
          ' ON products.id = testimonials.product_id ' +
          ' WHERE category_id = ? ' +
          ' GROUP BY products.id' +
          ' ORDER BY code ASC'
        con.query(sql, [fields1[0].id], (err, fields2) => {
          if (err) {
            response(400, null, err.message, res)
          } else {
            getMaterialsByCategory(res, fields1[0].id, (results) => {
              const materials = results
              if (req.query.currency_code) {
                let promises = []
                for (let field of fields2) {
                  let UCurrCode = req.query.currency_code
                  field.curr_icon = currSymbol.symbol(UCurrCode)

                  if (!field.curr_icon) {
                    UCurrCode = "USD"
                    field.curr_icon = currSymbol.symbol(UCurrCode)
                  }

                  let currConvter = new CC({ from: "IDR", to: UCurrCode, amount: field.original_price, isDecimalComma: true })
                  let promise = currConvter.convert().then((res) => {
                    if (isNaN(res)) {
                      let currConvter2 = new CC({ from: UCurrCode, to: "IDR", amount: 1, isDecimalComma: true })
                      return currConvter2.convert().then((res2) => {
                        field.price = field.original_price / res2
                      })
                    } else {
                      field.price = res
                    }
                  })
                  promises.push(promise)
                }

                Promise.all(promises).then(() => {
                  response(200, { data: fields1[0], details: fields2, materials: materials }, `Successfully retrieved ${req.params.slug} category data!`, res)
                }).catch(err => response(500, null, err.message, res))
              } else {
                response(200, { data: fields1[0], details: fields2, materials: materials }, `Successfully retrieved ${req.params.slug} category data!`, res)
              }
            })
          }
        })
      } else {
        response(404, null, 'Category is not found!', res)
      }
    }
  })
})

const getMaterialsByCategory = (res, categoryId, callback) => {
  const sql = 'SELECT * FROM category_materials WHERE category_id = ?'
  con.query(sql, [categoryId], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
    } else {
      callback(fields)
    }
  })
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running in port ${port}`);
})

module.exports = app