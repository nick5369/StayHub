import Hotel from "../models/Hotel";
import User from "../models/User";

export const registerHotel = async (req,res)=>{
    try {
        const {name,adress,contact,city} = req.body;
        const owner = req.user._id;

        const hotel = await Hotel.findOne({owner});
        if(hotel){
            return res.status(400).json({success:true,message:"Hotel Already Registered"})
        }
        await Hotel.create({name,adress,contact,city,owner});
        await User.findByIdAndUpdate(owner,{role:"hotelOwner"});
        res.json({success:true,message:"Hotel Registered Successfully"})

    } catch (error) {
        res.status(500).json({success:false,message:"Internal Server Error"}) 
    }
}