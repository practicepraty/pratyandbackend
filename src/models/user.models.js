import mongoose from "mongoose"
const UserSchema = new mongoose.Schema({

username:{
  type:String,
  required:true,
  unique:true,
  trim:true,
  index:true,  
},
email:{
  type:String,
  required:true,
  unique:true,
  trim:true,  
},
fullName:{
  type:String,
  required:true,  
  trim:true,  
  index:true,
},
Avatar:{
  type:String,//from aws 
  required:true,  
},
coverimage:{
 type:String,//from aws 
  required:true,  
},

Password:{
  type:String,
  required:[true,"Password is requred"]
},
watchHistory:[
    {
        type: mongoose.Schema.types.ObjectId,
        ref:"Video"
    }
],
refreshToken: {
type:String,
 },


},{timestamps:true})

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}
userSchema.methods.generateAccessToken=function(){
  return jwt.sign(
    {
    _id:this._id,
    username:this.username,
    email:this.email,
    fullName:this.fullName,
  },
   process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }

  )

}
userSchema.methods.generateRefreshToken=function(){

  return jwt.sign(
    {
    _id:this._id,
    
  },
   process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }

  )

}






export const User = mongoose.model(' User', ' UserSchema');
