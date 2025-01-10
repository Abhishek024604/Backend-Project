import { asyncHandler } from "../utils/asyncHandlers.js"; //importing wrapper asyncHandler from utils folder
import {ApiError } from "../utils/ApiError.js"; 
import { User } from "../models/user.model.js"; // importing user model from models folder
import {uploadOnCloudinary } from "../utils/cloudinary.js";
import {ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) =>{
   try{
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken //assigning refresh token
       await user.save({validateBeforeSave: false}) //dont need any validation before saving

       return {accessToken, refreshToken} //returning both tokens
   } catch(error){
      throw new ApiError("Error generating tokens",500)
   }
}

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
     //console.log("email:",email );

     if(fullname === "" || email === "" || username === "" || password === ""  ){
        throw new ApiError("all fields are required",400)
     }  // validation for required fields  
     // another method if([fullname,email,username,password].some(field) =>field?.trim()=== ""){ throw new ApiError("All fields are required",400) }  // validating if all fields are filled up

     const existedUser = await User.findOne ({  // find user in database User  will contact with the database as it is connected to MongoDB
        $or: [{ username }, { email }]
     })

     if (existedUser) {
        throw new ApiError("User already exists", 409)
     }
     //console.log(req.files);  displaying all uploaded files in console for debugging purposes
     

     const avatarLocalPath = req.files?.avatar[0]?.path //accessing avatar file path from multer if it exists 
     //.files will contain all uploaded files. avatar[0] will contain first uploaded file. path will contain path of the file.
     // const coverImagePath = req.files?.coverImage[0]?.path 

     let coverImageLocalPath;
     if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
     }

     if(!avatarLocalPath){
        throw new ApiError("Please upload an avatar",400)
     }

     const avatar =await uploadOnCloudinary(avatarLocalPath) // uploading avatar to cloudinary and storing the URL in avatar field in user object
     const coverImage = await uploadOnCloudinary(coverImageLocalPath) 

     if(!avatar){
        throw new ApiError("avatar file required",400)
     }

    const user = await User.create({
        fullname,
        email,
        username,
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

const loginUser = asyncHandler(async(req,res) => {
  //take req.body data
  //username or email
  //find the user
  //password check
  //access token and refresh token generate
  //send cookie

  const {email,password,username} = req.body

  if(!username && !email){
    throw new ApiError("Please provide email or username",400)
  }

 const user = await User.findOne({
    $or: [{email}, {username}], //mongodb operator
 }) //search for data in database and returns the first matching entry

 if(!user){
    throw new ApiError("user not exists",400)
 }

 const isPasswordValid = await user.isPasswordCorrect(password)

 if(!isPasswordValid){
    throw new ApiError("password incorrect",401)
 }
 
 const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id) //generate access and refresh tokens

 const loggedInUser = await User.findById(user._id).select("-password,-refreshToken")

 const options = {
   httpOnly:true,
   secure:true
 }

 return res
 .status(200)
 .cookie("accessToken",accessToken,options)
 .cookie("refreshToken",refreshToken,options)
 .json(
   new ApiResponse(200,
      {
      user:loggedInUser,accessToken,refreshToken //send user details with refresh token and access token
      } ,
      "User logged in successfully"  
   )
 )

})

const logoutUser = asyncHandler(async(req,res) => {
    //remove refresh token from database
    //clear cookies
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $unset :{
            refreshToken: 1 //this removes the field from document
         }
      },
      {
         new:true
      }
    )
    const options = {
      httpOnly:true,
      secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
      new ApiResponse(200,{},"User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async(req,res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken //get refresh token from cookies or body

   if(!incomingRefreshToken){
      throw new ApiError("No refresh token provided",401)
   }

   try{
     const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET, //decoded refresh token
   )

   const user = await User.findById(decodedToken?._id)

   if(!user){
      throw new ApiError("Invalid refresh token",401)
   }

   if(incomingRefreshToken!== user?.refreshToken){
      throw new ApiError("Refresh token expired",401)
   }

   const options ={
      httpOnly:true,
      secure:true
   }

   const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id) //generate new access and refresh tokens
  return res
  .status(200)
  .cookie("accessToken",accessToken)
  .cookie("refreshToken",newRefreshToken)
  .json(
   new ApiResponse(200,
      {accessToken,refreshToken:newRefreshToken},"Access token and refresh token generated successfully"
   )
  ) 
  } catch(error){
     throw new ApiError(error?.message || "invalid refresh token",500)
  }
})


export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
 }