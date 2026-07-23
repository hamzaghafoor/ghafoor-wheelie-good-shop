// Central editable business configuration
export const business = {
  name: "Ghafoor Motors Tyres & Lubricants",
  shortName: "GMTL",
  tagline: "Tyres • Lubricants • Auto Care",
  phone: "+92 332 4443021",
  phoneDisplay: "0332-4443021",
  phoneTel: "+923324443021",
  whatsapp: "923324443021",
  email: "",
  address: {
    line1: "Shop No. 2, Plot No. 107-D, Block 2, PECHS",
    line2: "Khalid Bin Waleed Road, Karachi, Pakistan",
    city: "Karachi",
    country: "PK",
    lat: 24.8683,
    lng: 67.0709,
  },
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Ghafoor+Motors+Tyres+Lubricants+PECHS+Karachi",
  hours: [
    { day: "Monday – Saturday", time: "10:00 AM – 9:00 PM" },
    { day: "Sunday", time: "By appointment" },
  ],
  social: {
    instagram: "https://www.instagram.com/ghafoormotors/",
    facebook: "https://www.facebook.com/ghafoormotors1986/",
  },
  google: {
    rating: 4.9, // editable — verify before launch
    reviewCount: 0, // set once verified
    reviewsUrl: "https://www.google.com/search?q=Ghafoor+Motors+Tyres+Lubricants+PECHS+Karachi",
    writeReviewUrl: "https://g.page/r/CWmjhUF5GiY3EBM/review",
  },
};

export function waLink(message: string): string {
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function telLink(): string {
  return `tel:${business.phoneTel}`;
}
