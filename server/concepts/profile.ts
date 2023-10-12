import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface ProfileDoc extends BaseDoc {
    entityId: ObjectId
    name: string
}

export default class ProfileConcept {
    private readonly profiles = new DocCollection<ProfileDoc>("profiles");

    public async setProfile(entityId: ObjectId, update: Partial<ProfileDoc>) {
        try {
            await this.getProfile(entityId);
            // profile exists, update existing profile
            await this.profiles.updateOne({ entityId }, update);
        } catch (_err) {
            // no profile exists, create a new one
            await this.profiles.createOne({ entityId, ...update });
        }

        return { msg: "Successfully set profile" };
    }

    public async getProfile(entityId: ObjectId) {
        const profile = await this.profiles.readOne({ entityId });
        if (profile === null) {
            throw new NotFoundError("Could not find profile");
        }

        return { msg: "Successfully fetched profile", profile };
    }

    public async deleteProfile(entityId: ObjectId) {
        const deleteResult = await this.profiles.deleteOne({ entityId });
        return { msg: deleteResult.deletedCount === 1 ? "Successfully deleted" : "Could not delete profile" };
    }
}
