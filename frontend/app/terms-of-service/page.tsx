import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | IH2 Volunteer Portal",
  description: "Terms of Service for the Inspired Hearts and Hands Volunteer Portal",
};

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8 text-primary-600">Terms of Service</h1>

      <div className="prose prose-lg max-w-none space-y-6">
        <p className="text-gray-600 text-sm">
          <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By accessing and using the Inspired Hearts and Hands (IH2) Volunteer Portal, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use this platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Volunteer Account Registration</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            To participate in volunteer opportunities, you must:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Be at least 13 years of age (or have parental/guardian consent)</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Volunteer Responsibilities</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            As a volunteer, you agree to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Arrive on time for scheduled volunteer shifts</li>
            <li>Notify IH2 staff promptly if you cannot attend a registered event</li>
            <li>Follow all safety guidelines and instructions provided by IH2 staff</li>
            <li>Treat all staff, volunteers, and clients with respect and dignity</li>
            <li>Maintain confidentiality of sensitive information you may encounter</li>
            <li>Represent IH2 in a positive and professional manner</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Volunteer Waiver and Release</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            By registering for volunteer opportunities, you acknowledge and agree that:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Volunteering involves certain inherent risks</li>
            <li>You voluntarily assume all risks associated with volunteering</li>
            <li>You release and hold harmless Inspired Hearts and Hands, its directors, officers, employees, and volunteers from any liability for injuries or damages incurred while volunteering</li>
            <li>IH2 is not responsible for personal property lost, stolen, or damaged during volunteer activities</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Code of Conduct</h2>
          <p className="text-gray-700 leading-relaxed mb-3">
            Volunteers must adhere to the following code of conduct:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>No harassment, discrimination, or inappropriate behavior of any kind</li>
            <li>No use of alcohol, illegal drugs, or tobacco products while volunteering</li>
            <li>No unauthorized photography or social media posting about clients or other volunteers</li>
            <li>Appropriate dress and language at all times</li>
            <li>Compliance with all applicable laws and IH2 policies</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3">
            Violation of this code of conduct may result in immediate removal from the volunteer program.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Minors</h2>
          <p className="text-gray-700 leading-relaxed">
            Volunteers under 18 years of age must have parental or guardian consent to participate. Some volunteer opportunities may have age restrictions. Parents or guardians are responsible for ensuring their minor child complies with all terms and policies.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Volunteer Hours Tracking</h2>
          <p className="text-gray-700 leading-relaxed">
            IH2 tracks volunteer hours for record-keeping and recognition purposes. While we strive for accuracy, volunteers are responsible for verifying their own hours and reporting any discrepancies promptly. Volunteer hour records may be used for volunteer recognition, court-ordered community service verification, or school service hour requirements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Cancellation Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            If you need to cancel a volunteer registration, please do so through the portal as soon as possible. Repeated no-shows or late cancellations may result in suspension from the volunteer program. IH2 reserves the right to cancel or reschedule events due to circumstances beyond our control.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed">
            All content on this portal, including text, graphics, logos, and software, is the property of Inspired Hearts and Hands or its licensors and is protected by copyright and other intellectual property laws. You may not reproduce, distribute, or create derivative works without written permission.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">10. Privacy and Data Use</h2>
          <p className="text-gray-700 leading-relaxed">
            Your use of this portal is also governed by our Privacy Policy. We collect and use your information as described in our Privacy Policy to facilitate volunteer opportunities and maintain our programs.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">11. Termination</h2>
          <p className="text-gray-700 leading-relaxed">
            IH2 reserves the right to terminate or suspend your access to the volunteer portal at any time, with or without notice, for conduct that violates these Terms of Service, is harmful to other users, IH2, or third parties, or for any other reason at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">12. Disclaimer of Warranties</h2>
          <p className="text-gray-700 leading-relaxed">
            This portal is provided "as is" without warranties of any kind, either express or implied. IH2 does not warrant that the portal will be uninterrupted, error-free, or free of viruses or other harmful components.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">13. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            To the fullest extent permitted by law, IH2 shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the portal or volunteer services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">14. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            IH2 reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the portal. Your continued use of the portal after changes are posted constitutes acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">15. Contact Information</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have questions about these Terms of Service, please contact us:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mt-3">
            <p className="text-gray-700"><strong>Inspired Hearts and Hands (IH2)</strong></p>
            <p className="text-gray-700">20 Leonberg Road, Building E</p>
            <p className="text-gray-700">Cranberry Township, PA 16066</p>
            <p className="text-gray-700">Phone: 724-230-6378</p>
            <p className="text-gray-700">Email: info@inspiredheartsandhands.com</p>
          </div>
        </section>

        <div className="border-t pt-6 mt-8">
          <p className="text-gray-600 text-sm italic">
            By using the IH2 Volunteer Portal, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
