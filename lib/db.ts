import pgPromise from "pg-promise";

const pgp = pgPromise();
const db = pgp({
  host: "localhost",
  port: 5432,
  database: "my_database",
  user: "my-user",
  password: "my-password",
});

export default db;
