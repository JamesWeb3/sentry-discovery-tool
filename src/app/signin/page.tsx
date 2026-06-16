import { Suspense } from "react";
import SignInForm from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
