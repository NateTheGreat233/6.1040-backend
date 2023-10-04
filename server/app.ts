import ConversationPromptConcept from "./concepts/conversationPrompt";
import DualPostConcept from "./concepts/dualPost";
import ExclusiveFriendConcept from "./concepts/exclusiveFriend";
import FriendConcept from "./concepts/friend";
import PostConcept from "./concepts/post";
import ProfileConcept from "./concepts/profile";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();

export const ConversationPrompt = new ConversationPromptConcept();
export const DualPost = new DualPostConcept();
export const ExclusiveFriend = new ExclusiveFriendConcept();
export const Profile = new ProfileConcept();