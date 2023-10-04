import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface ProfileDoc extends BaseDoc {
    entityId: ObjectId
    name: string
}

export default class ProfileConcept {
    private readonly profiles = new DocCollection<ProfileDoc>("profiles");

    public async setProfile(entityId: ObjectId, name: string) {
        try {
            await this.getProfile(entityId);
            // profile exists, update existing profile
            await this.profiles.updateOne({ entityId }, { name });
        } catch (_err) {
            // no profile exists, create a new one
            await this.profiles.createOne({ entityId, name });
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
}
