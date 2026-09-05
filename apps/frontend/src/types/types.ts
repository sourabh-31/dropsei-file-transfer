export type ScreenState = "drop" | "staged" | "sending";

export interface TransferFile {
  id: string;
  name: string;
  bytes: number;
  kind: string;
}
