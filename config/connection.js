require("dotenv").config()
const mysql = require("mysql")

const urlDB = `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASS}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDB}`
const con = mysql.createConnection(urlDB)
// const con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "cakratendados",
//   database: "infinity_db"
// })

con.connect((err) => {
  if (err) throw err
  console.log("Connected!");
})

module.exports = con