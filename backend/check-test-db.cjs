require("dotenv").config({
  path: ".env.test",
  override: true,
  quiet: true
});

const mysql = require("mysql2/promise");

(async () => {
  const e = process.env;
  const url = new URL(e.DATABASE_URL);

  if (
    url.hostname !== "127.0.0.1" ||
    url.pathname !== "/pims_test" ||
    url.username !== "pims_test_app" ||
    e.DATABASE_NAME !== "pims_test"
  ) {
    throw new Error("SAFETY STOP: Wrong database.");
  }

  const connection = await mysql.createConnection({
    host: e.DATABASE_HOST,
    port: Number(e.DATABASE_PORT),
    user: e.DATABASE_USER,
    password: e.DATABASE_PASSWORD,
    database: e.DATABASE_NAME
  });

  try {
    const [rows] = await connection.query(
      "SELECT DATABASE() AS db, CURRENT_USER() AS account"
    );

    console.log("MySQL driver connection: PASS");
    console.log("Connected database:", rows[0].db);
    console.log("Authenticated account:", rows[0].account);
  } finally {
    await connection.end();
  }
})().catch(err => {
  console.error("MySQL driver connection: FAIL");
  console.error("Error code:", err.code || "UNKNOWN");
  process.exitCode = 1;
});
