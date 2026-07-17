import { useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { ChatWindow } from "./ChatWindow";

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-50 md:bottom-6 md:right-6">
          <ChatWindow onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
        className="fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-ink text-white shadow-2xl transition hover:bg-ink-2 md:bottom-6 md:right-6"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </>
  );
}
