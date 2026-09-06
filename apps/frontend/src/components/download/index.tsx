"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/shared/Header";
import { useReceiveFile } from "@/hooks/useReceiveFile";
import ClaimScreen from "./ClaimScreen";
import ReceivingScreen from "./ReceivingScreen";
import ConnectionFailed from "./ConnectionFailed";

export default function Download() {
  const params = useParams<{ roomId: string }>();
  const roomId = Array.isArray(params.roomId)
    ? params.roomId[0]
    : params.roomId;

  const {
    status,
    fileMetadata,
    downloadUrl,
    progress,
    retry,
    passphraseError,
    submitPassphrase,
  } = useReceiveFile(roomId);
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Header />

      <main className="mx-auto flex w-full max-w-310 flex-1 flex-col px-6 pb-36 sm:px-10 sm:pb-28">
        {status === "error" ? (
          <ConnectionFailed message="The link may be wrong, expired, or the sender has closed the tab." />
        ) : status === "failed" ? (
          <ConnectionFailed
            message="The connection was lost. The sender may still be there. Try again."
            onRetry={retry}
          />
        ) : !accepted ? (
          <ClaimScreen
            fileMetadata={fileMetadata}
            needsPassphrase={status === "passphrase"}
            passphraseError={passphraseError}
            onSubmitPassphrase={submitPassphrase}
            onAccept={() => setAccepted(true)}
          />
        ) : (
          <ReceivingScreen
            fileMetadata={fileMetadata}
            downloadUrl={downloadUrl}
            status={status}
            progress={progress}
          />
        )}
      </main>
    </div>
  );
}
