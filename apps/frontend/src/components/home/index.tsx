"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/shared/Header";
import DragOverlay from "@/components/shared/DragOverlay";
import { TransferFile } from "@/types/types";
import { useTransferStore } from "@/store/store";
import { useSendFile } from "@/hooks/useSendFile";
import DropScreen from "./DropScreen";
import StagedScreen from "./StagedScreen";
import SendingScreen from "./SendingScreen";

function toTransferFile(f: File): TransferFile {
  return {
    id: `${f.name}-${f.size}-${f.lastModified}`,
    name: f.name,
    bytes: f.size,
    kind: (f.type || "file").split("/")[0],
  };
}

function firstFileFromFileList(list: FileList | null): File | null {
  return list?.[0] ?? null;
}

function isFileDrag(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes("Files");
}

function firstFileFromDataTransfer(dt: DataTransfer): File | null {
  const items = Array.from(dt.items ?? []);
  if (!items.length) {
    return dt.files[0] ?? null;
  }

  const first = items
    .filter((item) => {
      if (item.kind !== "file") return false;
      const entry = item.webkitGetAsEntry?.();
      return !entry || entry.isFile;
    })
    .map((item) => item.getAsFile())
    .find((f): f is File => f !== null);

  return first ?? null;
}

export default function Home() {
  const screen = useTransferStore((s) => s.screen);
  const addFiles = useTransferStore((s) => s.addFiles);
  const setScreen = useTransferStore((s) => s.setScreen);
  const reset = useTransferStore((s) => s.reset);
  const pass = useTransferStore((s) => s.pass);

  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const { roomId, roomLink, status, progress, createRoom, handleFileSelect } =
    useSendFile(screen !== "drop");

  useEffect(() => {
    if (screen !== "drop" && screen !== "staged" && screen !== "sending") {
      reset("drop");
    }
  }, []);

  const pickFiles = () => fileInputRef.current?.click();

  const stageFile = (file: File | null) => {
    if (!file) return;
    pendingFileRef.current = file;
    addFiles([toTransferFile(file)]);
    setScreen("staged");
  };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    stageFile(firstFileFromFileList(e.target.files));
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (screen === "drop" && isFileDrag(e)) setDrag(true);
  };

  const onDragLeave = () => setDrag(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (screen !== "drop") return;
    stageFile(firstFileFromDataTransfer(e.dataTransfer));
  };

  const onOpenChannel = () => {
    handleFileSelect(pendingFileRef.current);
    createRoom(pass);
    setScreen("sending");
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative flex min-h-screen flex-col bg-background text-foreground"
    >
      <Header />

      <main className="mx-auto flex w-full max-w-310 flex-1 flex-col px-6 pb-10 sm:px-10 sm:pb-16">
        {screen === "drop" && <DropScreen onPickFiles={pickFiles} />}
        {screen === "staged" && <StagedScreen onOpenChannel={onOpenChannel} />}
        {screen === "sending" && (
          <SendingScreen
            roomId={roomId}
            roomLink={roomLink}
            status={status}
            progress={progress}
          />
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={onFiles}
          className="hidden"
        />
      </main>

      {screen === "drop" && drag && <DragOverlay />}
    </div>
  );
}
