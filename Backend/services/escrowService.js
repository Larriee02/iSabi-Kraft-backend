import Escrow from "../models/escrow.js";
import EscrowTransaction from "../models/escrowTransaction.js";
import {makeReference, transferToArtisan } from "./paystackService.js";





// fund escrow account
const fundEscrowAccount = async (escrowId, amount) => {
    try {
        // Find the escrow by ID
        const escrow = await Escrow.findById(escrowId);
        if (!escrow) {
            throw new Error("Escrow not found");
        }
        //Retry a failed material payment
        if (escrow.status === "payment_confirmed" && escrow.materialPaymentStatus === "failed") {
            escrow.materialPaymentStatus = "pending";
            await escrow.save();
            return releaseMaterial(escrowId, amount);
        } 
        
        if (escrow.status !== "awaiting_payment"){
            return escrow
        };
        escrow.status = "funded";
        escrow.heldAmount = escrow.totalAmount;
        await escrow.save();

        // Record incoming payment
        await EscrowTransaction.updateOne(
            { providerReference: payment.reference },
            { $setOnInsert: { 
                escrowId: escrow._id, 
                kind: 'funding', 
                amount: payment.amount, 
                status: 'success', 
                providerReference: payment.reference 
            } 
        },
            { upsert: true },
    );
        return Escrow.findById(escrowId);
    }  
    catch (error) {
        console.error("Error funding escrow account:", error);
        throw error;
    }
};

// Material payment release
const releaseMaterial = async (escrowId) => {
    try {
        // Automatically claim the escrow if the material payment is released
        const escrow = await Escrow.findOneAndUpdate(
            { _id: escrowId, status: "funded" },
            { $set: { materialPaymentStatus: "pending" } },
            { new: true }
        );  

        if (!escrow) {
            throw new Error("Escrow not found or not funded");
        }

//If no material payment was agreed
        if (escrow.materialPaymentAmount === 0) {
            escrow.materialPaymentStatus = "not_applicable";
            await escrow.save();
            return escrow;
        }

        const artisan = await User.findById(escrow.artisanID);
        if (!artisan?.paystackRecipientCode) {
            escrow.materialPaymentStatus = "failed";
            await escrow.save();
            throw new Error("Artisan does not have a valid Paystack recipient code");
        }

        const reference = makeReference();

// Create reciept for material payment
        await EscrowTransaction.create({
            escrowId: escrow._id,
            kind: "material_payment",
            amount: escrow.materialPaymentAmount,
            status: "pending",
            providerReference: reference,
        });

        const transfer = await transferToArtisan(
            {
                source: "balance",
                amount: escrow.materialPaymentAmount * 100, // Convert to kobo  
                recipient: artisan.paystackRecipientCode,
                reference: reference,
            }
        );

        escrow.materialTrasactionCode = transfer.transfer_code;
        await escrow.save();

        // Update the transaction status based on the transfer response
        await EscrowTransaction.updateOne(
            { providerReference: reference },
            { $set: { 
                status: transfer.status === "success" ? "completed" : "failed",
                metadata: {error: error.message}
                }
            }

        );

        return escrow;
    }
    catch (error) {
        console.error("Error releasing material payment:", error);
        throw error;
    }
};

//After job completion is confirmed
const confirmCompletion = async (jobId, escrowId, customerID) => {
    try {
        const job = await Job.findById(jobId);
        if (!job || job.customerID.toString() !== customerID.toString()) {
            throw new Error("Job not found");
        }

        const escrow = await Escrow.findOne({jobID: jobId, _id: escrowId});
        if (!escrow || escrow.customerID.toString() !== customerID.toString() || escrow.status !== "material_payment_made") {
            throw new Error("Escrow not ready for balance release");
        }

        if (escrow.balancePaymentStatus !== "pending") {
            throw new Error("Balance payment is not pending");
        }

        if (escrow.remainingAmount > 0 && !artisan.paystackRecipientCode) {
            escrow.balancePaymentStatus = "failed";
            await escrow.save();
            throw new Error("Artisan does not have a valid Paystack recipient code");
        }

        const reference = makeReference();

        escrow.balancePaymentStatus = "pending";
        await escrow.save();
        escrow.completedAt = new Date();

        // Create a transaction record for the balance payment
        await EscrowTransaction.create({
            escrowId: escrow._id,
            kind: "balance_release",
            amount: escrow.remainingAmount,
            status: "pending",
            providerReference: reference,
        });

        const transfer = await transferToArtisan(
            {
                source: "balance",
                amount: escrow.remainingAmount * 100, // Convert to kobo
                recipient: artisan.paystackRecipientCode,
                reference: reference,
            }
        );

        escrow.finalTransferCode = transfer.transfer_code;
        await escrow.save();

        await EscrowTransaction.updateOne(
            { providerReference: reference },
            { $set: {
                status: transfer.status === "success" ? "completed" : "failed",
                metadata: {error: error.message}
            }}
        );

        return escrow;
    } catch (error) {
        console.error("Error confirming job completion:", error);
        throw error;

    }

};

// for verified paystack webhook transfer
const handlePaystackWebhook = async (event, data) => {
    try {
        const transaction = await EscrowTransaction.findOne({ 
            providerReference: data.reference 
        }
    );

        if (!transaction || transaction.status === "completed") {
            return;
        };

        const successfull = event === "transfer.completed";
        const failed = event === "transfer.failed";

        if (!successfull && !failed) {
            return;
        };   

        if (successfull || failed) {
            transaction.status = successfull ? "completed" : "failed";
            transaction.metadata = data;
            await transaction.save();
        }

        const escrow = await Escrow.findById(transaction.escrowId);
        if (!escrow) {
            throw new Error("Escrow not found for the transaction");
        }

        if (transaction.kind === "material_payment") {
            escrow.materialPaymentStatus = successfull ? "completed" : "failed";
            if (successfull) {
                escrow.status = "material_payment_made";
            } else {
            escrow.status = "failed";
            }
        }
        
        if (transaction.kind === "balance_release") {
            escrow.balancePaymentStatus = successfull ? "completed" : "failed";
            if (successfull) {
                escrow.status = "balance_released";
            } else {
                escrow.status = "failed";
            }
        }

        await escrow.save();
    }
    catch (error) {
        console.error("Error handling Paystack webhook:", error);
        throw error;
    }
};

export { 
    fundEscrowAccount, 
    releaseMaterial, 
    confirmCompletion, 
    handlePaystackWebhook 
};    