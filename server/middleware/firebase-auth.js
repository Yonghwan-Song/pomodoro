import admin from "../firebase/config.js";

class Middleware {
  async decodeToken(req, res, next) {
    const idToken = req.headers.authorization.split(" ")[1]; // [1] of arr [Bearer, tokenValue]

    try {
      const decodeValue = admin.auth().verifyIdToken(idToken);
      console.log(decodeValue);
      if (decodeValue) {
        return next();
      }
      return res.json({ message: "Unauthorized" });
    } catch (error) {
      return res.json({ message: "Internal Error" });
    }
  }
}

export default new Middleware();
