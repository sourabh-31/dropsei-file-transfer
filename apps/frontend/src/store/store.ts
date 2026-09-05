import { create } from "zustand";
import { ScreenState, TransferFile } from "@/types/types";

interface TransferState {
  screen: ScreenState;
  files: TransferFile[];
  pass: string;
  copied: "code" | "link" | null;
}

interface TransferActions {
  setScreen: (screen: ScreenState) => void;
  addFiles: (files: TransferFile[]) => void;
  removeFile: (id: string) => void;
  setPass: (pass: string) => void;
  setCopied: (copied: "code" | "link" | null) => void;
  reset: (screen?: ScreenState) => void;
}

const initialState: TransferState = {
  screen: "drop",
  files: [],
  pass: "",
  copied: null,
};

export const useTransferStore = create<TransferState & TransferActions>(
  (set) => ({
    ...initialState,

    setScreen: (screen) => set({ screen }),

    addFiles: (files) =>
      set((state) => ({ files: [...state.files, ...files] })),

    removeFile: (id) =>
      set((state) => {
        const files = state.files.filter((f) => f.id !== id);
        return { files, screen: files.length ? state.screen : "drop" };
      }),

    setPass: (pass) => set({ pass }),

    setCopied: (copied) => set({ copied }),

    reset: (screen = "drop") => set({ ...initialState, screen }),
  }),
);
