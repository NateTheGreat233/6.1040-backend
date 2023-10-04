import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface DualPostDoc extends BaseDoc {
  approved: boolean;
  content: string;
  image: {
    data: Buffer;
    mimeType: string;
  };
  date: Date;
  proposer: ObjectId;
  approver: ObjectId;
}

export default class DualPostConcept {
  public readonly dualPosts = new DocCollection<DualPostDoc>("dualPosts");

  public async propose(proposer: ObjectId, approver: ObjectId, content: string, image: { data: Buffer; mimeType: string }) {
    const _id = await this.dualPosts.createOne({ approved: false, content, image, date: new Date(), proposer, approver });
    return { msg: "Dual Post proposed successfully!", dualPost: await this.dualPosts.readOne({ _id }) };
  }

  public async approve(_id: ObjectId, approver: ObjectId) {
    await this.canApproveOrDeny(approver);
    this.dualPosts.updateOne({ _id }, { approved: true });
  }

  public async deny(_id: ObjectId, denier: ObjectId) {
    await this.canApproveOrDeny(denier);
    this.dualPosts.updateOne({ _id }, { approved: false });
  }

  public async delete(_id: ObjectId, author: ObjectId) {
    await this.canModifyDualPost(_id, author);
    this.dualPosts.deleteOne({ _id });
  }

  private async canApproveOrDeny(_id: ObjectId) {
    const proposedPost = await this.dualPosts.readOne({ _id });
    if (proposedPost?.approver.toString() !== _id.toString()) {
      throw new NotAllowedError("Not authorized to approve or deny this post.");
    }
  }

  private async canModifyDualPost(_id: ObjectId, deleter: ObjectId) {
    const proposedPost = await this.dualPosts.readOne({ _id });
    if (![proposedPost?.approver.toString(), proposedPost?.proposer.toString()].includes(_id.toString())) {
      throw new NotAllowedError("Not authorized to delete this post.");
    }
  }

  //   async create(username: string, password: string) {
  //     await this.canCreate(username, password);
  //     const _id = await this.users.createOne({ username, password });
  //     return { msg: "User created successfully!", user: await this.users.readOne({ _id }) };
  //   }
}
