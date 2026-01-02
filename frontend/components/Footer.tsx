import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-800 to-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* About Section */}
          <div className="flex flex-col">
            <h3 className="text-xl font-bold mb-4 text-primary-400">IH2 Volunteer Portal</h3>
            <p className="text-gray-300 mb-4">
              Inspired Hearts and Hands - Making a difference in our community since 2012.
            </p>
            <div className="text-sm text-gray-400 mt-auto">
              <p>📞 724-230-6378</p>
              <p>📧 info@inspiredheartsandhands.com</p>
            </div>
          </div>

          {/* Volunteer Portal Links */}
          <div className="flex flex-col">
            <h4 className="font-semibold mb-4 text-primary-400">Volunteer Portal</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link href="/opportunities" className="hover:text-primary-400 transition">
                  Find Opportunities
                </Link>
              </li>
              <li>
                <Link href="/volunteer-hours" className="hover:text-primary-400 transition">
                  My Volunteer Hours
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-primary-400 transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Main IH2 Website */}
          <div className="flex flex-col">
            <h4 className="font-semibold mb-4 text-primary-400">IH2 Main Website</h4>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="https://inspiredheartsandhands.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition">
                  Home
                </a>
              </li>
              <li>
                <a href="https://inspiredheartsandhands.com/our-mission" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition">
                  Our Mission
                </a>
              </li>
              <li>
                <a href="https://inspiredheartsandhands.com/shortcode-ih2-programs/" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition">
                  IH2 Programs
                </a>
              </li>
              <li>
                <a href="https://inspiredheartsandhands.com/donate" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition">
                  Donate
                </a>
              </li>
              <li>
                <a href="https://inspiredheartsandhands.com/contact" target="_blank" rel="noopener noreferrer" className="hover:text-primary-400 transition">
                  Contact IH2
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} Inspired Hearts and Hands (IH2). All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="https://inspiredheartsandhands.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400 transition text-sm">
                Visit Main Website
              </a>
              <Link href="/privacy-policy" className="text-gray-400 hover:text-primary-400 transition text-sm">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
