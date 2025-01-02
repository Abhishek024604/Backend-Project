import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; //aggregation pipeline for aggregation operations

const videoSchema = new mongoose.Schema(
    {
       videoFile:{
        type: String, // path to the video file
        required: true,
       },
       thumbnail:{
        type: String, // path to the thumbnail image
        required: true,
       },
       title: {
        type: String,
        required: true,
       },
       description: {
        type: String,
        required: true,
       },
       duration:{
        type:Number,
        required: true,
       },
       views: {
        type: Number,
        default: 0,
       },
       isPublished:{
        type: Boolean,
        default: true
       },
       creator:{
        type: Schema.Types.ObjectId,
        ref: "User",
       }
    },
    { timestamps: true }
)

videoSchema.plugin(mongooseAggregatePaginate); // plugin for aggregation pipeline

export const Video = mongoose.model("Video", videoSchema); // "Video" is the name of the collection in MongoDB.