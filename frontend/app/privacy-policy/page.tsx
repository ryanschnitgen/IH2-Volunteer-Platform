export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-12 relative overflow-hidden bg-white"
        style={{
          backgroundImage: `url('/handprint.png')`,
          backgroundPosition: 'center',
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x'
        }}
      >
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-6xl font-bold mb-4 text-gray-900" style={{ textShadow: '3px 3px 6px rgba(255,255,255,0.9), -2px -2px 4px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.8)' }}>
            Privacy Policy
          </h1>
          <p className="text-2xl font-semibold text-gray-800" style={{ textShadow: '2px 2px 4px rgba(255,255,255,0.9), -1px -1px 2px rgba(255,255,255,0.9)' }}>
            Inspired Hearts and Hands Volunteer Portal
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 space-y-8">
          <div>
            <p className="text-gray-600 mb-4">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-gray-700 leading-relaxed">
              Inspired Hearts and Hands ("IH2", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our volunteer portal.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <div className="space-y-4 text-gray-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Personal Information</h3>
                <p className="leading-relaxed">
                  When you register as a volunteer, we may collect:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Name, email address, and phone number</li>
                  <li>Mailing address</li>
                  <li>Date of birth</li>
                  <li>Volunteer preferences and skills</li>
                  <li>Emergency contact information</li>
                  <li>Volunteer hours and activity records</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Automatically Collected Information</h3>
                <p className="leading-relaxed">
                  When you access our portal, we may automatically collect:
                </p>
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>Device information and IP address</li>
                  <li>Browser type and version</li>
                  <li>Usage data and access times</li>
                  <li>Pages visited and actions taken</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <div className="space-y-2 text-gray-700">
              <p className="leading-relaxed">We use your information to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Create and manage your volunteer account</li>
                <li>Process your volunteer event registrations</li>
                <li>Track and record your volunteer hours</li>
                <li>Send you important notifications about events and volunteer opportunities</li>
                <li>Communicate with you regarding your volunteer activities</li>
                <li>Generate volunteer hour reports for your records</li>
                <li>Improve our volunteer portal and services</li>
                <li>Comply with legal obligations and protect our rights</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing and Disclosure</h2>
            <div className="space-y-3 text-gray-700">
              <p className="leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>With Your Consent:</strong> When you authorize us to share your information</li>
                <li><strong>Service Providers:</strong> With trusted third-party service providers who assist us in operating our portal (e.g., email services, hosting providers)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Event Coordinators:</strong> Basic contact information may be shared with event coordinators for volunteer coordination purposes</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-700">
              <li>Secure data encryption (SSL/TLS)</li>
              <li>Secure authentication via Firebase</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication requirements</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights and Choices</h2>
            <div className="space-y-2 text-gray-700">
              <p className="leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Update or correct your information through your profile settings</li>
                <li><strong>Deletion:</strong> Request deletion of your account and personal information</li>
                <li><strong>Opt-Out:</strong> Unsubscribe from non-essential email communications</li>
                <li><strong>Data Portability:</strong> Request a copy of your volunteer hours and activity records</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                To exercise these rights, please contact us at <a href="mailto:info@inspiredheartsandhands.com" className="text-primary-600 hover:underline">info@inspiredheartsandhands.com</a> or call 724-230-6378.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed">
              Our portal uses cookies and similar tracking technologies to enhance your experience, maintain your session, and analyze usage patterns. You can control cookies through your browser settings, but disabling cookies may limit some functionality.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our volunteer portal is intended for users 13 years of age and older. If you are under 18, you must have parental or guardian consent to register and volunteer. We do not knowingly collect information from children under 13 without parental consent.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you with services, comply with legal obligations, resolve disputes, and enforce our agreements. Volunteer hour records are retained indefinitely for historical record-keeping purposes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the portal after changes are posted constitutes your acceptance of the updated Privacy Policy.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
            <div className="text-gray-700 space-y-2">
              <p className="leading-relaxed">
                If you have any questions or concerns about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p><strong>Inspired Hearts and Hands (IH2)</strong></p>
                <p>20 Leonberg Road, Building E<br />Cranberry Township, PA 16066</p>
                <p>Phone: <a href="tel:7242306378" className="text-primary-600 hover:underline">724-230-6378</a></p>
                <p>Email: <a href="mailto:info@inspiredheartsandhands.com" className="text-primary-600 hover:underline">info@inspiredheartsandhands.com</a></p>
                <p>Website: <a href="https://inspiredheartsandhands.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">inspiredheartsandhands.com</a></p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <p className="text-sm text-gray-600 italic">
              Thank you for being a valued volunteer with Inspired Hearts and Hands. Your privacy and trust are important to us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
