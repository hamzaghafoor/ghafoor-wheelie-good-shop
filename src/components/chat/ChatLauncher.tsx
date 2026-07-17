import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

export function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[min(380px,calc(100vw-2rem))] md:bottom-24 md:right-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <ChatWindow onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat with Ghafoor Motors assistant"}
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-lg transition hover:brightness-110 md:bottom-6 md:right-6 md:h-14 md:w-14"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </>
  );
}
