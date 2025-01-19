import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "./db";

const JWT_SECRET = "my-secret-key";

export async function authenticateUser(username: string, password: string) {
  const user = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  if (!user) {
    return null;
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return null;

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "1h",
  });
  return { token, user };
}
