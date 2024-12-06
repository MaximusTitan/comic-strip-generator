// src/components/form-message.tsx
import React from "react";

export interface Message {
  error?: string;
  success?: string;
}

interface FormMessageProps {
  message: Message;
}

export const FormMessage: React.FC<FormMessageProps> = ({ message }) => {
  return (
    <div className="mt-4">
      {message.error && (
        <div className="text-red-500 text-sm">{message.error}</div>
      )}
      {message.success && (
        <div className="text-green-500 text-sm">{message.success}</div>
      )}
    </div>
  );
};
