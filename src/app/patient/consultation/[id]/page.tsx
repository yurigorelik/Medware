"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export default function ConsultationChatPage() {
  const params = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const res = await fetch(`/api/consultation/${params.id}/messages`);
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setError("");
    setSending(true);
    const messageText = input.trim();
    setInput("");

    // Optimistic update
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: messageText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/consultation/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message");
        // Remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setInput(messageText);
        return;
      }

      const { userMessage, assistantMessage } = await res.json();

      // Replace optimistic message with real one and add AI response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMessage,
        assistantMessage,
      ]);
    } catch {
      setError("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setInput(messageText);
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/consultation/${params.id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to upload file");
        return;
      }

      // Reload messages to show the upload
      await loadMessages();
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRequestSummary() {
    if (
      !confirm(
        "Are you sure you want to end the consultation and request a case summary? " +
          "The AI will generate a summary which will be sent to the doctor for review."
      )
    ) {
      return;
    }

    setGeneratingSummary(true);
    setError("");

    try {
      const res = await fetch(`/api/consultation/${params.id}/summary`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate summary");
        return;
      }

      router.push(`/patient/consultation/${params.id}/summary`);
    } catch {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setGeneratingSummary(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="text-gray-500">Loading consultation...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/patient/dashboard")}
            className="text-gray-500 hover:text-gray-700"
          >
            &larr;
          </button>
          <div>
            <h1 className="font-semibold text-sm">AI Medical Consultation</h1>
            <p className="text-xs text-gray-500">
              {messages.length} messages
            </p>
          </div>
        </div>
        <button
          onClick={handleRequestSummary}
          className="btn-success text-sm"
          disabled={generatingSummary || messages.length < 4}
          title={
            messages.length < 4
              ? "Continue the consultation a bit longer before requesting a summary"
              : "Generate case summary"
          }
        >
          {generatingSummary ? "Generating..." : "Request Summary"}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 text-sm">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-400 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "USER" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "USER"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`text-xs mt-1 ${
                  msg.role === "USER" ? "text-primary-200" : "text-gray-400"
                }`}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="text-sm text-gray-500">
                AI is thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-4 py-3">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg flex-shrink-0"
            disabled={uploading}
            title="Upload file"
          >
            {uploading ? (
              <span className="text-xs">...</span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            )}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            className="flex-1 input-field resize-none max-h-32"
            rows={1}
            placeholder="Type your message... (Shift+Enter for new line)"
            disabled={sending}
          />
          <button
            type="submit"
            className="btn-primary flex-shrink-0"
            disabled={sending || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
