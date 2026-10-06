import paystackRequest from "../config/paystack.js"
import crypto from "node:crypto";

//Generate a unique reference for the transaction
const makeReference = () => `isk_${crypto.randomUUID()}`

async function initializePayment(data) {
    try {
        //send a POST request to Paystack's initialize endpoint with the payment data and a unique reference
        const postRequest = await paystackRequest.post(
            "/transaction/initialize", {
                ...data,
                reference: makeReference()
            }
        ); 
        return postRequest.data;
    } catch (error) {
        console.error(
            "Error initializing payment:", 
            error.response?.data || error.message
        );
        throw new Error(
            error.response?.data?.message || "Failed to initialize payment"
        );
    }
}

const verifyPayment = async (reference) => {
    try {
        //send a GET request to Paystack's verify endpoint with the unique reference
        const getRequest = await paystackRequest.get(
            `/transaction/verify/${reference}` 
        );
        return getRequest.data;
    } catch (error) {
        console.error(
            "Error verifying payment:", 
            error.response?.data || error.message
        );
        throw new Error(
            error.response?.data?.message || "Failed to verify payment"
        );
    }
}

const createTransferRecipient = async (data) => {
    try {
        const postRequest = await paystackRequest.post(
            "/transfer/recipient",
            data
        );
        return postRequest.data;
    } catch (error) {
        console.error(
            "Error creating transfer recipient:",
            error.response?.data || error.message
        );
        throw new Error(
            error.response?.data?.message || "Failed to create transfer recipient"
        );
    }
}

// Transfer to artisan
const transferToArtisan = async (data) => {
    try {
        const postRequest = await paystackRequest.post(
            "/transfer",
            data
        );
        return postRequest.data;
    } catch (error) {
        console.error(
            "Error transferring to artisan:",
            error.response?.data || error.message
        );
        throw new Error(
            error.response?.data?.message || "Failed to transfer to artisan"
        );
    }
}

// Validate Paystack webhook signature
function validWebHookSignature(req) {
    const paystackSignature = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const hash = crypto.createHmac("sha512", secret)
        .update(JSON.stringify(req.body))
        .digest("hex");
    return hash === paystackSignature;
}

export {
    makeReference,
    initializePayment,
    verifyPayment,
    createTransferRecipient,
    transferToArtisan,
    validWebHookSignature
};