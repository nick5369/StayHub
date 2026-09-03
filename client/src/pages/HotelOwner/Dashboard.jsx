import React, { useEffect, useState } from 'react'
import Title from '../../components/Title'
import { Building2, DollarSign, Check, X } from "lucide-react";
import { useAppContext } from '../../context/appContext.jsx';

// ── Status badge config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
    pending:   { label: 'Pending',   classes: 'bg-amber-100 text-amber-700' },
    confirmed: { label: 'Confirmed', classes: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Cancelled', classes: 'bg-gray-100  text-gray-500'  },
};

const Dashboard = () => {
    const { axios, user, toast, currency } = useAppContext();
    const [DashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        bookings: []
    });
    // Track which booking is mid-request to disable buttons
    const [loadingId, setLoadingId] = useState(null);

    const fetchDashboardData = async () => {
        try {
            const { data } = await axios.get('/api/bookings/hotel')
            if (data.success) {
                setDashboardData(data.dashboardData)
            }
            else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    const handleConfirm = async (bookingId) => {
        setLoadingId(bookingId);
        try {
            const { data } = await axios.post(`/api/bookings/${bookingId}/confirm`);
            if (data.success) {
                toast.success(data.message);
                fetchDashboardData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoadingId(null);
        }
    };

    const handleCancel = async (bookingId) => {
        setLoadingId(bookingId);
        try {
            const { data } = await axios.post(`/api/bookings/${bookingId}/cancel`);
            if (data.success) {
                toast.success(data.message);
                fetchDashboardData();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoadingId(null);
        }
    };

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

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user])

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
                    value={Number(DashboardData.totalRevenue).toFixed(2)}
                    prefix={currency}
                />
            </div>

            {/* Recent Bookings */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-base text-gray-700">
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
                                    Payment
                                </th>
                                <th className="px-6 py-4 text-center font-semibold text-gray-700 align-middle text-lg">
                                    Booking Status
                                </th>
                                <th className="px-6 py-4 text-center font-semibold text-gray-700 align-middle text-lg">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {DashboardData.bookings.map((booking) => {
                                const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
                                // Show action buttons only for pending Pay-At-Hotel bookings
                                const showActions =
                                    booking.paymentMethod === 'Pay At Hotel' &&
                                    booking.status === 'pending';
                                const isLoading = loadingId === booking.id;

                                return (
                                    <tr
                                        key={booking.id}
                                        className="hover:bg-gray-50 transition-all duration-150"
                                    >
                                        <td className="px-6 py-4 text-center align-middle font-medium text-gray-900 text-base">
                                            {booking.user.username || 'Unknown'}
                                        </td>
                                        <td className="px-6 py-4 text-center align-middle text-gray-700 text-base">
                                            {booking.room.roomType}
                                        </td>
                                        <td className="px-6 py-4 text-center align-middle font-semibold text-gray-800 text-base">
                                            ${Number(booking.totalPrice).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center align-middle text-base">
                                            <span
                                                className={`px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide ${booking.isPaid
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                    }`}
                                            >
                                                {booking.isPaid ? 'Paid' : booking.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center align-middle text-base">
                                            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold tracking-wide ${statusCfg.classes}`}>
                                                {statusCfg.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center align-middle text-base">
                                            {showActions ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Confirm button */}
                                                    <button
                                                        id={`confirm-booking-${booking.id}`}
                                                        onClick={() => handleConfirm(booking.id)}
                                                        disabled={isLoading}
                                                        title="Confirm booking"
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Confirm
                                                    </button>
                                                    {/* Cancel button */}
                                                    <button
                                                        id={`cancel-booking-${booking.id}`}
                                                        onClick={() => handleCancel(booking.id)}
                                                        disabled={isLoading}
                                                        title="Cancel booking"
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
