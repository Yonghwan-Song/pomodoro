import { Pomo } from "../models/pomo.js";
import { User } from "../models/user.js";

export const recordPomo = async (req, res) => {
  try {
    let { userEmail, duration, startTime } = req.body;
    console.log(req.body);
    console.log(duration.__proto__.constructor);
    console.log(startTime.__proto__.constructor);

    //? is await needed ?....
    //? aren't we just creating a new object which becomes a document in mongodb?
    //const newPomo = await new Pomo({ userEmail, duration, startTime });
    let newPomo = new Pomo({ userEmail, duration, startTime });
    let savedPomo = await newPomo.save();

    let currentUser = await User.findOne({ email: userEmail });
    currentUser.pomoSet.push(savedPomo);
    currentUser.save();

    res.json(savedPomo);
  } catch (error) {
    console.log(`******DB error: recordPomo in controllers/pomos.js******`);
  }
};
