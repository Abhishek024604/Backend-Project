import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,  // '*' allows any origin to access the API
    credentials: true,  // enables sending cookies across domains

}))           //.use is used to add middleware to the app. cors() is a middleware that helps to set HTTP headers to enable CORS.

app.use(express.json({limit:"16kb"}))  // express.json() is a middleware that parses incoming requests with JSON payloads.
app.use(express.urlencoded({extended:true,limit:"16kb"}))  // encodes incoming requests with URL-encoded payloads.
app.use(express.static("public"))  // serves static files from a specified directory.

app.use(cookieParser())  // parses cookies from the client request.

//routes import
import userRouter from './routes/user.routes.js'

//routes declaration

app.use('/api/v1/users', userRouter)  //transfers control to the userRouter (user.routes.js)when a request is made to /users
export { app  }