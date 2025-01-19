import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

const handleValidationsErrors = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() })
    }
    next();
}

export const validateMyUserRequest = [
    body("name").isString().notEmpty().withMessage("Name must be a string"),
    body("address").isString().notEmpty().withMessage("Address must be a string"),
    body("city").isString().notEmpty().withMessage("City must be a string"),
    body("country").isString().notEmpty().withMessage("Country must be a string"),
    handleValidationsErrors,
]



export const validateMyRestaurantRequest = [
    body("restaurantName").isString().notEmpty().withMessage("Restaurant Name its required"),
    body("city").isString().notEmpty().withMessage("City must be a string"),
    body("country").isString().notEmpty().withMessage("Country must be a string"),
    body("deliveryPrice").isFloat({ min: 0 })
        .withMessage("Delivery price must be a positive number"),
    body("cousines").isArray().withMessage("Cousines must be an array")
        .not().isEmpty()
        .withMessage("Cousines array cannot be emply"),
    body("menuItems").isArray().withMessage("Menu items must be an array"),
    body("menuItems.*.name").notEmpty().withMessage("Menu Item name is required"),
    body("manuItems.*.price").isFloat({ min: 0 }).withMessage("Menu item price is required"),
    handleValidationsErrors,
]