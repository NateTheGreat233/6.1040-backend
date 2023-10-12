import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { storeInS3 } from "../framework/utils";
import { NotAllowedError, NotFoundError } from "./errors";

export interface DualProfileDoc extends BaseDoc {
    startedAt: Date,
    user1: ObjectId,
    user2: ObjectId,
    scrapbook: {
        imageUrl: string,
        caption: string,
        date: Date,
    }[],
}

export default class DualProfileConcept {
    public readonly dualProfiles = new DocCollection<DualProfileDoc>("dualProfiles");

    public async createDualProfile(user1: ObjectId, user2: ObjectId, startedAt: Date) {
        await this.canCreateDualProfile(user1);
        await this.canCreateDualProfile(user2);
        await this.dualProfiles.createOne({ startedAt, user1, user2, scrapbook: [] });
        return { msg: "Successfully created dual profile" };
    }

    public async getDualProfile(user: ObjectId) {
        const profile = await this.dualProfiles.readOne({ $or: [{ user1: user }, { user2: user }] });
        if (profile === null) {
            throw new NotFoundError("Could not find a dual profile");
        }
        return { msg: "Successfully fetched dual profile", dualProfile: profile };
    }

    public async updateStartTime(user: ObjectId, newTime: Date) {
        const updateResult = await this.dualProfiles.updateOne({ $or: [{ user1: user }, { user2: user }] }, { startedAt: newTime });
        if (updateResult.modifiedCount !== 1) {
            throw new NotFoundError("Could not find a dual profile");
        }
        return { msg: "Successfully updated start time"};
    }

    public async addToScrapbook(user: ObjectId, entry: { image: { buffer: Uint8Array, mimeType: string }, caption: string, date: Date }) {
        const imageUrl = await storeInS3(entry.image.buffer, entry.image.mimeType);
        const profile = await this.getDualProfile(user);
        const existingScrapbook = profile.dualProfile.scrapbook;
        const updateResult = await this.dualProfiles.updateOne({ 
            $or: [{ user1: user }, { user2: user }] }, 
            { scrapbook: [...existingScrapbook, { imageUrl, caption: entry.caption, date: entry.date }] 
        });
        if (updateResult.modifiedCount !== 1) {
            throw new NotFoundError("Could not find a dual profile");
        }
        return { msg: "Successfully updated the scrapbook" };
    }

    public async deleteDualProfile(user: ObjectId) {
        const deleteResult = await this.dualProfiles.deleteOne({ $or: [{ user1: user }, { user2: user }] });
        return { msg: deleteResult.deletedCount === 1 ? "Successfully deleted dual profile" : "Could not find profile to be deleted" };
    }

    public async canCreateDualProfile(user: ObjectId) {
        const profile = await this.dualProfiles.readOne({ $or: [{ user1: user }, { user2: user }] });
        if (profile !== null) { 
            throw new NotAllowedError("A user may only have 1 dual profile at a time");
        }
    }
}