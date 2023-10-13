import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { ConversationPrompt, DualPost, DualProfile, ExclusiveFriend, Profile, User, WebSession } from "./app";
import { ProfileDoc } from "./concepts/profile";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";

type Image = { buffer: string, mimeType: string };

class Routes {

  // ********** PROFILE ROUTES **********

  @Router.get("/profile/:username")
  async getProfile(session: WebSessionDoc, username?: string) {
    let user;
    if (username === undefined) {
      // get profile for currently authenticated user
      user = WebSession.getUser(session);
    } else {
      // get profile for user corresponding to username
      user = (await User.getUserByUsername(username))._id;
    }

    return await Profile.getProfile(user);
  }

  @Router.put("/profile")
  async setProfile(session: WebSessionDoc, update: Partial<ProfileDoc>) {
    const user = WebSession.getUser(session);
    return await Profile.setProfile(user, update);
  }

  // ********** DUAL PROFILE ROUTES **********

  @Router.get("/dualProfile")
  async getDualProfile(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await DualProfile.getDualProfile(user);
  }

  @Router.post("/dualProfile/update/time")
  async updateStartTime(session: WebSessionDoc, time: Date) {
    const user = WebSession.getUser(session);
    return await DualProfile.updateStartTime(user, time);
  }

  @Router.post("/dualProfile/update/scrapbook")
  async addToScrapbook(session: WebSessionDoc, caption: string, image: Image, date: Date) {
    const imageData = new Uint8Array(Object.values(JSON.parse(image.buffer)));
    const user = WebSession.getUser(session);
    return await DualProfile.addToScrapbook(user, { image: {...image, buffer: imageData }, caption, date });
  }

  // ********** DUAL POST ROUTES **********

  @Router.post("/post")
  async proposeDualPost(session: WebSessionDoc, content: string, image: Image) {
    const imageData = new Uint8Array(Object.values(JSON.parse(image.buffer)));
    const user = WebSession.getUser(session);
    let exclusiveFriend;
    try {
      exclusiveFriend = await ExclusiveFriend.getExclusiveFriend(user);
    } catch (e) {
      return { msg: "You must have an exclusive friend to propose a dual post." };
    }
    return await DualPost.propose(user, exclusiveFriend, content, { buffer: imageData, mimeType: image.mimeType });
  }

  @Router.get("/post/personal")
  async getPersonalDualPosts(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    try {
      await ExclusiveFriend.getExclusiveFriend(user);
      return await DualPost.getDualPostsFromAuthor(user);
    } catch (e) {
      return { msg: "You must have an exclusive friend to have dual posts" };
    }
  }

  @Router.put("/post/update/:_id")
  async modifyDualPost(session: WebSessionDoc, _id: ObjectId, content: string, image: Image) {
    const imageData = new Uint8Array(Object.values(JSON.parse(image.buffer)));
    const user = WebSession.getUser(session);
    return await DualPost.modify(_id, user, { content, buffer: imageData, mimeType: image.mimeType });
  }

  @Router.get("/post/:num")
  async getAllDualPosts(session: WebSessionDoc, num: string) {
    WebSession.isLoggedIn(session);
    return await DualPost.getAllDualPosts(parseInt(num));
  }

  @Router.put("/post/approve/:_id")
  async approveDualPost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return await DualPost.approve(_id, user);
  }

  @Router.delete("/post/deny/:_id")
  async denyDualPost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return await DualPost.deny(_id, user);
  }

  @Router.delete("/post/delete/:_id")
  async deleteDualPost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    return await DualPost.delete([_id], user);
  }

  // ********** EXCLUSIVE FRIEND ROUTES **********

  @Router.get("/exclusiveFriend")
  async getExclusiveFriend(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await ExclusiveFriend.getExclusiveFriend(user);
  }

  @Router.post("/exclusiveFriend/request/:to")
  async requestExclusiveFriend(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    await ExclusiveFriend.request(user, toId);
    try {
      if (await ExclusiveFriend.getExclusiveFriend(user)) {
        // request was reciprocated
        await DualProfile.createDualProfile(user, toId, new Date());
      }
    } catch (e) {}

    return { msg: "Successfully sent request" };
  }

  @Router.delete("/exclusiveFriend/request/remove")
  async removeExclusiveFriendRequest(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await ExclusiveFriend.removeRequest(user);
  }

  @Router.delete("/exclusiveFriend/remove")
  async removeExclusiveFriend(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    const { posts } = await DualPost.getDualPostsFromAuthor(user);
    await DualPost.delete(posts.map((post) => post._id), user);
    await DualProfile.deleteDualProfile(user);
    return await ExclusiveFriend.removeExclusiveFriend(user);
  }

  // ********** CONVERSATION PROMPT ROUTES **********

  @Router.get("/prompt")
  async getConversationPrompt(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await ConversationPrompt.getPrompt(user);
  }

  // ********** EXISTING ROUTES **********

  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, name: string, username: string, password: string) {
    WebSession.isLoggedOut(session);
    const { msg, user } = await User.create(username, password);
    if (user === null) {
      return { msg: "Unable to create user" };
    }
    await Profile.setProfile(user._id, { name });
    return { msg };
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    Profile.deleteProfile(user);
    try { await ExclusiveFriend.removeExclusiveFriend(user) } catch (e) {};
    const { posts } = await DualPost.getDualPostsFromAuthor(user);
    await DualPost.delete(posts.map((post) => post._id), user);
    await DualProfile.deleteDualProfile(user);
    await ConversationPrompt.deleteCache(user);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    await ConversationPrompt.deleteCache(user);
    WebSession.end(session);
    return { msg: "Logged out!" };
  }
}

export default getExpressRouter(new Routes());
