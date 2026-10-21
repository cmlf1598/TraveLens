import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/features/site-header";

export default function DestinationNotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Este destino no existe</h1>
        <p className="text-muted-foreground">
          La foto pudo haberse eliminado de Unsplash o el enlace está incompleto.
        </p>
        <Button asChild>
          <Link href="/">Explorar destinos</Link>
        </Button>
      </main>
    </>
  );
}
