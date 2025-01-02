import mongoose,{Schema, trusted} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
       username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true // Creates an index on the field for faster querying
       },
       email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true,
       },
       fullname:{
        type:String,
        required:true,
        trim:true,
        index:true
       },
       avatar:{
        type:String,  // Assuming a URL to an image
       required:true
       },
       coverimage:{
        type:String,  // Assuming a URL to an image
       },
       watchHistory:[
        {
            type: Schema.Types.ObjectId, // Reference to Video model
            ref: 'Video'
        }
       ],
       password:{
        type:String,
        required:[true, "Password is required"],
       },
       refreshToken:{
        type:String // For JWT authentication
       }


}, { timestamps: true }  // Automatically adds createdAt and updatedAt fields
)

userSchema.pre("save",async function(next) {
    if(!this.isModified("password")) return next() // If password is not modified, skip hashing
    this.password = bcrypt.hash(this.password, 10) // Hash the password before saving it
    next() // Continue with saving the user
})
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password) // Compare the hashed password with the provided password
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {                  // Provide user information in the payload
           _id: this._id,
           email: this.email,
           username: this.username,
           fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET, 
        { 
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
         }  
    ) 
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {                  // Provide user information in the payload
           _id: this._id,
           
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User= mongoose.model('User', userSchema);