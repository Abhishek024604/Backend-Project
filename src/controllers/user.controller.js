import { asyncHandler } from "../utils/asyncHandlers.js"; //importing wrapper asyncHandler from utils folder
import {ApiError } from "../utils/apiError.js"; 
import { User } from "../models/user.model.js"; // importing user model from models folder
import {uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // get user data from frontend
  // validate user data
  // check if user already exists:username or email
  // check for images,avatar
  // upload them to cloudinary
  // create user object-create entry in database
  // remove password and refresh token filed from response
  // check if user created successfully
  // return response
     const {fullname,email,username,password} =  req.body   // accessing user data from frontend
     console.log("email:",email );

     if(fullname === "" || email === "" || username === "" || password === ""  ){
        throw new ApiError("all fields are required",400)
     }  // validation for required fields  
     // another method if([fullname,email,username,password].some(field) =>field?.trim()=== ""){ throw new ApiError("All fields are required",400) }  // validating if all fields are filled up

     const existedUser = User.findOne ({  // find user in database User  will contact with the database as it is connected to MongoDB
        $or: [{ username }, { email }]
     })

     if (existedUser) {
        throw new ApiError("User already exists", 409)
     }

     const avatarLocalPath = req.files?.avatar[0]?.path //accessing avatar file path from multer if it exists 
     //.files will contain all uploaded files. avatar[0] will contain first uploaded file. path will contain path of the file.
     const coverImagePath = req.files?.coverImage[0]?.path 

     if(!avatarLocalPath){
        throw new ApiError("Please upload an avatar",400)
     }

     const avatar =await uploadOnCloudinary(avatarLocalPath) // uploading avatar to cloudinary and storing the URL in avatar field in user object
     const coverImage = await uploadOnCloudinary(coverImagePath) 

     if(!avatar){
        throw new ApiError("avatar file required",400)
     }

    const user = await User.create({
        fullname,
        email,
        username: username.toLowercase(),
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
     })

     const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
     ) //chack if user created successfully and return the user object without password and refreshToken field

     if(!createdUser){
        throw new ApiError("Failed to register user",500)
     }

     return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully"  )
     )
     
     
})

export { registerUser }