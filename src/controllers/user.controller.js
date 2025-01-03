import { asyncHandler } from "../utils/asyncHandlers.js"; //importing wrapper asyncHandler from utils folder

const registerUser = asyncHandler(async (req, res) => {
    //Your logic to register user goes here
   res.status(201).json({ message: "ok"    
    });
})

export { registerUser }