import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <h3 className="font-semibold text-white mb-3">IH2 Volunteer Portal</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Inspired Hearts and Hands — making a difference in our community since 2012.
            </p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>724-230-6378</p>
              <p>info@inspiredheartsandhands.com</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">Volunteer Portal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/opportunities" className="hover:text-white transition-colors">Find Opportunities</Link></li>
              <li><Link href="/volunteer-hours" className="hover:text-white transition-colors">My Volunteer Hours</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">IH2 Main Website</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="https://inspiredheartsandhands.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="https://inspiredheartsandhands.com/our-mission" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Our Mission</a></li>
              <li><a href="https://inspiredheartsandhands.com/shortcode-ih2-programs/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">IH2 Programs</a></li>
              <li><a href="https://inspiredheartsandhands.com/donate" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Donate</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} Inspired Hearts and Hands (IH2). All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="https://inspiredheartsandhands.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Main Website</a>
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
