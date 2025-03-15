import { Request, Response } from "express";
import Stripe from "stripe";
import Restaurant, { menuItemType } from "../model/restaurant";
import Order from "../model/order";


const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);

const FRONTEND_URL = process.env.FRONTEND_URL as string;
const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

type CheckoutSessionRequest = {
    cartItems: {
        menuItemId: string,
        name: string;
        quantity: string;
    }[];
    deliveryDetails: {
        email: string,
        name: string,
        addressLine: string,
        city: string
    };
    restaurantId: string;
};

const getMyOrder = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find({ user: req.userId })
            .populate("restaurant")
            .populate("user");

        res.json(orders);
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong gettin getting the order" });
    }
};


const stripeWebhookHandler = async (req: Request, res: Response) => {
    let event;

    try {
        const sig = req.headers["stripe-signature"];
        event = STRIPE.webhooks.constructEvent(req.body, sig as string, STRIPE_ENDPOINT_SECRET);
    } catch (error: any) {
        console.log(error);
        res.status(400).send(`Webhook error: ${error.message}`).send()
    }

    if (event && event.type == "checkout.session.completed") {

        const order = await Order.findById(event.data.object.metadata?.orderId);

        if (!order) {
            res.status(404).json({ message: "Order not found." });
        } else {
            order.totalAmount = event.data.object.amount_total;
            order.status = "paid";
            await order.save();
            res.status(200).send();
        }
    }
};

const createCheckoutSession = async (req: Request, res: Response) => {
    try {
        const checkoutSessionRequest: CheckoutSessionRequest = req.body;

        const restaurant = await Restaurant.findById(checkoutSessionRequest.restaurantId);

        if (!restaurant) {
            throw new Error("Restaurant not found");
        }

        const newOrder = new Order({
            restaurant: restaurant,
            user: req.userId,
            statud: "placed",
            deliveryDetails: checkoutSessionRequest.deliveryDetails,
            cartItems: checkoutSessionRequest.cartItems,
            createdAt: new Date(),
            status: "placed"
        })

        const lineItems = createLineItems(checkoutSessionRequest, restaurant.menuItems);

        const session = await createSession(
            lineItems,
            newOrder._id.toString(),
            restaurant.deliveryPrice,
            restaurant.id.toString());

        if (!session.url) {
            res.status(500).json({ message: "Error Creating stripe session" })
        } else {
            await newOrder.save();
            res.status(200).json({ url: session.url })
        }

    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: error.raw.message })
    }
};

const createLineItems = (checkoutSessionRequest: CheckoutSessionRequest, menuItems: menuItemType[]) => {

    const lineItems = checkoutSessionRequest.cartItems.map((cartItem) => {

        const menuItem = menuItems.find((item) => item._id.toString() === cartItem.menuItemId.toString())
        if (!menuItem) {
            throw new Error(`Menu item not fond: ${cartItem.menuItemId.toString()}`)
        }

        const line_item: Stripe.Checkout.SessionCreateParams.LineItem = {
            price_data: {
                currency: "eur",
                unit_amount: menuItem.price,
                product_data: {
                    name: menuItem.name,
                },
            },
            quantity: parseInt(cartItem.quantity),
        }
        return line_item;
    })

    return lineItems;
};

const createSession = async (
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
    orderId: string,
    deliveryPrice: number,
    restaurantId: string) => {
    const sessionData = await STRIPE.checkout.sessions.create({
        line_items: lineItems,
        shipping_options: [
            {
                shipping_rate_data: {
                    display_name: "Delivery",
                    type: "fixed_amount",
                    fixed_amount: {
                        amount: deliveryPrice,
                        currency: "eur"
                    },
                },
            },
        ],
        mode: "payment",
        metadata: {
            orderId,
            restaurantId,
        },
        success_url: `${FRONTEND_URL}/order-status?success=true`,
        cancel_url: `${FRONTEND_URL}/detail/${restaurantId}?cancelled=true`,
    });

    return sessionData;
};


export default {
    createCheckoutSession,
    createLineItems,
    stripeWebhookHandler,
    getMyOrder
}