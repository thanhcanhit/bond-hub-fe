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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <title>Bondhub</title>
        <link rel="icon" href="/bondhub.png" />
      </head>
      <body>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
