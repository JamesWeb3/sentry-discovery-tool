"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (value: string) => {
    setLoading(true);
    setError(false);
    const res = await signIn("credentials", { code: value, redirect: false });
    if (res?.error) {
      setError(true);
      setCode("");
      setLoading(false);
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm flex flex-col items-center text-center">
      <Image
        src="/sentry-logo.png"
        alt="Sentry AI"
        width={44}
        height={44}
        className="rounded-xl"
      />
      <h1 className="text-2xl font-semibold mt-5">Enter your access code</h1>
      <p className="text-white/50 text-sm mt-2">
        This audit is private. Enter the 6-digit code to continue.
      </p>

      <div className="mt-8">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => {
            setCode(value);
            if (error) setError(false);
          }}
          onComplete={submit}
          disabled={loading}
          autoFocus
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="h-5 mt-3">
        {error && (
          <p className="text-sm text-red-400">That code isn&apos;t right. Try again.</p>
        )}
        {loading && !error && <p className="text-sm text-white/40">Checking…</p>}
      </div>

      <button
        type="button"
        disabled={code.length < 6 || loading}
        onClick={() => submit(code)}
        className="mt-3 w-full px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-white/90 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
      >
        Unlock
      </button>
    </div>
  );
}
