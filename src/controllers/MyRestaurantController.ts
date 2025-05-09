import { Request, Response } from "express";
import Restaurant from "../model/restaurant";
import cloudinary from "cloudinary";
import mongoose from "mongoose";


const getMyRestaurant = async (req: Request, res: Response) => {

    try {

        console.log(req.userId, "user id");

        const restaurant = await Restaurant.findOne({ user: req.userId });

        if (!restaurant) {
            console.log("Restaurant not found")
            res.status(404).json({ message: "Restaurant not found" }).send();
        } else {
            res.json(restaurant);
        }

    } catch (error) {
        console.log("Error trying to get restaurant", error);
        res.status(500).json({ message: "Error fetching resutarant" });
    }
}


const createMyRestaurant = async (req: Request, res: Response) => {

    try {

        const existingRestaurant = await Restaurant.findOne({ user: req.userId });

        if (existingRestaurant) {
            res.status(409).json({ message: "User Restaurant Already Exists" });
        }

        const imageUrl = await uploadImage(req.file as Express.Multer.File);

        const restaurant = new Restaurant(req.body);
        restaurant.imageUrl = imageUrl;
        restaurant.user = new mongoose.Types.ObjectId(req.userId);
        restaurant.lastUpdated = new Date();

        await restaurant.save();

        res.status(201).send(restaurant);


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong creating restaurant." })
    }
}

const updateMyRestaurant = async (req: Request, res: Response) => {

    try {
        const restaurant = await Restaurant.findOne({ user: req.userId });

        if (!restaurant) {
            res.status(409).json({ message: "Restaurant not found" });
        } else {
            restaurant.restaurantName = req.body.restaurantName;
            restaurant.city = req.body.city;
            restaurant.country = req.body.country;
            restaurant.deliveryPrice = req.body.deliveryPrice;
            restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime;
            restaurant.cuisines = req.body.cuisines;
            restaurant.menuItems = req.body.menuItems;
            restaurant.lastUpdated = new Date();

            if (req.file) {
                const imageUrl = await uploadImage(req.file as Express.Multer.File);
                restaurant.imageUrl = imageUrl;
            }

            await restaurant.save();
            res.status(200).send(restaurant);
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong updating restaurant." })
    }
}

const uploadImage = async (file: Express.Multer.File) => {
    const image = file;
    const base64Image = Buffer.from(image.buffer).toString("base64");
    const dataURI = `data:${image.mimetype};base64,${base64Image}`;
    const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);

    return uploadResponse.url;
}


export default { createMyRestaurant, getMyRestaurant, updateMyRestaurant }