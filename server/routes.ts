import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { ConversationPrompt, DualPost, DualProfile, ExclusiveFriend, Profile, User, WebSession } from "./app";
import { ProfileDoc } from "./concepts/profile";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";

class Routes {

  // ********** SESSION ROUTES **********

  @Router.put("/signOut")
  async signOut(session: WebSessionDoc) {
    // signs the user out of the app
  }

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

  @Router.put("/dualProfile/update/time")
  async updateStartTime(session: WebSessionDoc, time: Date) {
    const user = WebSession.getUser(session);
    return await DualProfile.updateStartTime(user, time);
  }

  @Router.put("/dualProfile/update/scrapbook")
  async updateScrapbook(session: WebSessionDoc, scrapbook: { caption: string, image: string, date: Date }[]) {
    const user = WebSession.getUser(session);
    return await DualProfile.updateScrapbook(user, scrapbook);
  }

  // ********** DUAL POST ROUTES **********

  @Router.post("/post")
  async proposeDualPost(session: WebSessionDoc, content: string, image: string) {
    const user = WebSession.getUser(session);
    try {
      const exclusiveFriend = await ExclusiveFriend.getExclusiveFriend(user);
      return await DualPost.propose(user, exclusiveFriend, content, image);
    } catch (e) {
      return { msg: "You must have an exclusive friend to propose a dual post." };
    }
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
  async modifyDualPost(session: WebSessionDoc, _id: ObjectId, content: string, image: string) {
    const user = WebSession.getUser(session);
    return await DualPost.modify(_id, user, { content, image });
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
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  // @Router.get("/posts")
  // async getPosts(author?: string) {
  //   let posts;
  //   if (author) {
  //     const id = (await User.getUserByUsername(author))._id;
  //     posts = await Post.getByAuthor(id);
  //   } else {
  //     posts = await Post.getPosts({});
  //   }
  //   return Responses.posts(posts);
  // }

  // @Router.post("/posts")
  // async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
  //   const user = WebSession.getUser(session);
  //   const created = await Post.create(user, content, options);
  //   return { msg: created.msg, post: await Responses.post(created.post) };
  // }

  // @Router.patch("/posts/:_id")
  // async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
  //   const user = WebSession.getUser(session);
  //   await Post.isAuthor(user, _id);
  //   return await Post.update(_id, update);
  // }

  // @Router.delete("/posts/:_id")
  // async deletePost(session: WebSessionDoc, _id: ObjectId) {
  //   const user = WebSession.getUser(session);
  //   await Post.isAuthor(user, _id);
  //   return Post.delete(_id);
  // }

  // @Router.get("/friends")
  // async getFriends(session: WebSessionDoc) {
  //   const user = WebSession.getUser(session);
  //   return await User.idsToUsernames(await Friend.getFriends(user));
  // }

  // @Router.delete("/friends/:friend")
  // async removeFriend(session: WebSessionDoc, friend: string) {
  //   const user = WebSession.getUser(session);
  //   const friendId = (await User.getUserByUsername(friend))._id;
  //   return await Friend.removeFriend(user, friendId);
  // }

  // @Router.get("/friend/requests")
  // async getRequests(session: WebSessionDoc) {
  //   const user = WebSession.getUser(session);
  //   return await Responses.friendRequests(await Friend.getRequests(user));
  // }

  // @Router.post("/friend/requests/:to")
  // async sendFriendRequest(session: WebSessionDoc, to: string) {
  //   const user = WebSession.getUser(session);
  //   const toId = (await User.getUserByUsername(to))._id;
  //   return await Friend.sendRequest(user, toId);
  // }

  // @Router.delete("/friend/requests/:to")
  // async removeFriendRequest(session: WebSessionDoc, to: string) {
  //   const user = WebSession.getUser(session);
  //   const toId = (await User.getUserByUsername(to))._id;
  //   return await Friend.removeRequest(user, toId);
  // }

  // @Router.put("/friend/accept/:from")
  // async acceptFriendRequest(session: WebSessionDoc, from: string) {
  //   const user = WebSession.getUser(session);
  //   const fromId = (await User.getUserByUsername(from))._id;
  //   return await Friend.acceptRequest(fromId, user);
  // }

  // @Router.put("/friend/reject/:from")
  // async rejectFriendRequest(session: WebSessionDoc, from: string) {
  //   const user = WebSession.getUser(session);
  //   const fromId = (await User.getUserByUsername(from))._id;
  //   return await Friend.rejectRequest(fromId, user);
  // }
}

export default getExpressRouter(new Routes());
