import admin from "firebase-admin";

//(node:4166) ExperimentalWarning: Importing JSON modules is an experimental feature. This feature could change at any time
import serviceAccount from "./pomodoro-ef5e0-firebase-adminsdk-3ulzg-01c915ff0d.json" assert { type: "json" };

//console.log(serviceAccount.type);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
