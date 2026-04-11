export default function Terms() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-gray-400 mt-2">Effective Date: April 11, 2026 · Platform: myaurahealth.vercel.app</p>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">I. Acceptance of Terms</h2>
            <p>By accessing or using AuraHealth (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">II. Medical Disclaimer</h2>
            <p>AuraHealth is not a medical provider. The Platform provides tools for tracking fitness and wellness metrics for informational purposes only. The content is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">III. Eligibility & Account Security</h2>
            <p>You must be at least 13 years of age to use this Platform. You are responsible for maintaining the confidentiality of your account credentials. AuraHealth utilizes Supabase for authentication; however, you are responsible for all activities that occur under your account.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">IV. Acceptable Use</h2>
            <p>When using the social features of AuraHealth, you agree not to post content that is illegal, defamatory, or harassing, attempt to manipulate fitness leaderboards, or interfere with the security or performance of the Platform. We reserve the right to terminate your access for violations of these guidelines.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">V. Intellectual Property</h2>
            <p>The AuraHealth brand, logo, and original source code are the intellectual property of the Platform founder. You may not reproduce or distribute our intellectual property without express written permission.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">VI. Limitation of Liability</h2>
            <p>AuraHealth is provided on an "as-is" and "as-available" basis. We make no warranties regarding the accuracy of data or 100% uptime. To the maximum extent permitted by law, AuraHealth and its creator shall not be liable for any indirect or consequential damages.</p>
          </section>
        </div>
      </div>
    </main>
  )
}