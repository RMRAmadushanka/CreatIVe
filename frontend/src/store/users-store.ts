import { create } from "zustand";
import { persist } from "zustand/middleware";

import { idbStorage } from "@/store/idb";

export type PlatformUser = { id: string; name: string; email: string; role: "admin" | "user" };

const seedUsers = (): PlatformUser[] => [
  { id: "u_1", name: "Admin Root", email: "admin@platform.io", role: "admin" },
  { id: "u_2", name: "Jane Cooper", email: "jane@northwind.shop", role: "user" },
  { id: "u_3", name: "Wade Warren", email: "wade@example.com", role: "user" },
  { id: "u_4", name: "Esther Howard", email: "esther@example.com", role: "user" },
  { id: "u_5", name: "Cameron W.", email: "cam@studio.dev", role: "admin" },
];

type UsersState = {
  users: PlatformUser[];
  setRole: (id: string, role: "admin" | "user") => void;
};

export const useUsersStore = create<UsersState>()(
  persist(
    (set) => ({
      users: seedUsers(),
      setRole: (id, role) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, role } : u)),
        })),
    }),
    {
      name: "cms.users",
      storage: idbStorage,
      skipHydration: true,
      partialize: (state) => ({ users: state.users }),
    },
  ),
);

export const usersStore = {
  getAll: () => useUsersStore.getState().users,
  setRole: (id: string, role: "admin" | "user") => useUsersStore.getState().setRole(id, role),
};

export function usePlatformUsers() {
  return useUsersStore((s) => s.users);
}
