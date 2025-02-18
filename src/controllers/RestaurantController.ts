import { Request, Response } from "express";
import Restaurant from "../model/restaurant";


const searchRestaurants = async (req: Request, res: Response) => {

    try {

        const city = req.params.city;

        const searchQuery = (req.query.searchQuery as string) || "";
        const selectedCuisines = (req.query.cuisines as string) || "";
        const sortOptions = (req.query.sortOption as string) || "lastUpdated";

        const page = parseInt(req.query.page as string) || 1;

        let query: any = {};

        query["city"] = new RegExp(city, "i");

        const cityCheck = await Restaurant.countDocuments(query);

        if (cityCheck === 0) {
            console.log("No matches for ", city);
            res.status(404).json({
                data: [],
                pagination: {
                    total: 0,
                    page: 1,
                    pages: 1,
                }
            });
        } else {
            if (selectedCuisines) {
                const cuisinesArray = selectedCuisines
                    .split(",")
                    .map((cuisine) => new RegExp(cuisine, "i"));

                query["cuisines"] = { $all: cuisinesArray };
            }

            if (searchQuery) {
                const searchRegex = new RegExp(searchQuery, "i");
                query["$or"] = [
                    { restaurantName: searchRegex },
                    { cuisines: { $in: [searchRegex] } },
                ];
            }

            const pageSize = 10;

            const skip = (page - 1) * pageSize;
            const restaurants = await Restaurant.find(query)
                .sort({ [sortOptions]: 1 })
                .skip(skip)
                .limit(pageSize)
                .lean();

            const total = await Restaurant.countDocuments(query);

            const response = {
                data: restaurants,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / pageSize),
                }
            };

            res.status(200).json(response);
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong searching Restaurants" })
    }
};

const getRestaurant = async (req: Request, res: Response) => {
    try {
        const id = req.params.restaurantId;

        const restaurant = await Restaurant.findById(id);

        if (!restaurant) {
            res.status(404).json({ message: "restaurant not found" });
        } else {
            res.status(200).json(restaurant);
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong getting Restaurant" })
    }
};

export default {
    searchRestaurants,
    getRestaurant
}