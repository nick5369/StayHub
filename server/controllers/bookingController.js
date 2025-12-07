import transporter from "../configs/nodemailer.js";
import Booking from "../models/Booking.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import stripe from "stripe";

//function to check availability of room
export const checkAvailability = async ({ checkInDate, checkOutDate, room }) => {
    try {
        const booking = await Booking.find({
            room,
            checkInDate: { $lte: checkOutDate },
            checkOutDate: { $gte: checkInDate },
        })

        const isAvailable = booking.length === 0;
        return isAvailable;
    } catch (error) {
        console.error(error.message);
        return false;
    }

}


export const checkAvailabilityApi = async (req, res) => {
    try {
        const { checkInDate, checkOutDate, room } = req.body;
        const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
        return res.json({ success: true, isAvailable });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

export const createBooking = async (req, res) => {
    try {
        const{room,checkInDate,checkOutDate,guests} = req.body;
        const user = req.user._id;
        const isAvailable = await checkAvailability({ checkInDate, checkOutDate, room });
        if(!isAvailable){
            return res.status(400).json({success:false,message:"Room not available"});
        }

        const roomData = await Room.findById(room).populate('hotel');
        let totalPrice = roomData.pricePerNight;
        const timeDiff = Math.abs(new Date(checkOutDate).getTime() - new Date(checkInDate).getTime());
        const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
        totalPrice = totalPrice * numberOfNights;

        const booking = await Booking.create({
            user,
            room,
            hotel:roomData.hotel._id,
            guests,
            checkInDate,checkOutDate,
            totalPrice,
        })

        const mailOptions = {
            from : process.env.SENDER_EMAIL,
            to : req.user.email,
            subject : 'Hotel Bookings Details - StayHub',
            html : `
                <h1>Booking Confirmed!</h1>
                <p>Your booking for the room at ${roomData.hotel.name} has been confirmed.</p>
                <h2>Booking Details:</h2>
                <ul>
                    <li><strong> Booking ID : </strong> ${booking._id}</li>
                    <li><strong> Hotel Name :</strong> ${roomData.hotel.name} </li>
                    <li> <strong> Location : </strong> ${roomData.hotel.address} </li>
                    <li> <strong> Date : </strong> ${booking.checkInDate.toDateString()} </li>
                    <li> <strong> Booking Amount : </strong> ${'$'} ${booking.totalPrice} /night</li> 
                </ul>
                <p>We look forward to hosting you!</p>
            `
        }

        // transporter is a nodemailer transport object (not a function)
        await transporter.sendMail(mailOptions)

        return res.json({success:true,message:"Booking successful"});

    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false,message:"Server error"});
    }
}


export const getUserBookings = async(req,res) =>{
    try {
        const user = req.user._id;
        const bookings = await Booking.find({user}).populate("room hotel").sort({createdAt:-1});
        return res.json({success:true,bookings});
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false,message:"Server error"});
    }
}

export const getHotelBookings = async(req,res) =>{
    try {
        const hotel = await Hotel.findOne({owner:req.user._id});
        if(!hotel){
            return res.status(400).json({success:false,message:"No hotel found"});
        }

        const bookings = await Booking.find({hotel:hotel._id}).populate("room hotel user").sort({createdAt:-1});
        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((total,booking) => total + booking.totalPrice, 0);
        return res.json({success:true, dashboardData:{bookings,totalBookings,totalRevenue}});
        
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({success:false,message:"Failed to fetch bookings"});
    }
}

export const stripePayment = async(req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await Booking.findById(bookingId);
        const roomData = await Room.findById(booking.room).populate('hotel')
        const totalPrice = booking.totalPrice;
        const {origin} = req.headers;

        const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);
        const line_items = [
            {
                price_data :{
                    currency : 'usd',
                    product_data :{
                        name : roomData.hotel.name,
                    },
                    unit_amount : totalPrice*100
                },
                quantity:1
            }
        ]

        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: "payment",
            success_url : `${origin}/loader/my-bookings`,
            cancel_url : `${origin}/my-bookings`,
            metadata :{
                bookingId,
            }
        })

        res.json({success:true, url : session.url});

    } catch (error) {
        res.json({success:false, message : "payment failed"});
    }
}