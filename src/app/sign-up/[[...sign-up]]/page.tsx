import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <div className="w-full max-w-md">
        <Image
          src="/brand/approved/lob-dark-lockup-approved.png"
          alt="LOB Lumber One Board"
          width={420}
          height={260}
          className="mb-5 rounded-lg"
          priority
        />
        <SignUp />
      </div>
    </main>
  );
}

