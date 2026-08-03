import HomePage from "../page";

export const metadata = {
  title: "Urd Atlas Mobile Preview",
  description: "Mobile-first preview of the Urd Atlas homepage.",
};

export default function MobilePage() {
  return (
    <div className="ua-force-mobile-route">
      <HomePage />
    </div>
  );
}
