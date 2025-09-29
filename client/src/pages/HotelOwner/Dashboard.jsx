import React, { useState } from 'react'
import Title from '../../components/Title'
import { Building2, DollarSign } from "lucide-react";
import { dashboardDummyData } from '../../assets/assets';

const Dashboard = () => {
    const [DashboardData] = useState(dashboardDummyData);

    // Stat card component
    const StatCard = ({ icon: Icon, title, value, prefix }) => (
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-blue-50 px-6 py-5 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Icon className="h-6 w-6 text-blue-500" />
            </div>
            <div>
                <h3 className="text-sm font-semibold text-blue-600">{title}</h3>
                <p className="text-xl font-bold text-gray-800">
                    {prefix}{value}
                </p>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <Title
                title='Dashboard'
                align='left'
                subtitle='Monitor your room listings, track bookings and analyze revenue—all in one place. Stay updated with real-time insights to ensure smooth operations.'
                font='outfit'
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <StatCard
                    icon={Building2}
                    title="Total Bookings"
                    value={DashboardData.totalBookings}
                />
                <StatCard
                    icon={DollarSign}
                    title="Total Revenue"
                    value={DashboardData.totalRevenue}
                    prefix="$"
                />
            </div>

            {/* Recent Bookings */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden  ">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-base text-gray-700 ">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-center font-semibold text-gray-700 align-middle text-lg">
                                    User Name
                                </th>
                                <th className="px-6 py-4 text-center font-semibold text-gray-700 align-middle text-lg">
                                    Room Name
                                </th>
                                <th className="px-6 py-4 text-center font-semibold text-gray-700 align-middle text-lg">
                                    Total Amount
                                </th>
                                <th className="px-6 py-4 text-center font-semibold text-gray-700 align-middle text-lg">
                                    Payment Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {DashboardData.bookings.map((booking) => (
                                <tr
                                    key={booking._id}
                                    className="hover:bg-gray-50 transition-all duration-150"
                                >
                                    <td className="px-6 py-4 text-center align-middle font-medium text-gray-900 text-base">
                                        {booking.user.username || "Unknown"}
                                    </td>
                                    <td className="px-6 py-4 text-center align-middle text-gray-700 text-base">
                                        {booking.room.roomType}
                                    </td>
                                    <td className="px-6 py-4 text-center align-middle font-semibold text-gray-800 text-base">
                                        ${booking.totalPrice}
                                    </td>
                                    <td className="px-6 py-4 text-center align-middle text-base">
                                        <span
                                            className={`px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide ${booking.isPaid
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-yellow-100 text-yellow-700"
                                                }`}
                                        >
                                            {booking.isPaid ? "Completed" : "Pending"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>


                </div>
            </div>
        </div>
    )
}

export default Dashboard
