import HomePage from "../page";

export const metadata = {
  title: "Urd Atlas",
  description: "Canonical responsive Urd Atlas homepage.",
};

export default function MobilePage() {
  return (
    <div className="ua-force-mobile-route">
      <HomePage />
    </div>
  );
}
