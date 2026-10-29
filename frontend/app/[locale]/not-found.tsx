import Link from "next/link";

export default function LocaleNotFound() {
  return (
    <div className="container-x flex flex-col items-center py-24 text-center">
      <p className="text-8xl font-black gradient-text">404</p>
      <h1 className="mt-4 text-2xl font-bold">Sahypa tapylmady · Page not found · Страница не найдена</h1>
      <p className="mt-2 max-w-md text-ink-muted">Bagyşlaň, gözleýän sahypaňyzy tapyp bilmedik.</p>
      <Link href="/tm" className="mt-8 rounded-full bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">Baş sahypa</Link>
    </div>
  );
}
