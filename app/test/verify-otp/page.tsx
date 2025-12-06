"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export default function VerifyCodeBox() {
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    const handleChange = (index: number, value: string) => {
        if (/^[0-9]?$/.test(value)) {
            const newCode = [...code];
            newCode[index] = value;
            setCode(newCode);

            // Move forward if digit added
            if (value && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            if (code[index] !== "") {
                const newCode = [...code];
                newCode[index] = "";
                setCode(newCode);
            } else if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    return (
        <div className="flex justify-center w-full ">
            <div className="flex flex-col items-center justify-center text-center gap-6 p-6">
                <Image src="/OTPverification1.svg" width={200} height={200} alt="Verify Illustration" priority />

                <div>
                    <h2 className="text-2xl font-semibold">Verify Code</h2>
                    <p className="text-gray-500 text-sm mt-1">Enter the 6-digit code sent to your email</p>
                </div>

                <div className="flex gap-3">
                    {code.map((digit, i) => (
                        <input
                            key={i}
                            ref={el => {
                                inputRefs.current[i] = el;
                            }}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={e => handleChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            inputMode="numeric"
                            className="w-12 h-12 sm:w-14 sm:h-14 border border-gray-300 rounded-lg text-center text-xl font-bold focus:outline-none focus:border-black"
                        />
                    ))}
                </div>

                <button className="w-full bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition">
                    Continue
                </button>

                <p className="text-xs text-gray-500">
                    Didn’t receive a code? <button className="text-black font-medium">Resend</button>
                </p>
            </div>
        </div>
    );
}
