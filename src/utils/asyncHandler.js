// const asyncHandler = (fn) => async(req,res,next) =>{
//     try {
//         await fn(req, res , next )
//     } catch (error) {
//         resizeBy.status(err.code || 500).json({
//             success:false,
//             message:err.message
//         })
//     }
// }
const asyncHandler = (reqHandle) => {
    (req , res, next) =>{
        Promise.resolve(reqHandle(req,res,next)).catch((err) => next(err))
    }
}

export {asyncHandler}