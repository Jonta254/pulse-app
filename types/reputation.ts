export type HistoryRecord = {
  id: number;
  title: string;
  detail: string;
  time: string;
  kind: "payment" | "profile" | "market" | "tip" | "post" | "story" | "comment" | "delete" | "reaction";
};
