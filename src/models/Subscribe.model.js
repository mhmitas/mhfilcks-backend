import mongoose, { Schema } from "mongoose"

const subscribeSchema = new Schema(
    {
        channel: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subscriber: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        }
    },
    { timestamps: true }
)

export const Subscription = mongoose.model("Subscription", subscribeSchema)