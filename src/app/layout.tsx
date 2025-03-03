import { Provider } from "@/components/ui/provider";
import "@/styles/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Bondhub</title>
        <link rel="icon" href="/bondhub.png" />
      </head>
      <body>
        <Provider>
          <main className="min-h-screen">{children}</main>
        </Provider>
        {/* <main className="min-h-screen">{children}</main> */}
      </body>
    </html>
  );
}
