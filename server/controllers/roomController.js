import Hotel from "../models/Hotel.js";
import {v2 as cloudinary} from "cloudinary";
import Room from "../models/Room.js";


export const createRoom = async (req, res) => {
    try {
        const {roomType, pricePerNight, amenities} = req.body;
        const hotel = await Hotel.findOne({owner: req.user._id});

        if(!hotel){
            return res.status(400).json({success: false, message: "No hotel found for this owner"});
        }

        const uploadImages = req.files.map(async(file)=>{
            const response = await cloudinary.uploader.upload(file.path);
            return response.secure_url;
        })

        const images = await Promise.all(uploadImages);
        await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: +pricePerNight,
            amenities : JSON.parse(amenities),
            images
        });

        return res.json({success: true, message: "Room created successfully"});

    } catch (error) {
        return res.status(500).json({success: false, message: "Server error"});
    }

}

export const getRooms = async(req,res) =>{
    try {
        const rooms = await Room.find({isAvailable:true}).populate({
            path:'Hotel',
            populate:{
                path:'owner',
                select: 'image'
            }
        }).sort({createdAt:-1});
        
        return res.json({success:true, rooms});

    } catch (error) {
        return res.status(500).json({success:false,message:error.message});
    }
}

export const getOwnerRooms = async(req,res) =>{
    try {
        const hotelData = await Hotel.findOne({owner:req.user._id});
        if(!hotelData){
            return res.status(400).json({success:false,message:"No hotel found"});
        }
        const rooms = await Room.find({hotel:hotelData._id.toString()}).populate('hotel');
        return res.json({success:true,rooms});
    } catch (error) {
        return res.status(500).json({success:false,message:error.message});
    }
}

export const toggleRoomAvailability = async(req,res) =>{
    try {
        const {roomId} = req.body;
        const room = await Room.findById(roomId);
        room.isAvailable = !room.isAvailable;
        await room.save();
        return res.json({success:true,message:"Room availability updated"});
    } catch (error) {
        return res.status(500).json({success:false,message:error.message});
    }
}