import { readFile } from "fs/promises";
import admin from "firebase-admin";

//(node:4166) ExperimentalWarning: Importing JSON modules is an experimental feature. This feature could change at any time
//import serviceAccount from "./pomodoro-ef5e0-firebase-adminsdk-3ulzg-01c915ff0d.json" assert { type: "json" };
let serviceAccount;
try {
  const filePath = new URL(
    "./pomodoro-ef5e0-firebase-adminsdk-3ulzg-01c915ff0d.json",
    import.meta.url
  );
  serviceAccount = await readFile(filePath, { encoding: "utf8" });
} catch (error) {
  console.log(`-----------------------config.js-----------------------`);
  console.log(error.message);
}

//console.log(serviceAccount.type);
admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount),
  credential: admin.credential.cert(JSON.parse(serviceAccount)),
});

export default admin;
