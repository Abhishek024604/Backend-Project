//method 1 using promises

const asyncHandler = (requestHandler)=>{
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}


export { asyncHandler  }

//const asyncHandler =() => {}
 // const asynHandler = (fn) =>{()=>{}}
// const asyncHandler = (fn) => async () => {}




//standard wrapper function to handle async/await errors in express.js routes.

// const asyncHandler = (fn)=> async (req,res,next) =>{
//     try {
//        await fn(req,res,next) 
//     } catch (error) {
//         res.status(error.code||500).json({
//             message:error.message,
//             success:false
//         })
//     }
// }
