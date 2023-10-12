import DocCollection, { BaseDoc } from "../framework/doc";

export interface DualProfileDoc extends BaseDoc {
    startedAt: Date,
    scrapbook: {
        image: string,
        caption: string,
        date: Date,
    }[],
}

export default class DualProfileConcept {
    public readonly dualProfiles = new DocCollection<DualProfileDoc>("dualProfiles");
}