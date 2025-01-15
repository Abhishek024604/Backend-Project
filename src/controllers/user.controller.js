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

const changeCurrentPassword = asyncHandler(async(req,res)=>{
   const {oldPassword,newPassword} = req.body

   

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
      throw new ApiError("Old password is incorrect",400)
   }
   user.password = newPassword
   await user.save({validateBeforeSave:false})
   return res.status(200).json(
     new ApiResponse(200,{},"Password changed successfully")
   )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
   return res
    .status(200)
    .json(200,req.user,"current user fethed successfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   const {fullname,email} = req.body

   if(!fullname || !name){
      throw new ApiError("Fullname and email are required",400)
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            fullname,
            email
         }
      },
      {new:true}
   ).select("-password ")

   if(!user){
      throw new ApiError("User not found",404)
   }
   return res.status(200).json(
     new ApiResponse(200,user,"Account details updated successfully")
   )
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
   const avatarLocalPath= req.file?.path

   if(!avatarLocalPath){
      throw new ApiError("Please upload an avatar",400)
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   //delete old avatar image

   if(!avatar.url){
      throw new ApiError("Failed to upload avatar",400)
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            avatar:avatar.url
         }
      },
      {new:true}
   ).select("-password ")

   return res
   .status(200)
   .json(
     new ApiResponse(200,user,"Avatar updated successfully")
   )
 
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
   const coverImageLocalPath= req.file?.path

   if(!coverImageLocalPath){
      throw new ApiError("Please upload an cover image file",400)
   }

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!coverImage.url){
      throw new ApiError("Failed to upload avatar",400)
   }

   const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
         $set:{
            coverImage:coverImage.url
         }
      },
      {new:true}
   ).select("-password ")

   return res
   .status(200)
   .json(
     new ApiResponse(200,user,"Cover image updated successfully")
   )
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
   const {username } = req.params
   if(!username?.trim()){
      throw new ApiError("Please provide username",400)   
   }

   const channel = await User.aggregate([
      {
         $match:{
            username:username?.toLowerCase(),
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
         }
      },
      {
         $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
         }
      },
      {
         $addFields:{
            subscribersCount:{
               $size:"$subscribers"
            },
            channelsSubscribedToCount:{
               $size:"$subscribedTo"
            },
            isSubscribed:{
               $cond:{
                  if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                  then:true,
                  else:false
               }
            }
         }  
      },
      {
         $project:{  //pass values
            fullname:1,
            username:1,
            subscribersCount:1,
            channelsSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
         }
      }
   ])

   if(!channel?.length){
      throw new ApiError("channel not found",404)
   }
   return res
   .status(200)
   .json(
     new ApiResponse(200,channel[0],"User channel profile fetched successfully")
   )
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
      {
         $match:{
            _id: new mongoose.Types.ObjectId(req.user._id) //accessing user id standard way
         }
      },
      {
         $lookup:{
            from:"videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from:"users",
                     localField:"owner",
                     foreignField:"_id",
                     as:"owner",
                     pipeline:[
                        {
                           $project:{
                              fullname:1,
                              username:1,
                              avatar:1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields:{
                     owner:{
                        $first:"$owner"
                     }
                  }
               }
            ]
         }
      }
    ])

    return res.status(200)
    .json(
      new ApiResponse(200,user[0].watchHistory,"User watch history fetched successfully")
    )
}) 


export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
 }