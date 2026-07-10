import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPKR } from "@/lib/products";
import { useEffect } from "react";

export function CartDrawer() {
  const { open, setOpen, detailed, subtotal, setQty, remove, count } = useCart();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/70 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <h3 className="font-display text-xl tracking-wide">Your Cart</h3>
            <span className="text-sm text-muted-foreground">({count})</span>
          </div>
          <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-surface-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {detailed.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {detailed.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-lg border border-border/60 bg-background p-3">
                  <img src={i.product.image} alt={i.product.name} className="h-20 w-20 rounded object-cover" loading="lazy" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">{i.product.brand}</div>
                        <div className="font-medium leading-tight">{i.product.name}</div>
                        {i.product.size && <div className="text-xs text-muted-foreground">{i.product.size}</div>}
                      </div>
                      <button onClick={() => remove(i.id)} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-md border border-border">
                        <button onClick={() => setQty(i.id, i.qty - 1)} className="grid h-8 w-8 place-items-center hover:bg-surface-2"><Minus className="h-3.5 w-3.5" /></button>
                        <span className="w-8 text-center text-sm">{i.qty}</span>
                        <button onClick={() => setQty(i.id, i.qty + 1)} className="grid h-8 w-8 place-items-center hover:bg-surface-2"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="font-display text-lg text-primary">{formatPKR(i.qty * i.product.price)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border/60 bg-background px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-display text-2xl">{formatPKR(subtotal)}</span>
          </div>
          <button
            disabled={detailed.length === 0}
            className="w-full rounded-md bg-primary py-3 font-display text-lg tracking-wide text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
            onClick={() => alert("Checkout coming soon. Call +92 300 1234567 to complete your order.")}
          >
            Checkout
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Free delivery within Lahore on orders over PKR 20,000</p>
        </div>
      </aside>
    </>
  );
}
