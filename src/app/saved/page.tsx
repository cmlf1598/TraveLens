import type { Metadata } from "next";
import { BackButton } from "@/components/features/back-button";
import { SavedPhotos } from "@/components/features/saved-photos";
import { SiteHeader } from "@/components/features/site-header";

export const metadata: Metadata = {
  title: "Guardados · TraveLens",
};

/** Saved places. The list lives in the browser's localStorage, so the server prerenders only the shell. */
export default function SavedPage() {
  return (
    <>
      <SiteHeader leading={<BackButton />} />
      <main className="mx-auto w-full max-w-[1800px] flex-1 px-3 pt-6 pb-16 sm:px-6">
        <SavedPhotos />
      </main>
    </>
  );
}
