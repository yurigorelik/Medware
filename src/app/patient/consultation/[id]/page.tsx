"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { LoadingScreen } from "@/components/ui/States";

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
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Auto-focus the textarea on mount and after sending
  const focusInput = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, []);

  useEffect(() => {
    loadMessages();
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input after loading completes
  useEffect(() => {
    if (!loading) {
      focusInput();
    }
  }, [loading, focusInput]);

  // Close attach menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setInput(messageText);
        return;
      }

      const responseData = await res.json();
      const { userMessage, assistantMessage } = responseData;

      // Replace optimistic message with real one and add AI response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMessage,
        assistantMessage,
      ]);

      // Check if AI indicates information gathering is complete
      if (responseData.readyForSummary) {
        handleAutoSummary();
      }
    } catch {
      setError("Failed to send message. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setInput(messageText);
    } finally {
      setSending(false);
      focusInput();
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setAttachMenuOpen(false);

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

      await loadMessages();
    } catch {
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      focusInput();
    }
  }

  async function handleLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    setLinkModalOpen(false);
    setAttachMenuOpen(false);
    setSending(true);
    setError("");

    const messageText = `[Shared link: ${linkUrl.trim()}]`;
    setLinkUrl("");

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
        setError(data.error || "Failed to send link");
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        return;
      }

      const responseData = await res.json();
      const { userMessage, assistantMessage } = responseData;

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMessage,
        assistantMessage,
      ]);

      if (responseData.readyForSummary) {
        handleAutoSummary();
      }
    } catch {
      setError("Failed to send link. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
      focusInput();
    }
  }

  async function handleAutoSummary() {
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

  async function handleRequestSummary() {
    handleAutoSummary();
  }

  if (loading) {
    return (
      <LoadingScreen label="Loading consultation" />
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
          {generatingSummary ? "Generating Summary..." : "Request Summary"}
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

      {/* Generating Summary Banner */}
      {generatingSummary && (
        <div className="bg-blue-50 text-blue-700 px-4 py-3 text-sm flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating your case summary. This may take a moment...
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

      {/* Link Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-semibold mb-3">Share a Link</h3>
            <p className="text-sm text-gray-500 mb-4">
              Paste a URL to share with the AI assistant (e.g., medical records, lab results, articles).
            </p>
            <form onSubmit={handleLinkSubmit}>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="input-field mb-4"
                autoFocus
                required
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setLinkModalOpen(false); setLinkUrl(""); }}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm"
                  disabled={!linkUrl.trim()}
                >
                  Send Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

          {/* Attach Menu */}
          <div className="relative flex-shrink-0" ref={attachMenuRef}>
            <button
              type="button"
              onClick={() => setAttachMenuOpen(!attachMenuOpen)}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
              disabled={uploading}
              title="Attach"
            >
              {uploading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
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

            {attachMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setAttachMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload File
                  <span className="text-xs text-gray-400 ml-auto">IMG, PDF, DOC</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkModalOpen(true);
                    setAttachMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Provide a Link
                  <span className="text-xs text-gray-400 ml-auto">URL</span>
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
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
