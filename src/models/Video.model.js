import mongoose from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const VideoSchema = new mongoose.Schema({
    title:{
  type:String,
  required:true
},
videoFile:{
  type:String,//cloudinary url
  required:true
},
Thumbnail:{
  type:String,//cloudinary url
  required:true  
},
description:{
  type:String,
  required:true, 
},
duration:{
  type:Number,//cloudinary url
  required:true, 
},
views:{
  type:Number,
  default:0, 
},
isPublished:{
  type:Boolean,
  default:true, 
},
owner:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"User"
}


},
{timestamps:true})

VideoSchema.plugin(mongooseAggregatePaginate);


export const User = mongoose.model(' User', ' UserSchema');