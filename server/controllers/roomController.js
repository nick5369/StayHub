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

        // Normalize amenities to an array of strings
        let parsedAmenities = amenities;
        try {
            // amenities may be a JSON string when sent via multipart/form-data
            if (typeof amenities === 'string') {
                parsedAmenities = JSON.parse(amenities);
            }
        } catch (err) {
            // leave parsedAmenities as the original string; we'll handle below
        }

        if (!Array.isArray(parsedAmenities)) {
            if (parsedAmenities && typeof parsedAmenities === 'object') {
                // object like {"Free WiFi": true, "Pool": false}
                parsedAmenities = Object.keys(parsedAmenities).filter(k => Boolean(parsedAmenities[k]));
            } else if (typeof parsedAmenities === 'string') {
                // single comma-separated string -> split
                parsedAmenities = parsedAmenities.split(',').map(s => s.trim()).filter(Boolean);
            } else {
                parsedAmenities = [];
            }
        }

        await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: +pricePerNight,
            amenities: parsedAmenities,
            images
        });

        return res.json({success: true, message: "Room created successfully"});

    } catch (error) {
        return res.status(500).json({success: false, message: "Server error"});
    }

}

export const getRooms = async(req,res) =>{
    try {
        // Return available rooms. populate the 'hotel' field (it's the field name on Room schema)
        const rooms = await Room.find({ isAvailable: true })
            .populate({
                path: 'hotel',
                populate: {
                    path: 'owner',
                    select: 'image name'
                }
            })
            .sort({ createdAt: -1 });

        // Debugging: log number of rooms and a small sample so frontend devs can see the shape
        // console.log('getRooms - found rooms:', rooms.length);
        // if (rooms.length > 0) console.log('getRooms - sample room:', rooms[0]);

        return res.json({ success: true, rooms });

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