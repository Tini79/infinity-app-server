require("dotenv").config()
const mysql2 = require("mysql2")

const urlDB = `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASS}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDB}`
const con = mysql2.createConnection(urlDB)
// const con = mysql2.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "cakratendados",
//   database: "infinity_db"
// })

con.connect((err) => {
  if (err) {
    console.log("Error on connecting database",err);
    throw err
  }
  console.log("Connected!");
})

module.exports = con