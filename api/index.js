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
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
}

// app.use(cors(corsOptions))
app.use(cors())
app.use(express.json())

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

app.get('/api/v1/', (req, res) => {
  res.send("404 | Page not found")
})

// TODO: sempat mau coba autheticate token, tapi belum kelar itu yak, nanti mungkin pas maintenance aja tambahin atau kalo sempet sebelum launch
app.get('/api/v1/categories', (req, res) => {
  const sql = 'SELECT * FROM categories'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      throw err
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
    ' GROUP BY categories.id'
  con.query(sql, (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      throw err
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
      throw err
    } else {
      response(200, fields, "Successfully retrieved testimonial data!", res)
    }
  }))
})

app.get('/api/v1/category/:slug', (req, res) => {
  const sql1 = `SELECT * FROM categories WHERE slug = ?`
  con.query(sql1, [req.params.slug], (err, fields1) => {
    if (err) {
      response(400, null, err.message, res)
      throw err
    } else {
      const sql2 = `SELECT * FROM products WHERE category_id = ? ORDER BY code ASC`
      con.query(sql2, [fields1[0].id], (err, fields2) => {
        if (err) {
          response(400, null, err.message, res)
          throw err
        } else {
          response(200, { data: fields1[0], details: fields2 }, `Successfully retrieved ${req.params.slug} category data!`, res)
        }
      })
    }
  })
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

  const sql1 = `SELECT * FROM users WHERE email = ? OR username = ?`
  con.query(sql1, [email, username], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      throw err
    }
    if (fields.length > 0) {
      return response(400, "", "User already exist!", res)
    }

    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) {
        response(400, null, err.message, res)
        throw err
      }
      bcrypt.hash(plainPassword, salt, (err, hashed) => {
        const sql2 = `INSERT INTO users (full_name, username, gender, country_code, email, password) VALUES (?, ?, ?, ?, ?, ?)`
        con.query(sql2, [fullName, username, gender, country, email, hashed], (err, fields) => {
          // TODO: nanti coba pelajari ini lebih dalam yak tentang try catch atau middlewarenya; obrolannya ad di chat gpt
          if (err) {
            // TODO: bahaya banget pakai ini throw cuk, sekali kena sistem bakalan berhenti terus
            response(400, null, err.message, res)
            throw err
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
  // TODO: belum isi response jika datanya nggak ada gimana
  const sql = `SELECT password FROM users WHERE username = ?`
  con.query(sql, [username], (err, fields) => {
    if (err) {
      response(400, null, err.message, res)
      throw err
    }

    bcrypt.compare(req.body.data.password, fields[0].password, (err, res2) => {
      if (err) {
        response(400, null, err.message, res)
        throw err
      }

      if (res2) {
        const accessToken = generateAccessToken(username)
        response(200, { username: username, token: accessToken }, "User is available!", res)
      } else {
        response(404, "", "User is not found!", res)
      }
    })
  })
})

app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running in port ${port}`);
})

module.exports = app