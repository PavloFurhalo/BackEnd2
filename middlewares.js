import { USERS } from './db.js';

export const authorizationMiddleware = (req, res, next) => {
 const { headers } = req;

 const token = headers.authorization;

 if (!token) {
  return res.status(401).send({ message: "token was not found" });
 }

 const user = USERS.find(el => el.token === token);
 if (!user) {
  return res.status(400).send({ message: "user with this token was not found" });
 }

 req.user = user;

 next();
};