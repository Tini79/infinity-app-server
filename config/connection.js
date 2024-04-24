const mysql = require("mysql")

const urlDB = `mysql://root:HzwwQzvnzNaWHSeHcLjrnRsuiNSXnSQL@roundhouse.proxy.rlwy.net:44797/railway`
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