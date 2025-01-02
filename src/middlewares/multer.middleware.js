import multer from 'multer';

const storage = multer.diskStorage({
    destination: function (req, file, cb) { //when a file upload request is made in express
        cb(null, './public/temp') //callback function to set the destination directory
},
filename: function(req, file, cb) {
   
    cb(null, file.originalname) //callback function to set the filename as the original name as set by the user
}
})


export const upload = multer({
     storage 
});