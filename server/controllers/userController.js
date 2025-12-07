export const getUserData = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(404).json({success: false, message: "User not found"});
        }
        const role = req.user.role;
        const recentSearchedCities = req.user.recentSearchedCities;
        res.json({success: true, role, recentSearchedCities});

    } catch (error) {
        console.error('getUserData error:', error);
        res.status(500).json({success: false, message: error.message});
    }
}

export const storeRecentSearchedCities = async(req,res) => {
    try {
        const {recentSearchedCity} = req.body;
        const user = req.user;
        if(user.recentSearchedCities.length < 3){
            user.recentSearchedCities.push(recentSearchedCity);
        }
        else{
            user.recentSearchedCities.shift();
            user.recentSearchedCities.push(recentSearchedCity);
        }
        await user.save();
        res.json({success: true, message: "city added"});
    } catch (error) {
        console.error('storeRecentSearchedCities error', error);
        res.status(500).json({success: false, message: error.message});
    }
}