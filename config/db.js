require("dotenv").config();
var mysql2 = require("mysql2");

var DB_URL =
    process.env.DB_URL ||
    process.env.MYSQL_URL ||
    "mysql://avnadmin:AVNS_rmjSbNmw_zYXuChqFNZ@mysql-bce-krishtanwar153-58bc.i.aivencloud.com:17677/rudraksh";  

var pool = mysql2.createPool({
    uri: DB_URL,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

module.exports = pool.promise();
