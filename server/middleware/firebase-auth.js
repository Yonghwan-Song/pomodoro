import admin from "../firebase/config.js";

class Middleware {
  async decodeToken(req, res, next) {
    // console.log(`async decodeToken(): ${req.headers.authorization}`);

    const idToken = req.headers.authorization.split(" ")[1]; // [1] of arr [Bearer, tokenValue]

    try {
      const decodeValue = await admin.auth().verifyIdToken(idToken);
      if (decodeValue) {
        req.userEmail = decodeValue.email;
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      return res.status(500).json({ message: error });
    }
  }
}

export default new Middleware();
