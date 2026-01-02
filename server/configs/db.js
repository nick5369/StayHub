import mongoose from "mongoose";

const connectDB = async () => {
    try {
        console.log('🔄 Attempting MongoDB connection...');
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        })
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // In Vercel, we need to handle connection errors gracefully
        throw new Error(`Database connection failed: ${error.message}`);
    }
}
export default connectDB;