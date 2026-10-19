
import "./globals.css";

export const metadata = {
  title: "CabGo | Ride Booking",
  description: "Book your ride with CabGo.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
