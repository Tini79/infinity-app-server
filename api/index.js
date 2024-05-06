const express = require('express')
const cors = require('cors')
const con = require('../config/connection')
const fs = require('fs')
const response = require('../services/response')
const bcrypt = require('bcrypt')
const app = express()
const { generateAccessToken } = require('../services/auth')
const { body } = require('express-validator')
const { validationResult } = require('express-validator')
const port = process.env.PORT || 3001;

const corsOptions = {
  origin: ['http://localhost:8080', 'infinity-app-client-ochre.vercel.app'],
  methods: ['GET', 'POST'],
  allowHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
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
  body('data.email').trim().notEmpty().isEmail(),
  body('data.password').trim().notEmpty()
]

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
  const fullName = req.body.data.full_name
  const username = req.body.data.username
  const gender = req.body.data.gender
  const country = req.body.data.country
  const email = req.body.data.email
  const plainPassword = req.body.data.password
  const saltRounds = 11

  const sql = `SELECT * FROM users WHERE email = ? OR username = ?`
  con.query(sql, [email, username], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    }
    if (fields.length > 0) {
      return response(400, "", "User already exist!", res)
    }

    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) {
        response(400, null, err.message, res)
        // throw err
      }
      bcrypt.hash(plainPassword, salt, (err, hashed) => {
        const sql = `INSERT INTO users (full_name, username, gender, country_code, email, password) VALUES (?, ?, ?, ?, ?, ?)`
        con.query(sql, [fullName, username, gender, country, email, hashed], (err, fields) => {
          // TODO: nanti coba pelajari ini lebih dalam yak tentang try catch atau middlewarenya; obrolannya ad di chat gpt
          if (err) {
            // TODO: bahaya banget pakai ini throw cuk, sekali kena sistem bakalan berhenti terus
            response(400, null, err.message, res)
            // throw err
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
  const sql = `SELECT password FROM users WHERE username = ?`
  con.query(sql, [username], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    }

    if (fields.length > 0) {
      bcrypt.compare(req.body.data.password, fields[0].password, (err, res2) => {
        if (err) {
          response(400, null, err.message, res)
          // throw err
        }

        if (res2) {
          const accessToken = generateAccessToken(username)
          response(200, { username: username, token: accessToken }, "User is available!", res)
        } else {
          response(404, "", "User is not found!", res)
        }
      })
    } else {
      response(404, "", "User is not found!", res)
    }
  })
})

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

// TODO: sempat mau coba autheticate token, tapi belum kelar itu yak, nanti mungkin pas maintenance aja tambahin atau kalo sempet sebelum launch
app.get('/api/v1/categories', (req, res) => {
  const sql = 'SELECT * FROM categories'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
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
      // throw err
    } else {
      response(200, fields, "Successfully retrieved category data!", res)
    }
  })
})

app.get('/api/v1/slug/:slug', (req, res) => {
  const sql = 'SELECT slug, name, path, desc1 FROM categories WHERE slug = ?'
  con.query(sql, [req.params.slug], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    } else {
      response(200, fields, "Successfully retrieved category data!", res)
    }
  })
})

app.get('/api/v1/popular-categories', (req, res) => {
  const sql = 'SELECT categories.id,' +
    ' categories.name,' +
    ' categories.slug,' +
    ' categories.href,' +
    ' categories.path,' +
    ' SUM(testimonials.rate) AS total_rate' +
    ' FROM categories' +
    ' LEFT JOIN testimonials' +
    ' ON categories.id = testimonials.product_category_id' +
    ' GROUP BY categories.id' +
    ' ORDER BY total_rate DESC'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    } else {
      response(200, fields, "Successfully retrieved popular category data!", res)
    }
  })
})

app.get('/api/v1/testimonials', (req, res) => {
  const sql = 'SELECT testimonials.id,' +
    ' testimonials.customer_name,' +
    ' testimonials.testimonial,' +
    ' testimonials.rate,' +
    ' categories.name,' +
    ' categories.slug,' +
    ' categories.path,' +
    ' categories.href' +
    ' FROM testimonials' +
    ' LEFT JOIN categories' +
    ' ON testimonials.product_category_id = categories.id' +
    ' ORDER BY date ASC; '
  con.query(sql, ((err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    } else {
      response(200, fields, "Successfully retrieved testimonial data!", res)
    }
  }))
})

app.get('/api/v1/category/:slug', (req, res) => {
  const sql = `SELECT * FROM categories WHERE slug = ?`
  con.query(sql, [req.params.slug], (err, fields1) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    } else {
      const sql = 'SELECT products.id,' +
        ' products.code,' +
        ' products.name,' +
        ' products.path,' +
        ' products.price,' +
        ' products.price,' +
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
          // throw err
        } else {
          getMaterialsByCategory(res, fields1[0].id, (results) => {
            const materials = results
            response(200, { data: fields1[0], details: fields2, materials: materials }, `Successfully retrieved ${req.params.slug} category data!`, res)
          })
        }
      })
    }
  })
})

const getMaterialsByCategory = (res, categoryId, callback) => {
  const sql = 'SELECT * FROM category_materials WHERE category_id = ?'
  con.query(sql, [categoryId], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      // throw err
    } else {
      callback(fields)
    }
  })
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running in port ${port}`);
})

module.exports = app