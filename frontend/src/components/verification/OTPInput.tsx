import React, { useRef, useEffect, useState } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  length?: number;
}

const OTPInput: React.FC<OTPInputProps> = ({ value, onChange, error, length = 6 }) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otp, setOtp] = useState<string[]>(value.padEnd(length, '').split('').slice(0, length));

  // Sync internal state with value prop
  useEffect(() => {
    setOtp(value.padEnd(length, '').split('').slice(0, length));
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    // Only allow digits
    if (val && !/^\d$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Call onChange with full code
    const code = newOtp.join('');
    onChange(code);

    // Auto-focus next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);

    const newOtp = pasteData.padEnd(length, '').split('').slice(0, length);
    setOtp(newOtp);
    onChange(pasteData);

    // Focus last filled input
    const lastIndex = Math.min(pasteData.length, length - 1);
    inputRefs.current[lastIndex]?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 justify-center">
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={otp[index] || ''}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-12 h-12 text-center text-2xl border-2 rounded-md focus:border-primary-500 focus:outline-none"
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default OTPInput;
