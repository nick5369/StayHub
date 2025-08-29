import React, { useState } from "react";

function Filters() {
    // State for checkboxes
    const [popularFilters, setPopularFilters] = useState({
        single: false,
        double: false,
        luxury: false,
        family: false,
    });

    const [priceRange, setPriceRange] = useState({
        p1: false,
        p2: false,
        p3: false,
        p4: false,
    });

    // State for radio
    const [sortBy, setSortBy] = useState("");

    // Clear all filters
    const clearFilters = () => {
        setPopularFilters({ single: false, double: false, luxury: false, family: false });
        setPriceRange({ p1: false, p2: false, p3: false, p4: false });
        setSortBy("");
    };

    return (
        <aside className="lg:col-span-1 bg-white rounded-xl shadow-sm border p-6 h-fit">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:underline"
                >
                    Clear
                </button>
            </div>

            {/* Popular Filters */}
            <div className="mb-6">
                <p className="font-medium text-gray-700 mb-2">Popular filters</p>
                <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.single}
                            onChange={() =>
                                setPopularFilters((prev) => ({
                                    ...prev,
                                    single: !prev.single,
                                }))
                            }
                            className="mr-2"
                        />
                        Single Bed
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.double}
                            onChange={() =>
                                setPopularFilters((prev) => ({
                                    ...prev,
                                    double: !prev.double,
                                }))
                            }
                            className="mr-2"
                        />
                        Double Bed
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.luxury}
                            onChange={() =>
                                setPopularFilters((prev) => ({
                                    ...prev,
                                    luxury: !prev.luxury,
                                }))
                            }
                            className="mr-2"
                        />
                        Luxury Room
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.family}
                            onChange={() =>
                                setPopularFilters((prev) => ({
                                    ...prev,
                                    family: !prev.family,
                                }))
                            }
                            className="mr-2"
                        />
                        Family Suite
                    </label>
                </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
                <p className="font-medium text-gray-700 mb-2">Price Range</p>
                <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.p1}
                            onChange={() =>
                                setPriceRange((prev) => ({ ...prev, p1: !prev.p1 }))
                            }
                            className="mr-2"
                        />
                        $0 to 500
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.p2}
                            onChange={() =>
                                setPriceRange((prev) => ({ ...prev, p2: !prev.p2 }))
                            }
                            className="mr-2"
                        />
                        $500 to 1000
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.p3}
                            onChange={() =>
                                setPriceRange((prev) => ({ ...prev, p3: !prev.p3 }))
                            }
                            className="mr-2"
                        />
                        $1000 to 2000
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.p4}
                            onChange={() =>
                                setPriceRange((prev) => ({ ...prev, p4: !prev.p4 }))
                            }
                            className="mr-2"
                        />
                        $2000 to 3000
                    </label>
                </div>
            </div>

            {/* Sort By */}
            <div>
                <p className="font-medium text-gray-700 mb-2">Sort By</p>
                <div className="flex flex-col gap-2 text-sm text-gray-600">
                    <label>
                        <input
                            type="radio"
                            name="sort"
                            checked={sortBy === "low"}
                            onChange={() => setSortBy("low")}
                            className="mr-2"
                        />
                        Price Low to High
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="sort"
                            checked={sortBy === "high"}
                            onChange={() => setSortBy("high")}
                            className="mr-2"
                        />
                        Price High to Low
                    </label>
                    <label>
                        <input
                            type="radio"
                            name="sort"
                            checked={sortBy === "new"}
                            onChange={() => setSortBy("new")}
                            className="mr-2"
                        />
                        Newest First
                    </label>
                </div>
            </div>
        </aside>
    );
}

export default Filters;
