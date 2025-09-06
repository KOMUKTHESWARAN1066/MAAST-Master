const sql = require('mssql');

const dbConfig = {
  user: "msssa",
  password: "Mss@Sa",
  server: "103.38.50.149",
  database: "MSSCOSEC",
  port: 5121,
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
    useUTC: true,
    enableArithAbort: true,
    encrypt: false,
    driver: "msnodesqlv8",
  },
};

let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
};

module.exports = {
  sql,
  getPool
};
