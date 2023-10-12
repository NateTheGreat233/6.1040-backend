import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { storeInS3 } from "../framework/utils";
import { BadValuesError, NotAllowedError, NotFoundError } from "./errors";

export interface DualPostDoc extends BaseDoc {
  approved: boolean;
  content: string;
  imageUrl: string
  date: Date;
  proposer: ObjectId;
  approver: ObjectId;
}

export default class DualPostConcept {
  public readonly dualPosts = new DocCollection<DualPostDoc>("dualPosts");

  public async getAllDualPosts(num: number) {
    if (Math.floor(num) !== num) {
      throw new BadValuesError("Number of posts must be an integer");
    }
    return await this.dualPosts.readMany({ approved: true }, { limit: num, sort: { date: "desc" } });
  }

  public async getDualPostsFromAuthor(author: ObjectId) {
    const posts = await this.dualPosts.readMany({ $or: [{ proposer: author }, { approver: author }] });
    return { msg: "Personal Dual Posts fetched successfully!", posts };
  }

  public async propose(proposer: ObjectId, approver: ObjectId, content: string, image: { buffer: Uint8Array, mimeType: string }) {
    const imageUrl = await storeInS3(image.buffer, image.mimeType);
    const _id = await this.dualPosts.createOne({ approved: false, content, imageUrl, date: new Date(), proposer, approver });
    return { msg: "Dual Post proposed successfully!", dualPost: await this.dualPosts.readOne({ _id }) };
  }

  public async modify(_id: ObjectId, author: ObjectId, update: { content: string, buffer: Uint8Array, mimeType: string }) {
    await this.canModifyPost(_id, author);
    const imageUrl = await storeInS3(update.buffer, update.mimeType);
    const post = await this.dualPosts.updateOne({ _id }, { imageUrl, content: update.content });
    return { msg: "Post modified successfully!", post };
  }

  public async approve(_id: ObjectId, approver: ObjectId) {
    await this.canApproveOrDeny(_id, approver);
    await this.dualPosts.updateOne({ _id }, { approved: true });
    return { msg: "Dual Post approved successfully!" };
  }

  public async deny(_id: ObjectId, denier: ObjectId) {
    await this.canApproveOrDeny(_id, denier);
    await this.dualPosts.deleteOne({ _id });
    return { msg: "Dual Post denied successfully!" };
  }

  public async delete(ids: Iterable<ObjectId>, deleter: ObjectId) {
    const checks = [];
    for (const id of ids) {
      checks.push(this.canDeleteDualPost(id, deleter));
    }
    await Promise.all(checks);

    const deletions = [];
    for (const id of ids) {
      deletions.push(this.dualPosts.deleteOne({ _id: id }));
    }
    await Promise.all(deletions);

    return { msg: "Dual Post(s) deleted successfully!" };
  }

  private async canApproveOrDeny(_id: ObjectId, user: ObjectId) {
    const proposedPost = await this.dualPosts.readOne({ _id, approved: false });
    if (proposedPost === null) {
      throw new NotFoundError("This post doesn't exist or has already been approved");
    }
    if (proposedPost.approver.toString() !== user.toString()) {
      throw new NotAllowedError("Not authorized to approve or deny this post.");
    }
  }

  private async canDeleteDualPost(_id: ObjectId, deleter: ObjectId) {
    const proposedPost = await this.dualPosts.readOne({ _id });
    if (proposedPost === null) {
      throw new NotFoundError("This post doesn't exist!");
    }
    if (![proposedPost.approver.toString(), proposedPost.proposer.toString()].includes(deleter.toString())) {
      throw new NotAllowedError("Not authorized to delete this post.");
    }
  }

  private async canModifyPost(_id: ObjectId, author: ObjectId) {
    const post = await this.dualPosts.readOne({ _id });
    if (post === null) {
      throw new NotFoundError("This post doesn't exist!");
    }
    if (post.approved) {
      throw new NotAllowedError("You cannot modify a dual post that has already been approved.");
    }
    if (![post.approver.toString(), post.proposer.toString()].includes(author.toString())) {
      throw new NotAllowedError("Not authorized to modify this post.");
    }
  }
}
