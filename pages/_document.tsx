import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <meta name="description" content="Ứng dụng học từ vựng tiếng Anh thông minh" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
