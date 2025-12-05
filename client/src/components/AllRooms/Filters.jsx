import React, { useState } from "react";

function Filters() {
    // State for checkboxes: store selected room type strings
    const [popularFilters, setPopularFilters] = useState([]);

    // store selected numeric ranges as strings like '0 to 500'
    const [priceRange, setPriceRange] = useState([]);

    // State for radio
    const [sortBy, setSortBy] = useState("");

    // Clear all filters
    const clearFilters = () => {
        setPopularFilters([]);
        setPriceRange([]);
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
                            checked={popularFilters.includes('Single Bed')}
                            onChange={() =>
                                setPopularFilters((prev) =>
                                    prev.includes('Single Bed') ? prev.filter(p => p !== 'Single Bed') : [...prev, 'Single Bed']
                                )
                            }
                            className="mr-2"
                        />
                        Single Bed
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.includes('Double Bed')}
                            onChange={() =>
                                setPopularFilters((prev) =>
                                    prev.includes('Double Bed') ? prev.filter(p => p !== 'Double Bed') : [...prev, 'Double Bed']
                                )
                            }
                            className="mr-2"
                        />
                        Double Bed
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.includes('Luxury Room')}
                            onChange={() =>
                                setPopularFilters((prev) =>
                                    prev.includes('Luxury Room') ? prev.filter(p => p !== 'Luxury Room') : [...prev, 'Luxury Room']
                                )
                            }
                            className="mr-2"
                        />
                        Luxury Room
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={popularFilters.includes('Family Suite')}
                            onChange={() =>
                                setPopularFilters((prev) =>
                                    prev.includes('Family Suite') ? prev.filter(p => p !== 'Family Suite') : [...prev, 'Family Suite']
                                )
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
                            checked={priceRange.includes('0 to 500')}
                            onChange={() =>
                                setPriceRange(prev => prev.includes('0 to 500') ? prev.filter(p => p !== '0 to 500') : [...prev, '0 to 500'])
                            }
                            className="mr-2"
                        />
                        $0 to 500
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.includes('500 to 1000')}
                            onChange={() =>
                                setPriceRange(prev => prev.includes('500 to 1000') ? prev.filter(p => p !== '500 to 1000') : [...prev, '500 to 1000'])
                            }
                            className="mr-2"
                        />
                        $500 to 1000
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.includes('1000 to 2000')}
                            onChange={() =>
                                setPriceRange(prev => prev.includes('1000 to 2000') ? prev.filter(p => p !== '1000 to 2000') : [...prev, '1000 to 2000'])
                            }
                            className="mr-2"
                        />
                        $1000 to 2000
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={priceRange.includes('2000 to 3000')}
                            onChange={() =>
                                setPriceRange(prev => prev.includes('2000 to 3000') ? prev.filter(p => p !== '2000 to 3000') : [...prev, '2000 to 3000'])
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
