import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ExclusiveFriendDoc extends BaseDoc {
  user1: ObjectId;
  user2: ObjectId;
}

export interface ExclusiveFriendRequestDoc extends BaseDoc {
  from: ObjectId;
  to: ObjectId;
}

export interface Favorite extends BaseDoc {
  user: ObjectId;
  item: ObjectId;
}

export default class ExclusiveFriendConcept {
  public readonly friends = new DocCollection<ExclusiveFriendDoc>("exclusiveFriends");
  public readonly requests = new DocCollection<ExclusiveFriendRequestDoc>("exclusiveFriendsRequests");

  public async request(from: ObjectId, to: ObjectId) {
    if (from.toString() === to.toString()) {
      throw new NotAllowedError("You cannot request yourself!");
    }

    // check to see if either user already has an exclusive friend
    const friendship = await this.friends.readOne({
      $or: [
        { user1: from, user2: to },
        { user1: to, user2: from },
      ],
    });
    if (friendship !== null) {
      throw new NotAllowedError("Either you or the person you are requesting already has an exclusive friend. You can only have 1 exclusive friend at a time.");
    }

    // check to see if this user has already requested someone
    const existingRequest = await this.requests.readOne({ from });
    if (existingRequest !== null) {
      throw new NotAllowedError("You have already requested someone. Please remove the request before requesting someone.");
    }

    // check to see if the other user has already requested this person
    const pendingRequest = await this.requests.popOne({ from: to, to: from });
    if (pendingRequest !== null) {
      // new friendship!
      await this.friends.createOne({ user1: from, user2: to });
    } else {
      // add new request
      await this.requests.createOne({ from, to });
    }

    return { msg: "Request successfully recorded" };
  }

  public async removeRequest(from: ObjectId) {
    const request = await this.requests.popOne({ from });
    if (request === null) {
      throw new NotFoundError("You have not requested anyone");
    }

    return { msg: "Successfully removed request" };
  }

  public async removeExclusiveFriend(from: ObjectId) {
    const friendship = await this.friends.popOne({ $or: [{ user1: from }, { user2: from }] });
    if (friendship === null) {
      throw new NotFoundError("You are not in a friendship");
    }

    return { msg: "Successfully removed exclusive friend" };
  }

  public async areExclusiveFriends(first: ObjectId, second: ObjectId) {
    return this.friends.readOne({ $or: [{user1: first, user2: second}, {user1: second, user2: first}] }) !== null;
  }
}
