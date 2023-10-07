import express from "express";
import bodyParser from "body-parser";
import usersRoutes from "./routes/users.js";
import pomosRoutes from "./routes/pomos.js";
import recordOfToday from "./routes/recordOfToday.js";

//???
// import * as dotenv from "dotenv"; // this works.
import dotenv from "dotenv"; // this also works...
// but import * as mongoose from "dotenv"; does not work.
import mongoose from "mongoose";
import cors from "cors";
import { createUser } from "./controllers/users.js";
//import middleware from "./middleware/firebase-auth.js";

//#region mongodb
dotenv.config();

mongoose
  .connect(`${process.env.DATABASE_URL}`)
  .then((arg) => console.log(`db is connected`))
  .catch((err) => console.log(`db connection error: %{err}`));

//createUser();
//console.log(process.env.DATABASE_URL);

//#endregion

//#region express
const app = express();
const port = process.env.port || 4444;

//app.use(cors());
app.use(
  cors({
    origin: true,
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.json()); // for parsing application/json
// for parsing application/x-www-form-urlencoded
// todo: understand what this means and when it is needed though I added it here just in case.
app.use(express.urlencoded({ extended: true }));
//app.use(middleware.decodeToken(req, res, next));
app.use("/users", usersRoutes);
app.use("/pomos", pomosRoutes);
app.use("/recordOfToday", recordOfToday);

app.listen(port, () => {
  console.log(`Server is running on port: http://localhost:${port}`);
});

app.get("/", (req, res) => res.send("Hello from Homepage"));
//#endregion
