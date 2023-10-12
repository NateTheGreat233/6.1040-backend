import ConversationPromptConcept from "./concepts/conversationPrompt";
import DualPostConcept from "./concepts/dualPost";
import DualProfileConcept from "./concepts/dualProfile";
import ExclusiveFriendConcept from "./concepts/exclusiveFriend";
import ProfileConcept from "./concepts/profile";
import UserConcept from "./concepts/user";
import VideoCallConcept from "./concepts/videoCall";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
// export const Post = new PostConcept();
// export const Friend = new FriendConcept();

export const ConversationPrompt = new ConversationPromptConcept();
export const DualPost = new DualPostConcept();
export const ExclusiveFriend = new ExclusiveFriendConcept();
export const Profile = new ProfileConcept();
export const DualProfile = new DualProfileConcept();
export const VideoCall = new VideoCallConcept();