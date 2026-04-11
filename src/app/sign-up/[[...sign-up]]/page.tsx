import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md">
        <Image
          src="/brand/final/lob-horizontal-final.svg"
          alt="Lumber One Board"
          width={600}
          height={130}
          className="mb-6 h-auto w-full max-w-md"
          priority
        />
        <SignUp />
      </div>
    </main>
  );
}

