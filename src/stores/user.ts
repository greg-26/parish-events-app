import { defineStore } from "pinia";
import {
  fetchAuthSession,
  getCurrentUser,
  fetchUserAttributes,
  signOut as amplifySignOut,
  updateUserAttributes,
} from "aws-amplify/auth";

interface UserAttributes {
  nickname?: string;
  email?: string;
}

interface User {
  username?: string;
  userId?: string;
  attributes?: UserAttributes;
}

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    username: (state) => state.user?.username || "",
    userId: (state) => state.user?.userId || "",
    nickname: (state) => state.user?.attributes?.nickname || "",
    email: (state) => state.user?.attributes?.email || "",
  },
  actions: {
    async fetchUser() {
      try {
        await fetchAuthSession();
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        this.user = { username: user.username, userId: user.userId, attributes };
      } catch {
        this.user = null;
      }
    },
    async signOut() {
      await amplifySignOut();
      this.user = null;
    },
    async updateNickname(nickname: string) {
      await updateUserAttributes({
        userAttributes: { nickname },
      });
      await this.fetchUser();
    },
    //TODO: implement updateEmail and handle email re-verification with (it seems) `verifyUserAttributeSubmit and some UI for users to add the code sent to their new email.
  },
});
