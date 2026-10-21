import Link from "next/link";
import { Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Explorer } from "@/components/features/explorer";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-16 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
          <Compass className="size-5 text-primary" />
          TraveLens
        </Link>
      </header>

      <section className="mx-auto max-w-2xl py-10 text-center sm:py-16">
        <p className="mb-3 text-xs font-medium tracking-[0.2em] text-pine uppercase">
          A visual atlas
        </p>
        <h1 className="text-4xl font-semibold sm:text-6xl">
          Where will the light take you next?
        </h1>
        <form className="mx-auto mt-8 flex max-w-md gap-2" role="search">
          <Input name="query" placeholder="Kyoto, Lofoten, Amalfi…" aria-label="Search destinations" />
          <Button type="submit">
            <Search />
            Explore
          </Button>
        </form>
      </section>

      <Explorer initialPhotos={[]} />
    </div>
  );
}
