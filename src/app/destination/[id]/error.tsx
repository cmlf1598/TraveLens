"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DestinationError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">No se pudo cargar este destino</h1>
      <p className="text-muted-foreground">El servicio de imágenes no respondió. Vuelve a intentarlo en unos segundos.</p>
      <div className="flex gap-2">
        <Button onClick={() => retry()}>Reintentar</Button>
        <Button variant="outline" asChild>
          <Link href="/">Explorar destinos</Link>
        </Button>
      </div>
    </main>
  );
}
