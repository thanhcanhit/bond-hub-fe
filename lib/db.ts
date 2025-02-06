import pgPromise from "pg-promise";

const pgp = pgPromise();
const db = pgp({
  host: "localhost",
  port: 5432,
  database: "bondhub",
  user: "postgres",
  password: "root",
});

export default db;
