export type VerifiedHuman = {
  wallet: string;
  username: string;
  profilePictureUrl?: string;
  mode: "world" | "preview";
  lastSeenAt: string;
};
