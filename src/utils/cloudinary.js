import { v2 as cloudinary } from 'cloudinary';
import { log } from 'console';

import fs from 'fs'; // For file reading,writing, and deleting files

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,  
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto'
        }) //file has been uploaded to cloudinary successfully
        
      fs.unlinkSync(localFilePath) //remove the locally saved temporary file
        return response;
    }
    catch(error){
       fs.unlinkSync(localFilePath) //remove the locally saved temporary file if any error occurred during the upload
       return null;
    }
}


export { uploadOnCloudinary }
    