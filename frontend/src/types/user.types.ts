export type ApiUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  createdAt: string;
};
